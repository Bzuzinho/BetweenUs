// 4.11 — Private interests (4.8): the core guarantee is that alignment is
// ONLY ever exposed as an aggregate count, never as the underlying list of
// which interests matched - for either party, with no future-consent
// escape hatch existing yet. HTTP-level since that guarantee lives in the
// route response shape, not just the service.
import request from 'supertest'
import app from './app'
import { createTestUser, createTestProfile, prisma } from './helpers'

describe('Private interests', () => {
  it('GET /me returns the caller\'s own full selections (label included) - seeing your own choices is fine', async () => {
    const user = await createTestUser({ email: 'pi-owner@test.com' })
    await createTestProfile(user.id, { type: 'INDIVIDUAL' })
    const interest = await (prisma as any).privateInterest.create({
      data: { slug: `roleplay_${Date.now()}`, label: 'Roleplay', active: true }
    })

    await request(app).put('/api/private-interests/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ selections: [{ interestId: interest.id, preference: 'YES' }] })

    const res = await request(app).get('/api/private-interests/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.selections).toHaveLength(1)
    expect(res.body.selections[0].interest.label).toBe('Roleplay')
  })

  it('GET /alignment/:profileId exposes ONLY an aggregate count, never which interests matched', async () => {
    const userA = await createTestUser({ email: 'pi-a@test.com' })
    const userB = await createTestUser({ email: 'pi-b@test.com' })
    const profileAId = await createTestProfile(userA.id, { type: 'INDIVIDUAL' })
    const profileBId = await createTestProfile(userB.id, { type: 'INDIVIDUAL' })

    const i1 = await (prisma as any).privateInterest.create({ data: { slug: `shared1_${Date.now()}`, label: 'Shared one', active: true } })
    const i2 = await (prisma as any).privateInterest.create({ data: { slug: `shared2_${Date.now()}`, label: 'Shared two', active: true } })
    const i3 = await (prisma as any).privateInterest.create({ data: { slug: `onlya_${Date.now()}`,   label: 'Only A',     active: true } })

    await (prisma as any).profilePrivateInterest.createMany({ data: [
      { profileId: profileAId, interestId: i1.id, preference: 'YES' },
      { profileId: profileAId, interestId: i2.id, preference: 'YES' },
      { profileId: profileAId, interestId: i3.id, preference: 'YES' },
    ]})
    await (prisma as any).profilePrivateInterest.createMany({ data: [
      { profileId: profileBId, interestId: i1.id, preference: 'YES' },
      { profileId: profileBId, interestId: i2.id, preference: 'YES' },
    ]})

    const res = await request(app).get(`/api/private-interests/alignment/${profileBId}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ alignedCount: 2 })
    // The two things that must never appear in this response, for either side:
    expect(res.body.selections).toBeUndefined()
    expect(res.body.matchedInterests).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('Shared one')
    expect(JSON.stringify(res.body)).not.toContain('Shared two')
  })

  it('inactive private interests are excluded from the public catalog listing', async () => {
    const user = await createTestUser({ email: 'pi-catalog@test.com' })
    const activeOne = await (prisma as any).privateInterest.create({ data: { slug: `pub_active_${Date.now()}`, label: 'Public active', active: true } })
    const inactiveOne = await (prisma as any).privateInterest.create({ data: { slug: `pub_inactive_${Date.now()}`, label: 'Public inactive', active: false } })

    const res = await request(app).get('/api/private-interests')
      .set('Authorization', `Bearer ${user.accessToken}`)
    const slugs = res.body.interests.map((i: any) => i.slug)
    expect(slugs).toContain(activeOne.slug)
    expect(slugs).not.toContain(inactiveOne.slug)
  })
})
