// 8.12 — consentCheckService aggregation rules, exercised directly
// (bypassing HTTP) since these scenarios are about the aggregation logic
// itself, not route-level auth. Covers: individual consent, couple
// members, silence-never-accepted, all-accepted, one-declined, revoke,
// expiry, and a new active member reopening an already-accepted check on
// a re-consent phase (FACE_REVEAL).
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'
import {
  createConsentCheck, respondToConsentCheck, revokeConsentCheckResponse,
  computeAndCacheStatus, expireOverdueConsentChecks
} from '../src/lib/consentCheckService'

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

describe('consentCheckService — aggregation', () => {
  it('individual consent: single required participant, silence stays PENDING (never accepted)', async () => {
    const userA = await createTestUser({ email: 'agg-a@test.com' })
    const userB = await createTestUser({ email: 'agg-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const state = await createConsentCheck({ matchId: match.id, phase: 'CHAT', initiatedBy: userA.id })
    expect(state?.check.status).toBe('PENDING')
    expect(state?.requiredCount).toBe(2)
    expect(state?.acceptedCount).toBe(0)
  })

  it('all required accepted -> ACCEPTED', async () => {
    const userA = await createTestUser({ email: 'agg-c@test.com' })
    const userB = await createTestUser({ email: 'agg-d@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const created = await createConsentCheck({ matchId: match.id, phase: 'CHAT', initiatedBy: userA.id })
    const checkId = created!.check.id

    await respondToConsentCheck(checkId, userA.id, 'ACCEPTED')
    const midway = await respondToConsentCheck(checkId, userB.id, 'ACCEPTED')
    expect(midway.state?.check.status).toBe('ACCEPTED')
    expect(midway.state?.allAccepted).toBe(true)
  })

  it('couple members: only one member of a required couple accepted -> still PENDING', async () => {
    const { userA: coupleA, userB: coupleB, profileId: coupleProfileId } = await createActiveCouple('agg-couple-a@test.com', 'agg-couple-b@test.com')
    const solo = await createTestUser({ email: 'agg-solo@test.com' })
    const soloProfileId = await createTestProfile(solo.id)
    const match = await createTestMatch(coupleProfileId, soloProfileId)

    const created = await createConsentCheck({ matchId: match.id, phase: 'FACE_REVEAL', initiatedBy: solo.id })
    const checkId = created!.check.id

    await respondToConsentCheck(checkId, solo.id, 'ACCEPTED')
    const partial = await respondToConsentCheck(checkId, coupleA.id, 'ACCEPTED')
    // coupleB (the couple's second member) hasn't answered yet — the
    // couple's own consent isn't complete, so the whole check stays PENDING.
    expect(partial.state?.check.status).toBe('PENDING')

    const complete = await respondToConsentCheck(checkId, coupleB.id, 'ACCEPTED')
    expect(complete.state?.check.status).toBe('ACCEPTED')
  })

  it('one participant declines -> DECLINED', async () => {
    const userA = await createTestUser({ email: 'agg-e@test.com' })
    const userB = await createTestUser({ email: 'agg-f@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const created = await createConsentCheck({ matchId: match.id, phase: 'VIDEO_CALL', initiatedBy: userA.id })
    const checkId = created!.check.id

    await respondToConsentCheck(checkId, userA.id, 'ACCEPTED')
    const declined = await respondToConsentCheck(checkId, userB.id, 'DECLINED')
    expect(declined.state?.check.status).toBe('DECLINED')
  })

  it('revoke flips an ACCEPTED response and the aggregate to REVOKED', async () => {
    const userA = await createTestUser({ email: 'agg-g@test.com' })
    const userB = await createTestUser({ email: 'agg-h@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const created = await createConsentCheck({ matchId: match.id, phase: 'FACE_REVEAL', initiatedBy: userA.id })
    const checkId = created!.check.id

    await respondToConsentCheck(checkId, userA.id, 'ACCEPTED')
    await respondToConsentCheck(checkId, userB.id, 'ACCEPTED')
    const revoked = await revokeConsentCheckResponse(checkId, userA.id)
    expect(revoked.state?.check.status).toBe('REVOKED')

    // Cannot revoke a non-accepted response (e.g. try again on same user
    // after already revoked)
    const secondAttempt = await revokeConsentCheckResponse(checkId, userA.id)
    expect('error' in secondAttempt).toBe(true)
  })

  it('expire job flips an overdue PENDING check to EXPIRED, idempotently', async () => {
    const userA = await createTestUser({ email: 'agg-i@test.com' })
    const userB = await createTestUser({ email: 'agg-j@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const check = await prisma.consentCheck.create({
      data: { matchId: match.id, phase: 'CHAT', status: 'PENDING', initiatedBy: userA.id, expiresAt: new Date(Date.now() - 1000) }
    })

    const firstRun = await expireOverdueConsentChecks()
    expect(firstRun).toBeGreaterThanOrEqual(1)
    const state = await computeAndCacheStatus(check.id)
    expect(state?.check.status).toBe('EXPIRED')

    // Idempotent: running again doesn't error or double-process
    const secondRun = await expireOverdueConsentChecks()
    expect(secondRun).toBe(0)
  })

  it('a new active member of a re-consent phase (FACE_REVEAL) reopens an ACCEPTED check to PENDING', async () => {
    const { userA: coupleA, userB: coupleB, profileId: coupleProfileId } = await createActiveCouple('agg-newmember-a@test.com', 'agg-newmember-b@test.com')
    const solo = await createTestUser({ email: 'agg-newmember-solo@test.com' })
    const soloProfileId = await createTestProfile(solo.id)
    const match = await createTestMatch(coupleProfileId, soloProfileId)

    const created = await createConsentCheck({ matchId: match.id, phase: 'FACE_REVEAL', initiatedBy: solo.id })
    const checkId = created!.check.id

    await respondToConsentCheck(checkId, solo.id, 'ACCEPTED')
    await respondToConsentCheck(checkId, coupleA.id, 'ACCEPTED')
    const accepted = await respondToConsentCheck(checkId, coupleB.id, 'ACCEPTED')
    expect(accepted.state?.check.status).toBe('ACCEPTED')

    // A third member joins the couple/group profile after acceptance.
    const newMemberUser = await createTestUser({ email: 'agg-newmember-c@test.com' })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: newMemberUser.id, isCreator: false, status: 'ACCEPTED' } })

    const recomputed = await computeAndCacheStatus(checkId)
    // FACE_REVEAL has reConsentOnNewMember: true — the newcomer must also
    // consent, so the aggregate falls back to PENDING rather than staying
    // silently ACCEPTED for someone who never answered.
    expect(recomputed?.check.status).toBe('PENDING')
    expect(recomputed?.requiredUserIds).toContain(newMemberUser.id)
  })

  it('FACE_REVEAL required participants default to both sides of the match (not photo-specific)', async () => {
    const userA = await createTestUser({ email: 'agg-face-a@test.com' })
    const userB = await createTestUser({ email: 'agg-face-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const created = await createConsentCheck({ matchId: match.id, phase: 'FACE_REVEAL', initiatedBy: userA.id })
    expect(created?.requiredUserIds.sort()).toEqual([userA.id, userB.id].sort())
  })
})
