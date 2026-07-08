// 5.12 — match transitions (5.9) and couple approval state, end to end
// through createLikeOrMatch/transition() against a real DB. Also covers
// cache invalidation (5.8) for CompatibilityScore.
import { createLikeOrMatch, getRequiredApproverUserIds, transition } from '../src/lib/matchService'
import { getOrCalculateScore } from '../src/lib/compatibilityScoreService'
import { invalidateScoresForProfile } from '../src/lib/scoreInvalidationService'
import type { BetweenScoreProfileInput } from '../src/lib/betweenScoreService'
import { createTestUser, createTestProfile, prisma } from './helpers'

describe('Match transitions + couple approval (end to end)', () => {
  it('individual <-> individual mutual like activates immediately (no approval needed)', async () => {
    const userA = await createTestUser({ email: 'match-ind-a@test.com' })
    const userB = await createTestUser({ email: 'match-ind-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)

    const first = await createLikeOrMatch(profileA, profileB)
    expect(first.kind).toBe('LIKE_RECORDED')
    const second = await createLikeOrMatch(profileB, profileA)
    expect(second.kind).toBe('MATCH_CREATED')

    const match = await prisma.match.findFirst({ where: { OR: [{ profileOneId: profileA, profileTwoId: profileB }, { profileOneId: profileB, profileTwoId: profileA }] } })
    expect(match?.status).toBe('ACTIVE')
    expect(match?.matchedAt).not.toBeNull()
  })

  it('individual <-> ACTIVE couple requires couple approval before activating', async () => {
    const individualUser = await createTestUser({ email: 'match-ind-c@test.com' })
    const individualProfileId = await createTestProfile(individualUser.id)

    const creator = await createTestUser({ email: 'match-couple-creator@test.com' })
    const partner = await createTestUser({ email: 'match-couple-partner@test.com' })
    const coupleProfileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await prisma.coupleProfile.create({
      data: { profileId: coupleProfileId, partnerOneUserId: creator.id, partnerTwoUserId: partner.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
    })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' } })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' } })

    const first = await createLikeOrMatch(individualProfileId, coupleProfileId)
    expect(first.kind).toBe('LIKE_RECORDED')
    const second = await createLikeOrMatch(coupleProfileId, individualProfileId)
    expect(second.kind).toBe('MATCH_PENDING_COUPLE_APPROVAL')
    if (second.kind !== 'MATCH_PENDING_COUPLE_APPROVAL') throw new Error('unreachable')
    const matchId = second.matchId

    const preActivate = await prisma.match.findUnique({ where: { id: matchId } })
    expect(preActivate?.status).toBe('PENDING_COUPLE_APPROVAL')

    // ACTIVATE is not valid until this point in the real flow (couples.ts
    // only calls it once every required approver has approved) - but the
    // state machine itself doesn't block a premature call from a
    // logic bug, it's PENDING_COUPLE_APPROVAL -> ACTIVE that's structurally
    // valid regardless of whether approvals were actually collected. That
    // approval bookkeeping is CoupleMatchApproval's job (couples.ts), not
    // MatchStateMachine's - this test exercises the transition itself.
    const requiredOne = await getRequiredApproverUserIds(preActivate!.profileOneId)
    const requiredTwo = await getRequiredApproverUserIds(preActivate!.profileTwoId)
    const requiredApprovers = [...new Set([...requiredOne, ...requiredTwo])]
    expect(requiredApprovers.sort()).toEqual([creator.id, individualUser.id, partner.id].sort())

    const activated = await transition(matchId, 'ACTIVATE')
    expect(activated.ok).toBe(true)
    expect(activated.match.status).toBe('ACTIVE')
    expect(activated.match.matchedAt).not.toBeNull()

    // ACTIVATE again should now be rejected — already ACTIVE
    const secondActivate = await transition(matchId, 'ACTIVATE')
    expect(secondActivate.ok).toBe(false)
  })

  it('PAUSE -> RESUME -> BLOCK follows the state machine, and BLOCK is terminal', async () => {
    const userA = await createTestUser({ email: 'match-pause-a@test.com' })
    const userB = await createTestUser({ email: 'match-pause-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    await createLikeOrMatch(profileA, profileB)
    const result = await createLikeOrMatch(profileB, profileA)
    if (result.kind !== 'MATCH_CREATED') throw new Error('expected immediate match')
    const matchId = result.matchId

    const paused = await transition(matchId, 'PAUSE')
    expect(paused.ok).toBe(true)
    expect(paused.match.status).toBe('PAUSED')

    const resumed = await transition(matchId, 'RESUME')
    expect(resumed.ok).toBe(true)
    expect(resumed.match.status).toBe('ACTIVE')

    const blocked = await transition(matchId, 'BLOCK')
    expect(blocked.ok).toBe(true)
    expect(blocked.match.status).toBe('BLOCKED')

    const endAfterBlock = await transition(matchId, 'END')
    expect(endAfterBlock.ok).toBe(false)
  })
})

describe('CompatibilityScore cache + invalidation (5.8)', () => {
  const buildInput = (id: string, overrides: Partial<BetweenScoreProfileInput> = {}): BetweenScoreProfileInput => ({
    id, relationshipStatus: 'SINGLE', discretionLevel: 'SELECTIVE', city: 'Lisboa',
    locationLat: null, locationLng: null, intentions: [], boundaries: [], ...overrides
  })

  it('a cached score is reused even after the underlying inputs change, until explicitly invalidated', async () => {
    const userA = await createTestUser({ email: 'cache-a@test.com' })
    const userB = await createTestUser({ email: 'cache-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)

    const intention = await prisma.intention.create({ data: { name: 'Casual', slug: `casual_${Date.now()}` } })
    // Source always wants this intention — only the target's side changes.
    const sourceInput = buildInput(profileA, { intentions: [{ slug: intention.slug, preference: 'YES' }] })
    const targetV1 = buildInput(profileB, { intentions: [] }) // no match yet
    const first = await getOrCalculateScore(sourceInput, targetV1)
    expect(first.reasonCodes).not.toContain('INTENTIONS_ALIGNED')

    // Target now also wants it — a real recompute would detect a match —
    // but calling with the SAME profile ids should still hit the cache.
    const targetV2 = buildInput(profileB, { intentions: [{ slug: intention.slug, preference: 'YES' }] })
    const stillCached = await getOrCalculateScore(sourceInput, targetV2)
    expect(stillCached.score).toBe(first.score)
    expect(stillCached.reasonCodes).not.toContain('INTENTIONS_ALIGNED') // still the stale cached result

    await invalidateScoresForProfile(profileB)

    const recomputed = await getOrCalculateScore(sourceInput, targetV2)
    expect(recomputed.reasonCodes).toContain('INTENTIONS_ALIGNED')
    expect(recomputed.score).toBeGreaterThan(first.score)
  })

  it('invalidateScoresForProfile only removes rows where the profile is source OR target, not unrelated pairs', async () => {
    const userA = await createTestUser({ email: 'cache-c1@test.com' })
    const userB = await createTestUser({ email: 'cache-c2@test.com' })
    const userC = await createTestUser({ email: 'cache-c3@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const profileC = await createTestProfile(userC.id)

    await getOrCalculateScore(buildInput(profileA), buildInput(profileB))
    await getOrCalculateScore(buildInput(profileC), buildInput(profileB))

    const removed = await invalidateScoresForProfile(profileA)
    expect(removed).toBe(1)

    const remaining = await (prisma as any).compatibilityScore.findMany({ where: { OR: [{ sourceProfileId: profileC }, { targetProfileId: profileC }] } })
    expect(remaining.length).toBe(1) // C <-> B untouched
  })
})
