// 6.11 — Couple Travel Approval (6.7), through the real HTTP routes.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'

const createActiveCouple = async (emailA: string, emailB: string) => {
  const userA = await createTestUser({ email: emailA })
  const userB = await createTestUser({ email: emailB })
  const profileId = await createTestProfile(userA.id, { type: 'COUPLE' })
  await prisma.coupleProfile.create({
    data: { profileId, partnerOneUserId: userA.id, partnerTwoUserId: userB.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
  })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userA.id, isCreator: true, status: 'ACCEPTED' } })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userB.id, isCreator: false, status: 'ACCEPTED' } })
  return { userA, userB, profileId }
}

describe('Couple Travel Approval (6.7)', () => {
  it('an individual proposing travel activates immediately (single member auto-satisfies)', async () => {
    const user = await createTestUser({ email: 'travel-ind@test.com' })
    await createTestProfile(user.id)

    const res = await request(app).post('/api/travel')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ city: 'Lisboa', startDate: '2026-08-01', endDate: '2026-08-10' })

    expect(res.status).toBe(201)
    expect(res.body.travelMode.status).toBe('SCHEDULED')
    expect(res.body.travelMode.active).toBe(true)
  })

  it('a couple proposing travel enters WAITING_MEMBER_APPROVAL and stays inactive until the other partner approves', async () => {
    const { userA, userB } = await createActiveCouple('travel-couple-a1@test.com', 'travel-couple-b1@test.com')

    const proposeRes = await request(app).post('/api/travel')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ city: 'Porto', startDate: '2026-09-01', endDate: '2026-09-10' })
    expect(proposeRes.status).toBe(201)
    expect(proposeRes.body.travelMode.status).toBe('WAITING_MEMBER_APPROVAL')
    expect(proposeRes.body.travelMode.active).toBe(false)
    const travelId = proposeRes.body.travelMode.id

    // Still not scheduled before the partner approves
    const meBeforeRes = await request(app).get('/api/travel/me')
      .set('Authorization', `Bearer ${userA.accessToken}`)
    const beforeApproval = meBeforeRes.body.travelModes.find((t: any) => t.id === travelId)
    expect(beforeApproval.status).toBe('WAITING_MEMBER_APPROVAL')

    // Partner B approves -> now SCHEDULED and active
    const approveRes = await request(app).post(`/api/travel/${travelId}/approve`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
    expect(approveRes.status).toBe(200)
    expect(approveRes.body.travelMode.status).toBe('SCHEDULED')
    expect(approveRes.body.travelMode.active).toBe(true)
  })

  it('a stranger cannot approve a couple\'s travel proposal', async () => {
    const { userA } = await createActiveCouple('travel-couple-a2@test.com', 'travel-couple-b2@test.com')
    const outsider = await createTestUser({ email: 'travel-outsider@test.com' })

    const proposeRes = await request(app).post('/api/travel')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ city: 'Faro', startDate: '2026-10-01', endDate: '2026-10-05' })
    const travelId = proposeRes.body.travelMode.id

    const approveRes = await request(app).post(`/api/travel/${travelId}/approve`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
    expect(approveRes.status).toBe(403)
  })
})
