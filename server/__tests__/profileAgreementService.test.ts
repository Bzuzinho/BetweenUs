// 6.11 — ProfileAgreementService: conservative merge (pure), per-member
// answer resolution/isolation, and status computation against a real DB.
import {
  mergePreferences, submitAnswer, getAgreementSummary, getMyAnswers, lockAgreement,
} from '../src/lib/profileAgreementService'
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

describe('mergePreferences (conservative merge, pure function)', () => {
  it('YES+YES=YES, YES+MAYBE=MAYBE, YES+NO=NO', () => {
    expect(mergePreferences(['YES', 'YES'])).toBe('YES')
    expect(mergePreferences(['YES', 'MAYBE'])).toBe('MAYBE')
    expect(mergePreferences(['YES', 'NO'])).toBe('NO')
  })
  it('MAYBE+MAYBE=MAYBE, MAYBE+NO=NO, NO+NO=NO', () => {
    expect(mergePreferences(['MAYBE', 'MAYBE'])).toBe('MAYBE')
    expect(mergePreferences(['MAYBE', 'NO'])).toBe('NO')
    expect(mergePreferences(['NO', 'NO'])).toBe('NO')
  })
  it('is order-independent (folds any number of members the same way)', () => {
    expect(mergePreferences(['YES', 'NO', 'MAYBE'])).toBe('NO')
    expect(mergePreferences(['NO', 'YES', 'MAYBE'])).toBe('NO')
    expect(mergePreferences(['YES', 'YES', 'MAYBE'])).toBe('MAYBE')
  })
})

describe('ProfileAgreementService — per-member answers, never for a partner', () => {
  it('a couple with only one member answering stays WAITING_MEMBERS, never reveals the answer as "shared" until both respond', async () => {
    const { userA, profileId } = await createActiveCouple('agreement-a1@test.com', 'agreement-b1@test.com')
    const boundary = await prisma.boundary.findFirst({ where: { active: true } })
    expect(boundary).not.toBeNull()

    const result = await submitAnswer(profileId, userA.id, { boundaryId: boundary!.id }, 'YES')
    expect(result.ok).toBe(true)
    expect(result.status).toBe('WAITING_MEMBERS')

    const summary = await getAgreementSummary(profileId)
    expect(summary?.status).toBe('WAITING_MEMBERS')
    // the shared summary must NOT expose a merged value yet - nobody else
    // has answered, so there is nothing to merge and nothing to reveal
    const entry = summary?.results.find(r => r.label === boundary!.name)
    expect(entry?.sharedPreference).toBeNull()
  })

  it('once both members answer identically, the agreement is ALIGNED with the shared value; once they differ, it is CONFLICT with the conservative merge', async () => {
    const { userA, userB, profileId } = await createActiveCouple('agreement-a2@test.com', 'agreement-b2@test.com')
    const boundary = await prisma.boundary.findFirst({ where: { active: true } })

    await submitAnswer(profileId, userA.id, { boundaryId: boundary!.id }, 'YES')
    await submitAnswer(profileId, userB.id, { boundaryId: boundary!.id }, 'YES')
    let summary = await getAgreementSummary(profileId)
    expect(summary?.status).toBe('ALIGNED')
    let entry = summary?.results.find(r => r.label === boundary!.name)
    expect(entry?.sharedPreference).toBe('YES')
    expect(entry?.aligned).toBe(true)

    // Now disagree: A says YES, B says NO -> conservative merge is NO,
    // and the question is flagged as not aligned (CONFLICT), but the
    // summary NEVER says which member picked which value.
    await submitAnswer(profileId, userB.id, { boundaryId: boundary!.id }, 'NO')
    summary = await getAgreementSummary(profileId)
    expect(summary?.status).toBe('CONFLICT')
    entry = summary?.results.find(r => r.label === boundary!.name)
    expect(entry?.sharedPreference).toBe('NO')
    expect(entry?.aligned).toBe(false)
    expect(summary?.conflictCount).toBe(1)

    // The merged (conservative) result is synced into the real
    // ProfileBoundary row, so it actually feeds discovery/matching.
    const synced = await prisma.profileBoundary.findUnique({
      where: { profileId_boundaryId: { profileId, boundaryId: boundary!.id } }
    })
    expect(synced?.preference).toBe('NO')
  })

  it('getMyAnswers only ever returns the CALLING member\'s own answers, resolved from their own userId - never accepts a profileMemberId from the caller', async () => {
    const { userA, userB, profileId } = await createActiveCouple('agreement-a3@test.com', 'agreement-b3@test.com')
    const boundary = await prisma.boundary.findFirst({ where: { active: true } })

    await submitAnswer(profileId, userA.id, { boundaryId: boundary!.id }, 'YES')
    await submitAnswer(profileId, userB.id, { boundaryId: boundary!.id }, 'NO')

    const mineA = await getMyAnswers(profileId, userA.id)
    const mineB = await getMyAnswers(profileId, userB.id)
    expect(mineA?.answers.find((a: any) => a.boundaryId === boundary!.id)?.preference).toBe('YES')
    expect(mineB?.answers.find((a: any) => a.boundaryId === boundary!.id)?.preference).toBe('NO')
  })

  it('a user who is not an active member of the profile cannot submit an answer', async () => {
    const { profileId } = await createActiveCouple('agreement-a4@test.com', 'agreement-b4@test.com')
    const outsider = await createTestUser({ email: 'agreement-outsider@test.com' })
    const boundary = await prisma.boundary.findFirst({ where: { active: true } })

    const result = await submitAnswer(profileId, outsider.id, { boundaryId: boundary!.id }, 'YES')
    expect(result.ok).toBe(false)
  })

  it('a LOCKED round can remain CONFLICT - locking does not require resolution first, and blocks further answers until a new round starts', async () => {
    const { userA, userB, profileId } = await createActiveCouple('agreement-a5@test.com', 'agreement-b5@test.com')
    const boundary = await prisma.boundary.findFirst({ where: { active: true } })
    await submitAnswer(profileId, userA.id, { boundaryId: boundary!.id }, 'YES')
    await submitAnswer(profileId, userB.id, { boundaryId: boundary!.id }, 'NO')

    const lockResult = await lockAgreement(profileId)
    expect(lockResult.ok).toBe(true)
    expect(lockResult.status).toBe('LOCKED')

    const blocked = await submitAnswer(profileId, userA.id, { boundaryId: boundary!.id }, 'MAYBE')
    expect(blocked.ok).toBe(false)
  })
})
