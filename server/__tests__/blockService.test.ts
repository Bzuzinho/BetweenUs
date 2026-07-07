// 9.13 — BlockService: block is immediate (match ended, photo access
// revoked), likes are blocked defensively, and the room policy (safety-
// lock a 2-person room, blocker-leaves-only for 3+-person rooms).
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'
import { blockProfile, isBlockedEitherWay } from '../src/lib/blockService'

describe('BlockService — immediate effects', () => {
  it('blocking ends an active match immediately', async () => {
    const userA = await createTestUser({ email: 'blk-a@test.com' })
    const userB = await createTestUser({ email: 'blk-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    await blockProfile(profileAId, profileBId)

    const updated = await prisma.match.findUnique({ where: { id: match.id } })
    expect(updated?.status).toBe('BLOCKED')
  })

  it('blocking revokes standing APPROVED photo access between the two users', async () => {
    const owner = await createTestUser({ email: 'blk-owner@test.com' })
    const requester = await createTestUser({ email: 'blk-requester@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const requesterProfileId = await createTestProfile(requester.id)
    await createTestMatch(ownerProfileId, requesterProfileId)

    const photo = await prisma.profilePhoto.create({
      data: { profileId: ownerProfileId, storagePath: 'test/blk-photo.jpg', visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'APPROVED' }
    })
    const grant = await (prisma as any).photoAccessRequest.create({
      data: { photoId: photo.id, requesterId: requester.id, ownerId: owner.id, status: 'APPROVED', respondedAt: new Date() }
    })

    await blockProfile(requesterProfileId, ownerProfileId)

    // MATCH_BLOCKED's domain event handler runs synchronously within the
    // match transition dispatch — give it a tick to complete.
    await new Promise(r => setTimeout(r, 50))

    const updated = await (prisma as any).photoAccessRequest.findUnique({ where: { id: grant.id } })
    expect(updated.status).toBe('REVOKED')
  })

  it('isBlockedEitherWay blocks a like attempt even via a direct API call', async () => {
    const userA = await createTestUser({ email: 'blk-like-a@test.com' })
    const userB = await createTestUser({ email: 'blk-like-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)

    expect(await isBlockedEitherWay(profileAId, profileBId)).toBe(false)
    await blockProfile(profileAId, profileBId)
    expect(await isBlockedEitherWay(profileAId, profileBId)).toBe(true)
    expect(await isBlockedEitherWay(profileBId, profileAId)).toBe(true)

    const res = await request(app).post(`/api/discovery/${profileAId}/like`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
    expect(res.status).toBe(400)
  })

  it('the blocked target is never notified', async () => {
    const userA = await createTestUser({ email: 'blk-notify-a@test.com' })
    const userB = await createTestUser({ email: 'blk-notify-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)

    await blockProfile(profileAId, profileBId)

    const notifications = await (prisma as any).notification.findMany({ where: { userId: userB.id } })
    const blockNotifications = notifications.filter((n: any) => n.type.toLowerCase().includes('block'))
    expect(blockNotifications.length).toBe(0)
  })
})

describe('BlockService — shared Private Room policy', () => {
  it('safety-locks a 2-person room when the blocker+blocked are its only members', async () => {
    const userA = await createTestUser({ email: 'blk-room2-a@test.com' })
    const userB = await createTestUser({ email: 'blk-room2-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)

    const room = await (prisma as any).privateRoom.create({
      data: {
        roomType: 'INDIVIDUAL_PAIR', status: 'ACTIVE',
        members: { create: [
          { userId: userA.id, role: 'MEMBER', status: 'ACCEPTED' },
          { userId: userB.id, role: 'MEMBER', status: 'ACCEPTED' },
        ]}
      }
    })

    await blockProfile(profileAId, profileBId)

    const updated = await (prisma as any).privateRoom.findUnique({ where: { id: room.id } })
    expect(updated.status).toBe('SAFETY_LOCKED')
    expect(updated.safetyLockedAt).not.toBeNull()
  })

  it('only the blocker leaves a 3+-person room — the room stays ACTIVE for everyone else', async () => {
    const userA = await createTestUser({ email: 'blk-room3-a@test.com' })
    const userB = await createTestUser({ email: 'blk-room3-b@test.com' })
    const userC = await createTestUser({ email: 'blk-room3-c@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    await createTestProfile(userC.id)

    const room = await (prisma as any).privateRoom.create({
      data: {
        roomType: 'CUSTOM', status: 'ACTIVE',
        members: { create: [
          { userId: userA.id, role: 'OWNER', status: 'ACCEPTED' },
          { userId: userB.id, role: 'MEMBER', status: 'ACCEPTED' },
          { userId: userC.id, role: 'MEMBER', status: 'ACCEPTED' },
        ]}
      }
    })

    await blockProfile(profileAId, profileBId)

    const updated = await (prisma as any).privateRoom.findUnique({ where: { id: room.id } })
    expect(updated.status).toBe('ACTIVE') // room NOT closed/locked for the group

    const memberA = await (prisma as any).privateRoomMember.findFirst({ where: { privateRoomId: room.id, userId: userA.id } })
    expect(memberA.leftAt).not.toBeNull() // blocker left

    const memberB = await (prisma as any).privateRoomMember.findFirst({ where: { privateRoomId: room.id, userId: userB.id } })
    expect(memberB.leftAt).toBeNull() // blocked target was NOT force-removed

    const memberC = await (prisma as any).privateRoomMember.findFirst({ where: { privateRoomId: room.id, userId: userC.id } })
    expect(memberC.leftAt).toBeNull() // third member untouched
  })
})
