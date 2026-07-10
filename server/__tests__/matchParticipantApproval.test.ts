// BETA.2 (FASE E) — N-party Match Participant Approval: COUPLE+COUPLE (4
// required approvers) and GROUP+INDIVIDUAL (N+1 required approvers).
// Exercises createLikeOrMatch/getRequiredApproverUserIds/isApprovalSatisfied
// end to end against a real DB.
//
// GROUP coverage here is the regression test for the FASE E bug fix in
// matchService.ts: createLikeOrMatch's requiresDoubleConsent used to check
// `type === 'COUPLE'` only, so a GROUP profile would jump straight to
// ACTIVE on a mutual like, silently skipping N-party approval entirely.
// The first GROUP test below (matchStateAfterMutualLike === 'PENDING_...')
// is what would have failed before that fix.
import { createLikeOrMatch, getRequiredApproverUserIds, transition } from '../src/lib/matchService'
import { isApprovalSatisfied } from '../src/lib/approvalPolicyService'
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

const createApprovedGroup = async (emails: string[]) => {
  const users = await Promise.all(emails.map((email, i) => createTestUser({ email })))
  const profile = await prisma.profile.create({
    data: {
      type: 'GROUP', status: 'APPROVED', displayName: 'Test Group', relationshipStatus: 'POLYAMOROUS',
      discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
    }
  })
  for (let i = 0; i < users.length; i++) {
    await (prisma as any).profileMember.create({ data: { profileId: profile.id, userId: users[i].id, isCreator: i === 0, status: 'ACCEPTED' } })
  }
  return { users, profileId: profile.id }
}

const approve = async (matchId: string, userId: string) => {
  await prisma.coupleMatchApproval.upsert({
    where: { matchId_userId: { matchId, userId } },
    update: { approvedAt: new Date() },
    create: { matchId, userId, approvedAt: new Date() },
  })
}

describe('N-party Match Participant Approval', () => {
  it('COUPLE + COUPLE: requires 4 unique User approvals (2 per side), stays pending until all 4 approve', async () => {
    const { userA, userB, profileId: coupleOneId } = await createActiveCouple('mpa-cc-a@test.com', 'mpa-cc-b@test.com')
    const { userA: userC, userB: userD, profileId: coupleTwoId } = await createActiveCouple('mpa-cc-c@test.com', 'mpa-cc-d@test.com')

    await createLikeOrMatch(coupleOneId, coupleTwoId)
    const result = await createLikeOrMatch(coupleTwoId, coupleOneId)
    expect(result.kind).toBe('MATCH_PENDING_COUPLE_APPROVAL')
    if (result.kind !== 'MATCH_PENDING_COUPLE_APPROVAL') throw new Error('unreachable')
    const matchId = result.matchId

    const [requiredOne, requiredTwo] = await Promise.all([
      getRequiredApproverUserIds(coupleOneId), getRequiredApproverUserIds(coupleTwoId),
    ])
    const allRequired = new Set([...requiredOne, ...requiredTwo])
    expect(allRequired.size).toBe(4)
    expect([...allRequired].sort()).toEqual([userA.id, userB.id, userC.id, userD.id].sort())

    // Partial: only 1 of 4 approves — must stay pending.
    await approve(matchId, userA.id)
    const approvedIds = new Set([userA.id])
    const [oneSat1, twoSat1] = await Promise.all([
      isApprovalSatisfied(coupleOneId, approvedIds), isApprovalSatisfied(coupleTwoId, approvedIds),
    ])
    expect(oneSat1 && twoSat1).toBe(false)
    const stillPending = await prisma.match.findUnique({ where: { id: matchId } })
    expect(stillPending?.status).toBe('PENDING_COUPLE_APPROVAL')

    // All 4 approve — now both sides are independently satisfied.
    await approve(matchId, userB.id); await approve(matchId, userC.id); await approve(matchId, userD.id)
    const allApproved = new Set([userA.id, userB.id, userC.id, userD.id])
    const [oneSat2, twoSat2] = await Promise.all([
      isApprovalSatisfied(coupleOneId, allApproved), isApprovalSatisfied(coupleTwoId, allApproved),
    ])
    expect(oneSat2 && twoSat2).toBe(true)

    const activated = await transition(matchId, 'ACTIVATE')
    expect(activated.ok).toBe(true)
    expect(activated.match.status).toBe('ACTIVE')
  })

  it('GROUP + INDIVIDUAL: mutual like does NOT jump straight to ACTIVE (regression guard for the FASE E matchService fix)', async () => {
    const { users: groupUsers, profileId: groupId } = await createApprovedGroup(['mpa-gi-l@test.com', 'mpa-gi-d@test.com', 'mpa-gi-i@test.com'])
    const individualUser = await createTestUser({ email: 'mpa-gi-solo@test.com' })
    const individualProfileId = await createTestProfile(individualUser.id)

    await createLikeOrMatch(groupId, individualProfileId)
    const result = await createLikeOrMatch(individualProfileId, groupId)

    // Before the fix, this would have been MATCH_CREATED (or ALREADY_MATCHED
    // with status ACTIVE) because requiresDoubleConsent only checked
    // type==='COUPLE'. A GROUP must require approval exactly like a COUPLE.
    expect(result.kind).toBe('MATCH_PENDING_COUPLE_APPROVAL')
  })

  it('GROUP + INDIVIDUAL: requires N+1 approvers (3 group members + 1 individual = 4), independent per side', async () => {
    const { users: groupUsers, profileId: groupId } = await createApprovedGroup(['mpa-gi2-l@test.com', 'mpa-gi2-d@test.com', 'mpa-gi2-i@test.com'])
    const individualUser = await createTestUser({ email: 'mpa-gi2-solo@test.com' })
    const individualProfileId = await createTestProfile(individualUser.id)

    await createLikeOrMatch(groupId, individualProfileId)
    const result = await createLikeOrMatch(individualProfileId, groupId)
    if (result.kind !== 'MATCH_PENDING_COUPLE_APPROVAL') throw new Error(`expected pending approval, got ${result.kind}`)
    const matchId = result.matchId

    const [requiredGroup, requiredIndividual] = await Promise.all([
      getRequiredApproverUserIds(groupId), getRequiredApproverUserIds(individualProfileId),
    ])
    expect(requiredGroup.length).toBe(3)
    expect(requiredIndividual).toEqual([individualUser.id])
    const allRequired = new Set([...requiredGroup, ...requiredIndividual])
    expect(allRequired.size).toBe(4)

    // Only the individual approves — group side unsatisfied.
    await approve(matchId, individualUser.id)
    const partial = new Set([individualUser.id])
    const [groupSat1, indSat1] = await Promise.all([
      isApprovalSatisfied(groupId, partial), isApprovalSatisfied(individualProfileId, partial),
    ])
    expect(indSat1).toBe(true)
    expect(groupSat1).toBe(false)

    // All 3 group members approve too — now fully satisfied both sides.
    for (const u of groupUsers) await approve(matchId, u.id)
    const full = new Set([individualUser.id, ...groupUsers.map(u => u.id)])
    const [groupSat2, indSat2] = await Promise.all([
      isApprovalSatisfied(groupId, full), isApprovalSatisfied(individualProfileId, full),
    ])
    expect(groupSat2 && indSat2).toBe(true)

    const activated = await transition(matchId, 'ACTIVATE')
    expect(activated.ok).toBe(true)
    expect(activated.match.status).toBe('ACTIVE')
  })
})
