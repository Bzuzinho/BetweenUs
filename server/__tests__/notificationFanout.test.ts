// BETA.4 typecheck fix — coverage for the new notifyProfileMembers fan-out
// (src/lib/notify.ts) and the two call sites that used to read
// `profile.user.id` directly (discovery.ts's LIKE_RECORDED case,
// matches.ts's POST /accept/:fromProfileId). Profile.userId is null for
// COUPLE/GROUP (ownership lives in ProfileMember — see schema.prisma's
// Profile.userId comment), so both call sites only ever notified an
// INDIVIDUAL correctly and silently notified nobody for a couple/group —
// same bug class BETA.3 fixed for the action routes themselves, just
// never caught here since it doesn't 404/error, it just quietly under-
// notifies. This file locks in the fan-out behavior for all three profile
// shapes on both routes.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, waitForCondition } from './helpers'

async function withPhoto(profileId: string) {
  await prisma.profilePhoto.create({
    data: { profileId, storagePath: `test/${profileId}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' }
  })
}

const createGroupProfile = async (memberUserIds: string[]): Promise<string> => {
  const [creatorId, ...rest] = memberUserIds
  const profileId = await createTestProfile(creatorId, { type: 'GROUP', status: 'APPROVED' })
  await (prisma as any).profileMember.create({ data: { profileId, userId: creatorId, isCreator: true, status: 'ACCEPTED' } })
  for (const uid of rest) {
    await (prisma as any).profileMember.create({ data: { profileId, userId: uid, isCreator: false, status: 'ACCEPTED' } })
  }
  return profileId
}

const createActiveCoupleProfile = async (creatorId: string, partnerId: string): Promise<string> => {
  const profileId = await createTestProfile(creatorId, { type: 'COUPLE', status: 'APPROVED' })
  await prisma.coupleProfile.create({
    data: { profileId, partnerOneUserId: creatorId, partnerTwoUserId: partnerId, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
  })
  await (prisma as any).profileMember.create({ data: { profileId, userId: creatorId, isCreator: true, status: 'ACCEPTED' } })
  await (prisma as any).profileMember.create({ data: { profileId, userId: partnerId, isCreator: false, status: 'ACCEPTED' } })
  return profileId
}

describe('Connection-request notifications fan out to every profile member', () => {
  it('liking an INDIVIDUAL notifies that individual', async () => {
    const liker = await createTestUser({ email: 'nf-liker-ind@test.com' })
    const likerProfileId = await createTestProfile(liker.id)
    await withPhoto(likerProfileId)

    const target = await createTestUser({ email: 'nf-target-ind@test.com' })
    const targetProfileId = await createTestProfile(target.id)
    await withPhoto(targetProfileId)

    const res = await request(app).post(`/api/discovery/${targetProfileId}/like`)
      .set('Authorization', `Bearer ${liker.accessToken}`)
    expect(res.status).toBe(200)

    const notification = await waitForCondition(() =>
      prisma.notification.findFirst({ where: { userId: target.id, type: 'connection_request' } })
    )
    expect(notification).toBeTruthy()
  })

  it('liking a COUPLE notifies both members', async () => {
    const liker = await createTestUser({ email: 'nf-liker-couple@test.com' })
    const likerProfileId = await createTestProfile(liker.id)
    await withPhoto(likerProfileId)

    const partnerA = await createTestUser({ email: 'nf-couple-a@test.com' })
    const partnerB = await createTestUser({ email: 'nf-couple-b@test.com' })
    const coupleProfileId = await createActiveCoupleProfile(partnerA.id, partnerB.id)
    await withPhoto(coupleProfileId)

    const res = await request(app).post(`/api/discovery/${coupleProfileId}/like`)
      .set('Authorization', `Bearer ${liker.accessToken}`)
    expect(res.status).toBe(200)

    const notifA = await waitForCondition(() =>
      prisma.notification.findFirst({ where: { userId: partnerA.id, type: 'connection_request' } })
    )
    const notifB = await waitForCondition(() =>
      prisma.notification.findFirst({ where: { userId: partnerB.id, type: 'connection_request' } })
    )
    expect(notifA).toBeTruthy()
    expect(notifB).toBeTruthy()
  })

  it('liking a GROUP notifies every accepted member', async () => {
    const liker = await createTestUser({ email: 'nf-liker-group@test.com' })
    const likerProfileId = await createTestProfile(liker.id)
    await withPhoto(likerProfileId)

    const memberA = await createTestUser({ email: 'nf-group-a@test.com' })
    const memberB = await createTestUser({ email: 'nf-group-b@test.com' })
    const memberC = await createTestUser({ email: 'nf-group-c@test.com' })
    const groupProfileId = await createGroupProfile([memberA.id, memberB.id, memberC.id])
    await withPhoto(groupProfileId)

    const res = await request(app).post(`/api/discovery/${groupProfileId}/like`)
      .set('Authorization', `Bearer ${liker.accessToken}`)
    expect(res.status).toBe(200)

    for (const member of [memberA, memberB, memberC]) {
      const notif = await waitForCondition(() =>
        prisma.notification.findFirst({ where: { userId: member.id, type: 'connection_request' } })
      )
      expect(notif).toBeTruthy()
    }
  })

  it('accepting a request from an INDIVIDUAL notifies that individual requester', async () => {
    const requester = await createTestUser({ email: 'nf-accept-req-ind@test.com' })
    const requesterProfileId = await createTestProfile(requester.id)

    const accepter = await createTestUser({ email: 'nf-accept-acc-ind@test.com' })
    const accepterProfileId = await createTestProfile(accepter.id)

    // Requester's own LIKE row, simulating a pending single-consent request.
    await prisma.profileAction.create({
      data: { actorProfileId: requesterProfileId, targetProfileId: accepterProfileId, action: 'LIKE' }
    })

    const res = await request(app).post(`/api/matches/accept/${requesterProfileId}`)
      .set('Authorization', `Bearer ${accepter.accessToken}`)
    expect(res.status).toBe(200)

    const notif = await waitForCondition(() =>
      prisma.notification.findFirst({ where: { userId: requester.id, type: 'match' } })
    )
    expect(notif).toBeTruthy()
  })

  it('accepting a request from a COUPLE/GROUP requester notifies all its active members', async () => {
    const requesterA = await createTestUser({ email: 'nf-accept-req-couple-a@test.com' })
    const requesterB = await createTestUser({ email: 'nf-accept-req-couple-b@test.com' })
    const requesterProfileId = await createActiveCoupleProfile(requesterA.id, requesterB.id)

    const accepter = await createTestUser({ email: 'nf-accept-acc-couple@test.com' })
    const accepterProfileId = await createTestProfile(accepter.id)

    await prisma.profileAction.create({
      data: { actorProfileId: requesterProfileId, targetProfileId: accepterProfileId, action: 'LIKE' }
    })

    const res = await request(app).post(`/api/matches/accept/${requesterProfileId}`)
      .set('Authorization', `Bearer ${accepter.accessToken}`)
    expect(res.status).toBe(200)

    const notifA = await waitForCondition(() =>
      prisma.notification.findFirst({ where: { userId: requesterA.id, type: 'match' } })
    )
    const notifB = await waitForCondition(() =>
      prisma.notification.findFirst({ where: { userId: requesterB.id, type: 'match' } })
    )
    expect(notifA).toBeTruthy()
    expect(notifB).toBeTruthy()
  })

  it('getNotificationUserIdsForProfile resolves a shared profile with userId=null correctly (no cast needed to compile)', async () => {
    const { getNotificationUserIdsForProfile } = await import('../src/lib/notify')

    const memberA = await createTestUser({ email: 'nf-direct-a@test.com' })
    const memberB = await createTestUser({ email: 'nf-direct-b@test.com' })
    const groupProfileId = await createGroupProfile([memberA.id, memberB.id])

    const profile = await prisma.profile.findUnique({ where: { id: groupProfileId } })
    expect(profile?.userId).toBeNull()

    const userIds = await getNotificationUserIdsForProfile(groupProfileId)
    expect(userIds.slice().sort()).toEqual([memberA.id, memberB.id].sort())
  })
})

describe('Moderation notifications', () => {
  it('records pending and approved photo notifications for every accepted member of a shared profile', async () => {
    const { notifyProfileModerationDecision, notifyProfileModerationPending } = await import('../src/lib/moderationNotifications')
    const memberA = await createTestUser({ email: 'nf-moderation-a@test.com' })
    const memberB = await createTestUser({ email: 'nf-moderation-b@test.com' })
    const profileId = await createGroupProfile([memberA.id, memberB.id])

    await notifyProfileModerationPending(profileId, 'photo', { photoId: 'photo-under-review' })
    await notifyProfileModerationDecision(profileId, 'photo', 'APPROVED', null, { photoId: 'photo-under-review' })

    for (const member of [memberA, memberB]) {
      const notifications = await prisma.notification.findMany({
        where: { userId: member.id, type: { in: ['moderation_photo_pending', 'moderation_photo_approved'] } },
        orderBy: { createdAt: 'asc' },
      })
      expect(notifications.map(notification => notification.type)).toEqual([
        'moderation_photo_pending',
        'moderation_photo_approved',
      ])
      expect(JSON.parse(notifications[1].data || '{}')).toMatchObject({
        profileId,
        photoId: 'photo-under-review',
        tab: 'photos',
        moderationStatus: 'APPROVED',
      })
    }
  })

  it('includes the rejection reason in the user notification', async () => {
    const { notifyUserModerationDecision } = await import('../src/lib/moderationNotifications')
    const user = await createTestUser({ email: 'nf-moderation-rejected@test.com' })

    await notifyUserModerationDecision(user.id, 'verification', 'REJECTED', 'A imagem não está legível.')

    const notification = await prisma.notification.findFirst({
      where: { userId: user.id, type: 'moderation_verification_rejected' },
    })
    expect(notification?.body).toContain('A imagem não está legível.')
  })
})
