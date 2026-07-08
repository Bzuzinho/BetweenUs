// 6.11 — ApprovalPolicy (6.5) and the match reject flow.
import { isApprovalSatisfied, getEffectiveApprovalPolicy } from '../src/lib/approvalPolicyService'
import { createLikeOrMatch, transition } from '../src/lib/matchService'
import { createTestUser, createTestProfile, prisma } from './helpers'

describe('approvalPolicyService', () => {
  it('COUPLE always behaves as ALL, even if approvalPolicy were somehow set otherwise', async () => {
    const creator = await createTestUser({ email: 'policy-couple-a@test.com' })
    const partner = await createTestUser({ email: 'policy-couple-b@test.com' })
    const profileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await prisma.profile.update({ where: { id: profileId }, data: { approvalPolicy: 'MAJORITY' as any } })
    await prisma.coupleProfile.create({
      data: { profileId, partnerOneUserId: creator.id, partnerTwoUserId: partner.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
    })
    await (prisma as any).profileMember.create({ data: { profileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' } })
    await (prisma as any).profileMember.create({ data: { profileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' } })

    expect(await getEffectiveApprovalPolicy(profileId)).toBe('ALL')
    expect(await isApprovalSatisfied(profileId, new Set([creator.id]))).toBe(false)
    expect(await isApprovalSatisfied(profileId, new Set([creator.id, partner.id]))).toBe(true)
  })

  it('a single-member (or not-yet-active) profile is always satisfied - nothing further required from itself', async () => {
    const user = await createTestUser({ email: 'policy-single@test.com' })
    const profileId = await createTestProfile(user.id, { type: 'INDIVIDUAL' })
    expect(await isApprovalSatisfied(profileId, new Set())).toBe(true)
  })
})

describe('Match reject flow (6.5)', () => {
  it('REJECT moves a PENDING_COUPLE_APPROVAL match to ENDED and is only valid from that state', async () => {
    const individualUser = await createTestUser({ email: 'reject-ind@test.com' })
    const individualProfileId = await createTestProfile(individualUser.id)

    const creator = await createTestUser({ email: 'reject-couple-a@test.com' })
    const partner = await createTestUser({ email: 'reject-couple-b@test.com' })
    const coupleProfileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await prisma.coupleProfile.create({
      data: { profileId: coupleProfileId, partnerOneUserId: creator.id, partnerTwoUserId: partner.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
    })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' } })
    await (prisma as any).profileMember.create({ data: { profileId: coupleProfileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' } })

    await createLikeOrMatch(individualProfileId, coupleProfileId)
    const second = await createLikeOrMatch(coupleProfileId, individualProfileId)
    if (second.kind !== 'MATCH_PENDING_COUPLE_APPROVAL') throw new Error('expected pending couple approval')

    const rejectResult = await transition(second.matchId, 'REJECT')
    expect(rejectResult.ok).toBe(true)
    expect(rejectResult.match?.status).toBe('ENDED')

    // REJECT is not valid again from a terminal state
    const secondReject = await transition(second.matchId, 'REJECT')
    expect(secondReject.ok).toBe(false)
  })

  it('REJECT is not a valid transition from ACTIVE (only from PENDING_COUPLE_APPROVAL)', async () => {
    const userA = await createTestUser({ email: 'reject-active-a@test.com' })
    const userB = await createTestUser({ email: 'reject-active-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    await createLikeOrMatch(profileA, profileB)
    const second = await createLikeOrMatch(profileB, profileA)
    if (second.kind !== 'MATCH_CREATED') throw new Error('expected immediate match')

    const rejectResult = await transition(second.matchId, 'REJECT')
    expect(rejectResult.ok).toBe(false)
  })
})
