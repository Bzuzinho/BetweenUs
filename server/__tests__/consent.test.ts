import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'

describe('Consent — membership validation', () => {
  it('member can create a consent check', async () => {
    const userA = await createTestUser({ email: 'ca@test.com' })
    const userB = await createTestUser({ email: 'cb@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const res = await request(app).post('/api/consent/check')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ matchId: match.id, phase: 'PHOTO_REQUEST' })
    expect(res.status).toBe(201)
    expect(res.body.consentCheck.phase).toBe('PHOTO_REQUEST')
  })

  it('non-member cannot create a consent check', async () => {
    const userA = await createTestUser({ email: 'cc@test.com' })
    const userB = await createTestUser({ email: 'cd@test.com' })
    const outsider = await createTestUser({ email: 'ce@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const res = await request(app).post('/api/consent/check')
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ matchId: match.id, phase: 'PHOTO_REQUEST' })
    expect(res.status).toBe(403)
  })

  it('non-member cannot respond to consent check', async () => {
    const userA = await createTestUser({ email: 'cf@test.com' })
    const userB = await createTestUser({ email: 'cg@test.com' })
    const outsider = await createTestUser({ email: 'ch@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const check = await prisma.consentCheck.create({
      data: {
        matchId: match.id, profileId: profileAId, phase: 'CHAT',
        status: 'PENDING', initiatedBy: userA.id,
        expiresAt: new Date(Date.now() + 60000)
      }
    })

    const res = await request(app).put(`/api/consent/check/${check.id}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ status: 'ACCEPTED' })
    expect(res.status).toBe(403)
  })

  it('expired consent check cannot be accepted', async () => {
    const userA = await createTestUser({ email: 'ci@test.com' })
    const userB = await createTestUser({ email: 'cj@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const check = await prisma.consentCheck.create({
      data: {
        matchId: match.id, profileId: profileAId, phase: 'CHAT',
        status: 'PENDING', initiatedBy: userA.id,
        // Already expired
        expiresAt: new Date(Date.now() - 1000)
      }
    })

    const res = await request(app).put(`/api/consent/check/${check.id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ status: 'ACCEPTED' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('expirou')
  })
})
