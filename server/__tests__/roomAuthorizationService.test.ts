// 7.12 — RoomAuthorizationService: member join, non-member rejected, left
// member rejected, and the stale-ProfileMember safety net for match-derived
// rooms.
import { resolveRoomMembership, canSendMessage } from '../src/lib/roomAuthorizationService'
import { createFromMatch } from '../src/lib/privateRoomService'
import { removeMember } from '../src/lib/profileMembershipService'
import { createTestUser, createTestProfile, prisma } from './helpers'

const createActiveCouple = async (emailA: string, emailB: string) => {
  const userA = await createTestUser({ email: emailA })
  const userB = await createTestUser({ email: emailB })
  const profileId = await createTestProfile(userA.id, { type: 'COUPLE' })
  await prisma.coupleProfile.create({
    data: { profileId, partnerOneUserId: userA.id, partnerTwoUserId: userB.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
  })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userA.id, isCreator: true, status: 'ACCEPTED' } })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userB.id, isCreator: false, status: 'ACCEPTED' } })
  return { userA, userB, profileId }
}

describe('RoomAuthorizationService', () => {
  it('a real member resolves successfully', async () => {
    const userA = await createTestUser({ email: 'auth-a@test.com' })
    const userB = await createTestUser({ email: 'auth-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })
    const { room } = await createFromMatch(match.id)

    const result = await resolveRoomMembership(room.id, userA.id)
    expect(result.ok).toBe(true)
    expect(result.member?.role).toBe('MEMBER')
  })

  it('a non-member is rejected', async () => {
    const userA = await createTestUser({ email: 'auth-c@test.com' })
    const userB = await createTestUser({ email: 'auth-d@test.com' })
    const outsider = await createTestUser({ email: 'auth-outsider@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })
    const { room } = await createFromMatch(match.id)

    const result = await resolveRoomMembership(room.id, outsider.id)
    expect(result.ok).toBe(false)
  })

  it('a member who has left (leftAt set) is rejected on subsequent checks', async () => {
    const userA = await createTestUser({ email: 'auth-e@test.com' })
    const userB = await createTestUser({ email: 'auth-f@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })
    const { room } = await createFromMatch(match.id)

    await (prisma as any).privateRoomMember.updateMany({ where: { privateRoomId: room.id, userId: userA.id }, data: { leftAt: new Date() } })

    const result = await resolveRoomMembership(room.id, userA.id)
    expect(result.ok).toBe(false)
    // the other member is unaffected
    const stillIn = await resolveRoomMembership(room.id, userB.id)
    expect(stillIn.ok).toBe(true)
  })

  it('a couple member removed from the underlying profile loses room access even though their PrivateRoomMember row is untouched', async () => {
    const { userA, userB, profileId: coupleProfileId } = await createActiveCouple('auth-couple-a@test.com', 'auth-couple-b@test.com')
    const individualUser = await createTestUser({ email: 'auth-couple-c@test.com' })
    const individualProfileId = await createTestProfile(individualUser.id)
    const match = await prisma.match.create({ data: { profileOneId: coupleProfileId, profileTwoId: individualProfileId, status: 'ACTIVE', matchedAt: new Date() } })
    const { room } = await createFromMatch(match.id)

    // Sanity: userB currently has room access
    expect((await resolveRoomMembership(room.id, userB.id)).ok).toBe(true)

    // Couple separates / userB is removed from the profile
    await removeMember(coupleProfileId, userB.id)

    const result = await resolveRoomMembership(room.id, userB.id)
    expect(result.ok).toBe(false)
    // userA (still an active member of the couple profile) keeps access
    expect((await resolveRoomMembership(room.id, userA.id)).ok).toBe(true)
  })

  it('canSendMessage rejects when the room is not ACTIVE, even for a valid member', async () => {
    const userA = await createTestUser({ email: 'auth-send-a@test.com' })
    const userB = await createTestUser({ email: 'auth-send-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })
    const { room } = await createFromMatch(match.id)
    expect(room.status).toBe('WAITING_CONSENT') // fresh room, not yet everyone-accepted

    const result = await canSendMessage(room.id, userA.id)
    expect(result.ok).toBe(false)
  })
})
