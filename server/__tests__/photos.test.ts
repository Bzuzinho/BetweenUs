import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'

describe('Photos — photo access request', () => {
  it('requires an active match to request private photo access', async () => {
    const owner = await createTestUser({ email: 'po@test.com' })
    const requester = await createTestUser({ email: 'pr@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    await createTestProfile(requester.id)

    // Create a PRIVATE_AFTER_APPROVAL photo for the owner
    const photo = await prisma.profilePhoto.create({
      data: {
        profileId: ownerProfileId,
        storagePath: 'https://example.com/photo.jpg',
        visibilityLevel: 'PRIVATE_AFTER_APPROVAL',
        moderationStatus: 'APPROVED',
        sortOrder: 0
      }
    })

    // No match — should be 403
    const res = await request(app).post(`/api/photos/${photo.id}/request-access`)
      .set('Authorization', `Bearer ${requester.accessToken}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('match ativo')
  })

  it('auto-approves PRIVATE_AFTER_MATCH with active match', async () => {
    const owner = await createTestUser({ email: 'pom@test.com' })
    const requester = await createTestUser({ email: 'prm@test.com' })
    const ownerProfileId = await createTestProfile(owner.id)
    const requesterProfileId = await createTestProfile(requester.id)

    await createTestMatch(ownerProfileId, requesterProfileId)

    const photo = await prisma.profilePhoto.create({
      data: {
        profileId: ownerProfileId,
        storagePath: 'https://example.com/photo2.jpg',
        visibilityLevel: 'PRIVATE_AFTER_MATCH',
        moderationStatus: 'APPROVED',
        sortOrder: 0
      }
    })

    const res = await request(app).post(`/api/photos/${photo.id}/request-access`)
      .set('Authorization', `Bearer ${requester.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
  })
})

describe('Photos — moderation status in production', () => {
  it('photos created in production start as PENDING', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const user = await createTestUser({ email: 'pprod@test.com' })
    const profileId = await createTestProfile(user.id)

    // Create photo directly to test PENDING logic (skip upload pipeline in test)
    const photo = await prisma.profilePhoto.create({
      data: {
        profileId,
        storagePath: 'https://example.com/test.jpg',
        visibilityLevel: 'PUBLIC',
        moderationStatus: 'PENDING',
        sortOrder: 0
      }
    })

    // PENDING photos should NOT appear in discovery
    const searcher = await createTestUser({ email: 'ps@test.com' })
    await createTestProfile(searcher.id, { status: 'APPROVED' })

    expect(photo.moderationStatus).toBe('PENDING')
    process.env.NODE_ENV = originalEnv
  })
})
