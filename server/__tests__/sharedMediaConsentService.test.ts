// 6.11 — sharedMediaConsentService (6.8): required-approver resolution and
// the veto model (any single decline blocks access; ALL required approvers
// must say yes for it to resolve APPROVED).
import { getRequiredApproverUserIds, isRequiredApprover, recordApproval } from '../src/lib/sharedMediaConsentService'
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

describe('sharedMediaConsentService', () => {
  it('SINGLE_MEMBER photos have no required approvers via this service (owner-only path handled elsewhere)', async () => {
    const { profileId } = await createActiveCouple('media-a1@test.com', 'media-b1@test.com')
    const required = await getRequiredApproverUserIds({ profileId, memberScope: 'SINGLE_MEMBER', depictedMemberIds: [] })
    expect(required).toEqual([])
  })

  it('SHARED_PROFILE requires every active member', async () => {
    const { userA, userB, profileId } = await createActiveCouple('media-a2@test.com', 'media-b2@test.com')
    const required = await getRequiredApproverUserIds({ profileId, memberScope: 'SHARED_PROFILE', depictedMemberIds: [] })
    expect(required.sort()).toEqual([userA.id, userB.id].sort())
  })

  it('MULTIPLE_MEMBERS requires exactly the manually-tagged depicted members', async () => {
    const { userA, profileId } = await createActiveCouple('media-a3@test.com', 'media-b3@test.com')
    const required = await getRequiredApproverUserIds({ profileId, memberScope: 'MULTIPLE_MEMBERS', depictedMemberIds: [userA.id] })
    expect(required).toEqual([userA.id])
  })

  it('recordApproval: any single decline vetoes access, even if others already approved', async () => {
    const { userA, userB, profileId } = await createActiveCouple('media-a4@test.com', 'media-b4@test.com')
    const requester = await createTestUser({ email: 'media-requester1@test.com' })
    const photo = await prisma.profilePhoto.create({
      data: { profileId, storagePath: 'k', blurredPath: 'k-b', visibilityLevel: 'PRIVATE_AFTER_APPROVAL' as any,
        memberScope: 'SHARED_PROFILE' as any, moderationStatus: 'APPROVED' as any }
    })
    const request = await prisma.photoAccessRequest.create({
      data: { photoId: photo.id, requesterId: requester.id, ownerId: userA.id, status: 'PENDING' }
    })

    const first = await recordApproval(request.id, userA.id, 'APPROVED')
    expect(first.finalStatus).toBe('PENDING') // still waiting on userB

    const second = await recordApproval(request.id, userB.id, 'DECLINED')
    expect(second.finalStatus).toBe('DECLINED')

    const finalRequest = await prisma.photoAccessRequest.findUnique({ where: { id: request.id } })
    expect(finalRequest?.status).toBe('DECLINED')
  })

  it('recordApproval: resolves APPROVED only once every required approver has said yes', async () => {
    const { userA, userB, profileId } = await createActiveCouple('media-a5@test.com', 'media-b5@test.com')
    const requester = await createTestUser({ email: 'media-requester2@test.com' })
    const photo = await prisma.profilePhoto.create({
      data: { profileId, storagePath: 'k2', blurredPath: 'k2-b', visibilityLevel: 'PRIVATE_AFTER_APPROVAL' as any,
        memberScope: 'SHARED_PROFILE' as any, moderationStatus: 'APPROVED' as any }
    })
    const request = await prisma.photoAccessRequest.create({
      data: { photoId: photo.id, requesterId: requester.id, ownerId: userA.id, status: 'PENDING' }
    })

    await recordApproval(request.id, userA.id, 'APPROVED')
    const finalResult = await recordApproval(request.id, userB.id, 'APPROVED')
    expect(finalResult.finalStatus).toBe('APPROVED')

    const finalRequest = await prisma.photoAccessRequest.findUnique({ where: { id: request.id } })
    expect(finalRequest?.status).toBe('APPROVED')
  })

  it('a user outside the required-approver set cannot record an approval', async () => {
    const { userA, profileId } = await createActiveCouple('media-a6@test.com', 'media-b6@test.com')
    const requester = await createTestUser({ email: 'media-requester3@test.com' })
    const outsider = await createTestUser({ email: 'media-outsider@test.com' })
    const photo = await prisma.profilePhoto.create({
      data: { profileId, storagePath: 'k3', blurredPath: 'k3-b', visibilityLevel: 'PRIVATE_AFTER_APPROVAL' as any,
        memberScope: 'MULTIPLE_MEMBERS' as any, depictedMemberIds: [userA.id], moderationStatus: 'APPROVED' as any }
    })
    const request = await prisma.photoAccessRequest.create({
      data: { photoId: photo.id, requesterId: requester.id, ownerId: userA.id, status: 'PENDING' }
    })
    const result = await recordApproval(request.id, outsider.id, 'APPROVED')
    expect(result.ok).toBe(false)
  })
})
