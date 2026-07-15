// Closed Beta audit — FASE 1.1: Socket.IO's 'join_conversation'/'typing' handlers
// (server/src/index.ts) used to join/broadcast to `conversation:<id>` rooms with NO
// membership check at all — any authenticated socket that knew/guessed a conversationId
// could join it and receive (or spoof) 'typing' events for a conversation it doesn't
// belong to. Both handlers now gate on resolveConversationMembership before doing
// anything, exactly mirroring how roomAuthorizationService.resolveRoomMembership already
// guards Private Room's room:join/typing:start (see roomAuthorizationService.test.ts for
// the sibling suite this one follows the same pattern as).
//
// This suite proves the concrete scenario from the audit brief with three real users:
// A and B are matched (and therefore share a Conversation); C is a fully unrelated,
// unmatched user. C must never resolve as a member of A and B's conversation.
import { resolveConversationMembership } from '../src/lib/conversationAuthorizationService'
import { removeMember } from '../src/lib/profileMembershipService'
import { createTestUser, createTestProfile, createTestMatch, prisma } from './helpers'

describe('ConversationAuthorizationService', () => {
  it('user A (profileOne) resolves as a member of the A<->B conversation', async () => {
    const userA = await createTestUser({ email: 'conv-a1@test.com' })
    const userB = await createTestUser({ email: 'conv-b1@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const { conversation } = await createTestMatch(profileA, profileB)

    const result = await resolveConversationMembership(conversation!.id, userA.id)
    expect(result.ok).toBe(true)
  })

  it('user B (profileTwo) resolves as a member of the A<->B conversation', async () => {
    const userA = await createTestUser({ email: 'conv-a2@test.com' })
    const userB = await createTestUser({ email: 'conv-b2@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const { conversation } = await createTestMatch(profileA, profileB)

    const result = await resolveConversationMembership(conversation!.id, userB.id)
    expect(result.ok).toBe(true)
  })

  // The scenario the audit explicitly asked for: A and B are matched and chatting;
  // C is a real, authenticated, unrelated user (their own profile, no match with
  // either A or B). C must never be able to join or overhear this conversation.
  it('user C, unrelated to the match, is never a member of A<->B conversation', async () => {
    const userA = await createTestUser({ email: 'conv-a3@test.com' })
    const userB = await createTestUser({ email: 'conv-b3@test.com' })
    const userC = await createTestUser({ email: 'conv-c3@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    await createTestProfile(userC.id) // C has their own unrelated profile
    const { conversation } = await createTestMatch(profileA, profileB)

    const result = await resolveConversationMembership(conversation!.id, userC.id)
    expect(result.ok).toBe(false)

    // Sanity check the fixture is meaningful: A and B themselves DO resolve.
    expect((await resolveConversationMembership(conversation!.id, userA.id)).ok).toBe(true)
    expect((await resolveConversationMembership(conversation!.id, userB.id)).ok).toBe(true)
  })

  it('rejects a non-existent conversationId', async () => {
    const userA = await createTestUser({ email: 'conv-a4@test.com' })
    const result = await resolveConversationMembership('00000000-0000-0000-0000-000000000000', userA.id)
    expect(result.ok).toBe(false)
  })

  it('rejects a missing/undefined conversationId (typing payload with no conversationId)', async () => {
    const userA = await createTestUser({ email: 'conv-a5@test.com' })
    const result = await resolveConversationMembership(undefined, userA.id)
    expect(result.ok).toBe(false)
  })

  it('a couple member removed from the underlying profile loses conversation access, mirroring Private Room', async () => {
    const userA = await createTestUser({ email: 'conv-couple-a@test.com' })
    const partner = await createTestUser({ email: 'conv-couple-b@test.com' })
    const outsider = await createTestUser({ email: 'conv-couple-c@test.com' })

    const coupleProfileId = await createTestProfile(userA.id, { type: 'COUPLE' })
    await prisma.coupleProfile.create({
      data: { profileId: coupleProfileId, partnerOneUserId: userA.id, partnerTwoUserId: partner.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
    })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: userA.id, isCreator: true, status: 'ACCEPTED' } })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' } })

    const outsiderProfileId = await createTestProfile(outsider.id)
    const { conversation } = await createTestMatch(coupleProfileId, outsiderProfileId)

    expect((await resolveConversationMembership(conversation!.id, partner.id)).ok).toBe(true)

    await removeMember(coupleProfileId, partner.id)

    const result = await resolveConversationMembership(conversation!.id, partner.id)
    expect(result.ok).toBe(false)
    // userA (still active on the couple profile) keeps access
    expect((await resolveConversationMembership(conversation!.id, userA.id)).ok).toBe(true)
  })
})
