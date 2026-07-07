// 7.12 — Private Room lifecycle end to end through the real HTTP routes:
// WAITING_CONSENT blocks sending, all-approve flips to ACTIVE, ACTIVE
// allows sending, a material rule change re-opens consent, temporary
// message expiry + the cleanup job, and Safe Exit's "leave room".
import request from 'supertest'
import app from './app'
import { cleanupExpiredMessages } from '../src/jobs/cleanupExpiredMessages'
import { createTestUser, createTestProfile, prisma } from './helpers'

const setupIndividualPairRoom = async (emailA: string, emailB: string) => {
  const userA = await createTestUser({ email: emailA })
  const userB = await createTestUser({ email: emailB })
  const profileA = await createTestProfile(userA.id)
  const profileB = await createTestProfile(userB.id)
  const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })
  const { createFromMatch } = await import('../src/lib/privateRoomService')
  const { room } = await createFromMatch(match.id)
  return { userA, userB, room }
}

describe('Private Room lifecycle (HTTP)', () => {
  it('WAITING_CONSENT rejects new messages with 403', async () => {
    const { userA, room } = await setupIndividualPairRoom('lc-a1@test.com', 'lc-b1@test.com')
    expect(room.status).toBe('WAITING_CONSENT')

    const res = await request(app).post(`/api/rooms/${room.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ body: 'Olá?' })
    expect(res.status).toBe(403)
  })

  it('once every active member accepts the rule set, the room becomes ACTIVE and accepts messages', async () => {
    const { userA, userB, room } = await setupIndividualPairRoom('lc-a2@test.com', 'lc-b2@test.com')

    const firstAccept = await request(app).post(`/api/rooms/${room.id}/rules/accept`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(firstAccept.status).toBe(200)
    expect(firstAccept.body.roomStatus).toBe('WAITING_CONSENT') // still waiting on userB

    const secondAccept = await request(app).post(`/api/rooms/${room.id}/rules/accept`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
    expect(secondAccept.status).toBe(200)
    expect(secondAccept.body.roomStatus).toBe('ACTIVE')

    const sendRes = await request(app).post(`/api/rooms/${room.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ body: 'Agora já dá para falar.' })
    expect(sendRes.status).toBe(201)
    expect(sendRes.body.body).toBe('Agora já dá para falar.')
  })

  it('a material rule change moves an ACTIVE room back to WAITING_CONSENT and blocks sending until everyone re-accepts', async () => {
    const { userA, userB, room } = await setupIndividualPairRoom('lc-a3@test.com', 'lc-b3@test.com')
    await request(app).post(`/api/rooms/${room.id}/rules/accept`).set('Authorization', `Bearer ${userA.accessToken}`)
    await request(app).post(`/api/rooms/${room.id}/rules/accept`).set('Authorization', `Bearer ${userB.accessToken}`)

    const proposeRes = await request(app).post(`/api/rooms/${room.id}/rules`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ rules: [{ ruleType: 'MEETING', label: 'Novo encontro só depois de videochamada.' }] })
    expect(proposeRes.status).toBe(201)
    expect(proposeRes.body.roomStatus).toBe('WAITING_CONSENT')

    const blockedSend = await request(app).post(`/api/rooms/${room.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ body: 'Ainda consigo enviar?' })
    expect(blockedSend.status).toBe(403)

    await request(app).post(`/api/rooms/${room.id}/rules/accept`).set('Authorization', `Bearer ${userA.accessToken}`)
    const finalAccept = await request(app).post(`/api/rooms/${room.id}/rules/accept`).set('Authorization', `Bearer ${userB.accessToken}`)
    expect(finalAccept.body.roomStatus).toBe('ACTIVE')

    // the superseded v1 rule set is no longer the active one
    const ruleSets = await (prisma as any).roomRuleSet.findMany({ where: { roomId: room.id }, orderBy: { version: 'asc' } })
    expect(ruleSets).toHaveLength(2)
    expect(ruleSets[0].status).toBe('SUPERSEDED')
    expect(ruleSets[1].status).toBe('ACTIVE')
  })

  it('a message with a temporary TTL gets expiresAt set and is soft-deleted by the cleanup job once past due', async () => {
    const { userA, userB, room } = await setupIndividualPairRoom('lc-a4@test.com', 'lc-b4@test.com')
    await request(app).post(`/api/rooms/${room.id}/rules/accept`).set('Authorization', `Bearer ${userA.accessToken}`)
    await request(app).post(`/api/rooms/${room.id}/rules/accept`).set('Authorization', `Bearer ${userB.accessToken}`)

    const sendRes = await request(app).post(`/api/rooms/${room.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ body: 'Isto vai desaparecer.', ttl: 'ONE_HOUR' })
    expect(sendRes.status).toBe(201)
    expect(sendRes.body.expiresAt).not.toBeNull()

    // Force it into the past directly (bypassing the 1-hour real wait) to
    // exercise the cleanup job's actual query/update logic.
    await (prisma as any).roomMessage.update({ where: { id: sendRes.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } })

    const { deletedRoomMessages } = await cleanupExpiredMessages()
    expect(deletedRoomMessages).toBeGreaterThanOrEqual(1)

    const messagesRes = await request(app).get(`/api/rooms/${room.id}/messages`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(messagesRes.body.messages.find((m: any) => m.id === sendRes.body.id)).toBeUndefined() // soft-deleted, excluded from the feed
  })

  it('Safe Exit — leaving a room sets leftAt and the member loses further access', async () => {
    const { userA, userB, room } = await setupIndividualPairRoom('lc-a5@test.com', 'lc-b5@test.com')

    const leaveRes = await request(app).delete(`/api/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(leaveRes.status).toBe(200)

    const getRes = await request(app).get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(getRes.status).toBe(403)

    // the other member is unaffected, but the room auto-closes once
    // nobody with ACCEPTED status remains (not the case here, userB stays)
    const getResB = await request(app).get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
    expect(getResB.status).toBe(200)
  })
})
