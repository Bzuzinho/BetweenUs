// 3.9 — integration tests for 3.1/3.2's signed-media wiring in profiles.ts.
// Also covers the real bug this sprint fixed: GET /profiles/:id used to
// filter photos to visibilityLevel:'PUBLIC' only, so BLURRED/
// PRIVATE_AFTER_MATCH/PRIVATE_AFTER_APPROVAL photos never reached the
// client at all — not even blurred.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'

describe('GET /api/profiles/:id — photo visibility tiers', () => {
  it('a PENDING (unmoderated) photo is never returned to a stranger', async () => {
    const owner = await createTestUser({ email: 'media-owner1@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const viewer = await createTestUser({ email: 'media-viewer1@test.com' })
    await createTestProfile(viewer.id)

    await prisma.profilePhoto.create({
      data: { profileId: ownerProfileId, storagePath: 'photos/clean.jpg', blurredPath: 'photos/blurred.jpg', visibilityLevel: 'PUBLIC', moderationStatus: 'PENDING', sortOrder: 0 }
    })

    const res = await request(app).get(`/api/profiles/${ownerProfileId}`).set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.photos).toHaveLength(0)
  })

  it('BLURRED photos now reach a stranger viewer (regression: used to be filtered out entirely)', async () => {
    const owner = await createTestUser({ email: 'media-owner2@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const viewer = await createTestUser({ email: 'media-viewer2@test.com' })
    await createTestProfile(viewer.id)

    await prisma.profilePhoto.create({
      data: { profileId: ownerProfileId, storagePath: 'photos/clean.jpg', blurredPath: 'photos/blurred.jpg', visibilityLevel: 'BLURRED', moderationStatus: 'APPROVED', sortOrder: 0 }
    })

    const res = await request(app).get(`/api/profiles/${ownerProfileId}`).set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.photos).toHaveLength(1)
    expect(res.body.photos[0].accessLevel).toBe('BLURRED')
  })

  it('PRIVATE_AFTER_MATCH resolves to CLEAN once an active match exists', async () => {
    const owner = await createTestUser({ email: 'media-owner3@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const viewer = await createTestUser({ email: 'media-viewer3@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await createTestMatch(ownerProfileId, viewerProfileId)

    await prisma.profilePhoto.create({
      data: { profileId: ownerProfileId, storagePath: 'photos/clean.jpg', blurredPath: 'photos/blurred.jpg', visibilityLevel: 'PRIVATE_AFTER_MATCH', moderationStatus: 'APPROVED', sortOrder: 0 }
    })

    const res = await request(app).get(`/api/profiles/${ownerProfileId}`).set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.photos[0].accessLevel).toBe('CLEAN')
  })

  it('PRIVATE_AFTER_APPROVAL stays BLURRED without a match (match alone must not unlock it)', async () => {
    const owner = await createTestUser({ email: 'media-owner4@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const viewer = await createTestUser({ email: 'media-viewer4@test.com' })
    const viewerProfileId = await createTestProfile(viewer.id)
    await createTestMatch(ownerProfileId, viewerProfileId)

    await prisma.profilePhoto.create({
      data: { profileId: ownerProfileId, storagePath: 'photos/clean.jpg', blurredPath: 'photos/blurred.jpg', visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'APPROVED', sortOrder: 0 }
    })

    const res = await request(app).get(`/api/profiles/${ownerProfileId}`).set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.body.photos[0].accessLevel).toBe('BLURRED')
  })
})

describe('GET /api/photos/me', () => {
  it('owner sees their own photo as CLEAN even while it is still PENDING moderation', async () => {
    const owner = await createTestUser({ email: 'media-owner5@test.com' })
    const profileId = await createTestProfile(owner.id)
    await prisma.profilePhoto.create({
      data: { profileId, storagePath: 'photos/clean.jpg', blurredPath: 'photos/blurred.jpg', visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'PENDING', sortOrder: 0 }
    })

    const res = await request(app).get('/api/photos/me').set('Authorization', `Bearer ${owner.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.photos).toHaveLength(1)
    expect(res.body.photos[0].storagePath).toBeTruthy()
  })
})
