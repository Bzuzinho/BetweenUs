// 8.12 — HTTP-level membership/expiry validation for /api/consent, updated
// for the 8.2 request+response model. Deeper aggregation scenarios (who
// counts as required, silence vs accepted, revoke, expiry, new members)
// are covered at the service level in consentCheckService.test.ts —
// that's a deliberate split, not a duplication: this file only checks the
// HTTP layer's own responsibilities (auth, membership, status codes).
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'

describe('Consent — membership validation (HTTP)', () => {
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
    // 8.2 — created with PENDING responses for required participants, not
    // a single global status pre-set to anything but PENDING.
    expect(res.body.consentCheck.status).toBe('PENDING')
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

    const res = await request(app).post('/api/consent/check')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ matchId: match.id, phase: 'CHAT' })
    const checkId = res.body.consentCheck.id

    const respondRes = await request(app).put(`/api/consent/check/${checkId}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ status: 'ACCEPTED' })
    expect(respondRes.status).toBe(403)
  })

  it('expired consent check cannot be accepted', async () => {
    const userA = await createTestUser({ email: 'ci@test.com' })
    const userB = await createTestUser({ email: 'cj@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const check = await prisma.consentCheck.create({
      data: {
        matchId: match.id, phase: 'CHAT',
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

  it('a NOT_YET answer is accepted and does not close the check', async () => {
    const userA = await createTestUser({ email: 'ck@test.com' })
    const userB = await createTestUser({ email: 'cl@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const create = await request(app).post('/api/consent/check')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ matchId: match.id, phase: 'CHAT' })
    const checkId = create.body.consentCheck.id

    const res = await request(app).put(`/api/consent/check/${checkId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ status: 'NOT_YET' })
    expect(res.status).toBe(200)
    expect(res.body.consentCheck.status).toBe('PENDING')
    expect(res.body.allAccepted).toBe(false)
  })

  it('cannot revoke a response that was never accepted', async () => {
    const userA = await createTestUser({ email: 'cm@test.com' })
    const userB = await createTestUser({ email: 'cn@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const create = await request(app).post('/api/consent/check')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ matchId: match.id, phase: 'CHAT' })
    const checkId = create.body.consentCheck.id

    const res = await request(app).post(`/api/consent/check/${checkId}/revoke`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(res.status).toBe(400)
  })
})
