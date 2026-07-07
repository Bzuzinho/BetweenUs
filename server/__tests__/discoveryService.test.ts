// 5.12 — DiscoveryService (5.2/5.3): blocked (both directions), invisible,
// pending (non-approved) profile, intention conflict, hard boundary
// conflict, travel mode. DB-backed since this is the pipeline that
// actually queries/filters real data.
import { getCandidates } from '../src/lib/discoveryService'
import { createTestUser, createTestProfile, prisma } from './helpers'

async function withPhoto(profileId: string) {
  await prisma.profilePhoto.create({
    data: { profileId, storagePath: `test/${profileId}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' }
  })
}

describe('DiscoveryService.getCandidates', () => {
  it('excludes a candidate the viewer has blocked, and a candidate that blocked the viewer (both directions)', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer1@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)

    const blockedByMe = await createTestUser({ email: 'disc-blocked-by-me@test.com' })
    const blockedByMeId = await createTestProfile(blockedByMe.id)
    await withPhoto(blockedByMeId)
    await prisma.profileAction.create({ data: { actorProfileId: viewerProfileId, targetProfileId: blockedByMeId, action: 'BLOCK' } })

    const blockedMe = await createTestUser({ email: 'disc-blocked-me@test.com' })
    const blockedMeId = await createTestProfile(blockedMe.id)
    await withPhoto(blockedMeId)
    // 5.3 fix: candidate blocked the VIEWER, viewer never blocked back
    await prisma.profileAction.create({ data: { actorProfileId: blockedMeId, targetProfileId: viewerProfileId, action: 'BLOCK' } })

    const visible = await createTestUser({ email: 'disc-visible1@test.com' })
    const visibleId = await createTestProfile(visible.id)
    await withPhoto(visibleId)

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    const ids = result.items.map(i => i.profile.id)
    expect(ids).not.toContain(blockedByMeId)
    expect(ids).not.toContain(blockedMeId)
    expect(ids).toContain(visibleId)
  })

  it('excludes a profile with invisibleMode on', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer2@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)

    const invisibleUser = await createTestUser({ email: 'disc-invisible@test.com' })
    const invisibleId = await createTestProfile(invisibleUser.id)
    await withPhoto(invisibleId)
    await prisma.privacySettings.update({ where: { profileId: invisibleId }, data: { invisibleMode: true } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(invisibleId)
  })

  it('excludes a profile that is not APPROVED (still pending review)', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer3@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)

    const pendingUser = await createTestUser({ email: 'disc-pending@test.com' })
    const pendingId = await createTestProfile(pendingUser.id, { status: 'PENDING_REVIEW' })
    await withPhoto(pendingId)

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(pendingId)
  })

  it('excludes a candidate with an explicit intention conflict', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer4@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)
    const intention = await prisma.intention.create({ data: { name: 'Polyamory', slug: `poly_${Date.now()}` } })
    await prisma.profileIntention.create({ data: { profileId: viewerProfileId, intentionId: intention.id, preference: 'YES' } })

    const conflicting = await createTestUser({ email: 'disc-conflict-intent@test.com' })
    const conflictingId = await createTestProfile(conflicting.id)
    await withPhoto(conflictingId)
    await prisma.profileIntention.create({ data: { profileId: conflictingId, intentionId: intention.id, preference: 'NO' } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(conflictingId)
  })

  it('excludes a candidate with a hard boundary conflict', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer5@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)
    const boundary = await prisma.boundary.create({ data: { name: 'No couples', slug: `no_couples_${Date.now()}`, category: 'relationship_type', isHardBoundary: true } })
    await prisma.profileBoundary.create({ data: { profileId: viewerProfileId, boundaryId: boundary.id, preference: 'NO' } })

    const conflicting = await createTestUser({ email: 'disc-conflict-bound@test.com' })
    const conflictingId = await createTestProfile(conflicting.id)
    await withPhoto(conflictingId)
    await prisma.profileBoundary.create({ data: { profileId: conflictingId, boundaryId: boundary.id, preference: 'YES' } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(conflictingId)
  })

  it('a candidate on active travel to the viewer\'s city gets a location boost and TRAVEL_OVERLAP reason', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer6@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await prisma.profile.update({ where: { id: viewerProfileId }, data: { city: 'Lisboa' } })
    await withPhoto(viewerProfileId)

    const traveler = await createTestUser({ email: 'disc-traveler@test.com' })
    const travelerId = await createTestProfile(traveler.id)
    await prisma.profile.update({ where: { id: travelerId }, data: { city: 'Porto' } })
    await withPhoto(travelerId)
    await prisma.travelMode.create({
      data: { profileId: travelerId, city: 'Lisboa', startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000), active: true }
    })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    const item = result.items.find(i => i.profile.id === travelerId)
    expect(item).toBeDefined()
    expect(item!.compatibility.location).toBe(100)
    expect(item!.reasons.some(r => r.toLowerCase().includes('travel'))).toBe(true)
  })

  it('a candidate missing a photo is excluded (4.9 completeness gate)', async () => {
    const viewer = await createTestUser({ email: 'disc-viewer7@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)

    const noPhotoUser = await createTestUser({ email: 'disc-nophoto@test.com' })
    const noPhotoId = await createTestProfile(noPhotoUser.id)
    // deliberately no withPhoto() call here

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(noPhotoId)
  })
})
