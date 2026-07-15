// Closed Beta audit — FASE 1.2: rooms.ts's signRoomPhotos() used to sign
// (and return) a match-derived Private Room member's CLEAN primary photo
// unconditionally, for any accepted room member, regardless of
// mediaAccessPolicy. Once a match is BLOCKED, blockService.ts SAFETY_LOCKs
// (does not close/remove members from) a room with <=2 active members —
// both parties stay as `members` with leftAt: null, by design, to preserve
// the room for reporting/evidence — so the blocked/revoked party kept
// seeing the other's clean photo via GET /api/rooms/:id even after the
// match that granted that access no longer exists.
//
// This proves the fix: signRoomPhotos() now runs match-derived rooms
// through resolvePhotoForViewer (mediaAccessService.ts), the same
// access-policy gate discovery/profiles/photos already use, so once the
// match backing the room is BLOCKED (hasActiveMatch becomes false), a
// PRIVATE_AFTER_MATCH photo downgrades from CLEAN to BLURRED for that
// viewer — exactly like it already does everywhere else in the app.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'
import { createFromMatch } from '../src/lib/privateRoomService'
import { blockProfile } from '../src/lib/blockService'

describe('Room photo access respects mediaAccessPolicy on match-derived rooms', () => {
  it('a member sees the CLEAN photo while matched, and only the BLURRED variant after the match is blocked', async () => {
    const owner = await createTestUser({ email: 'room-photo-owner@test.com' })
    const viewer = await createTestUser({ email: 'room-photo-viewer@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const viewerProfileId = await createTestProfile(viewer.id)

    const match = await createTestMatch(ownerProfileId, viewerProfileId)
    const { room } = await createFromMatch(match.id)

    // Storage isn't configured in the test env, so signMediaUrl()/
    // resolvePhotoForViewer() return the raw key unchanged (dev/placeholder
    // mode) — that's exactly what makes clean vs blurred distinguishable
    // here without needing a real R2 bucket.
    await prisma.profilePhoto.create({
      data: {
        profileId: ownerProfileId,
        storagePath: 'private/clean-key.jpg',
        blurredPath: 'private/blurred-key.jpg',
        visibilityLevel: 'PRIVATE_AFTER_MATCH',
        moderationStatus: 'APPROVED',
        isPrimary: true,
      }
    })

    const getOwnerPhotoUrl = async (): Promise<string | undefined> => {
      const res = await request(app).get(`/api/rooms/${room.id}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
      expect(res.status).toBe(200)
      const ownerMember = res.body.members.find((m: any) => m.userId === owner.id || m.user?.id === owner.id)
      return ownerMember?.user?.profile?.photos?.[0]?.storagePath
    }

    // While the match is ACTIVE, PRIVATE_AFTER_MATCH resolves to CLEAN.
    expect(await getOwnerPhotoUrl()).toBe('private/clean-key.jpg')

    // Block ends the match (BLOCKED) and, since this room has exactly 2
    // active members, SAFETY_LOCKs it rather than removing anyone — both
    // stay as accepted members, matching blockService.test.ts's documented
    // policy.
    await blockProfile(viewerProfileId, ownerProfileId)
    const lockedRoom = await (prisma as any).privateRoom.findUnique({ where: { id: room.id } })
    expect(lockedRoom.status).toBe('SAFETY_LOCKED')
    const ownerMembership = await (prisma as any).privateRoomMember.findFirst({ where: { privateRoomId: room.id, userId: owner.id } })
    expect(ownerMembership.leftAt).toBeNull() // still listed as a member — this is the exact stale-trust scenario

    // The photo must now come back BLURRED — not the clean key anymore —
    // even though both are still nominally "room members".
    expect(await getOwnerPhotoUrl()).toBe('private/blurred-key.jpg')
  })

  it('standalone (non-match) rooms are unaffected — members keep seeing each other\'s clean thumbnail', async () => {
    const userA = await createTestUser({ email: 'room-standalone-a@test.com' })
    const userB = await createTestUser({ email: 'room-standalone-b@test.com' })
    await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)

    await prisma.profilePhoto.create({
      data: {
        profileId: profileBId,
        storagePath: 'private/standalone-clean.jpg',
        visibilityLevel: 'PRIVATE_AFTER_MATCH', // would be BLURRED-without-a-match anywhere else
        moderationStatus: 'APPROVED',
        isPrimary: true,
      }
    })

    const room = await (prisma as any).privateRoom.create({
      data: {
        roomType: 'CUSTOM', status: 'ACTIVE',
        // matchId intentionally omitted — standalone room, original
        // trust-boundary behavior must be preserved unchanged.
        members: { create: [
          { userId: userA.id, role: 'OWNER', status: 'ACCEPTED' },
          { userId: userB.id, role: 'MEMBER', status: 'ACCEPTED' },
        ]}
      }
    })

    const res = await request(app).get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(res.status).toBe(200)
    const memberB = res.body.members.find((m: any) => m.userId === userB.id || m.user?.id === userB.id)
    // No matchId on the room -> signRoomPhotos keeps the pre-existing
    // trust-boundary behavior (no mediaAccessPolicy gate), unchanged.
    expect(memberB?.user?.profile?.photos?.[0]?.storagePath).toBe('private/standalone-clean.jpg')
  })
})
