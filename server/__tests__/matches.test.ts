import request from 'supertest'
import app from './app'
import { createTestUser, createTestProfile, createTestMatch } from './helpers'

describe('Matches — message authorization', () => {
  it('member can read messages', async () => {
    const userA = await createTestUser({ email: 'ma@test.com' })
    const userB = await createTestUser({ email: 'mb@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const res = await request(app).get(`/api/matches/${match.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.messages)).toBe(true)
  })

  it('non-member cannot read messages', async () => {
    const userA = await createTestUser({ email: 'mc@test.com' })
    const userB = await createTestUser({ email: 'md@test.com' })
    const outsider = await createTestUser({ email: 'me@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const res = await request(app).get(`/api/matches/${match.id}/messages`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
    expect(res.status).toBe(403)
  })

  it('non-member cannot send messages', async () => {
    const userA = await createTestUser({ email: 'mf@test.com' })
    const userB = await createTestUser({ email: 'mg@test.com' })
    const outsider = await createTestUser({ email: 'mh@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const res = await request(app).post(`/api/matches/${match.id}/messages`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ body: 'hello' })
    expect(res.status).toBe(403)
  })

  it('member can send a message', async () => {
    const userA = await createTestUser({ email: 'mi@test.com' })
    const userB = await createTestUser({ email: 'mj@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const res = await request(app).post(`/api/matches/${match.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ body: 'Hello there!' })
    expect(res.status).toBe(201)
    expect(res.body.body).toBe('Hello there!')
  })

  it('blocked match prevents sending', async () => {
    const { prisma } = await import('./helpers')
    const userA = await createTestUser({ email: 'mk@test.com' })
    const userB = await createTestUser({ email: 'ml@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    await prisma.match.update({ where: { id: match.id }, data: { status: 'BLOCKED' } })

    const res = await request(app).post(`/api/matches/${match.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ body: 'This should fail' })
    expect(res.status).toBe(403)
  })
})
