// 10.14 — Circles: admin-only creation (10.11), join request flow, PRIVATE
// circles staying out of the public browse list, and membership privacy
// (10.12 — showCircleBadge/hideCircleMemberships gate the badge route).
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'

describe('Circles — admin-curated only (10.11)', () => {
  it('a non-admin cannot create a Circle', async () => {
    const user = await createTestUser({ email: 'circ-nonadmin@test.com' })
    const res = await request(app).post('/api/circles/admin')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Círculo Não Autorizado' })
    expect(res.status).toBe(403)
  })

  it('there is no public POST /api/circles route at all', async () => {
    const user = await createTestUser({ email: 'circ-nopublic@test.com' })
    const res = await request(app).post('/api/circles')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Tentativa' })
    // Express falls through to 404 — no user-facing creation route exists.
    expect(res.status).toBe(404)
  })

  it('an admin can create a Circle and it gets a unique slug', async () => {
    const admin = await createTestUser({ email: 'circ-admin@test.com', adminRole: 'ADMIN' })
    const res = await request(app).post('/api/circles/admin')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Círculo de Lisboa', visibility: 'DISCOVERABLE', status: 'ACTIVE' })
    expect(res.status).toBe(201)
    expect(res.body.slug).toBeTruthy()
    expect(res.body.createdByAdminId).toBe(admin.id)
  })
})

describe('Circles — join flow', () => {
  it('a user can request to join a DISCOVERABLE/ACTIVE circle', async () => {
    const admin = await createTestUser({ email: 'circ-admin-join@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-join-test', name: 'Circulo Join', visibility: 'DISCOVERABLE', status: 'ACTIVE', createdByAdminId: admin.id }
    })

    const user = await createTestUser({ email: 'circ-joiner@test.com' })
    await createTestProfile(user.id)

    const res = await request(app).post(`/api/circles/${circle.slug}/join`)
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('REQUESTED')
  })

  it('cannot self-join an INVITE_ONLY circle', async () => {
    const admin = await createTestUser({ email: 'circ-admin-invite@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-invite-test', name: 'Circulo Invite', visibility: 'INVITE_ONLY', status: 'ACTIVE', createdByAdminId: admin.id }
    })

    const user = await createTestUser({ email: 'circ-invite-joiner@test.com' })
    await createTestProfile(user.id)

    const res = await request(app).post(`/api/circles/${circle.slug}/join`)
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(400)
  })

  it('a local moderator can approve a join request', async () => {
    const admin = await createTestUser({ email: 'circ-admin-approve@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-approve-test', name: 'Circulo Approve', visibility: 'DISCOVERABLE', status: 'ACTIVE', createdByAdminId: admin.id }
    })

    const mod = await createTestUser({ email: 'circ-mod@test.com' })
    const modProfileId = await createTestProfile(mod.id)
    await (prisma as any).circleMembership.create({
      data: { circleId: circle.id, profileId: modProfileId, status: 'APPROVED', role: 'LOCAL_MODERATOR' }
    })

    const joiner = await createTestUser({ email: 'circ-joiner2@test.com' })
    const joinerProfileId = await createTestProfile(joiner.id)
    const membership = await (prisma as any).circleMembership.create({
      data: { circleId: circle.id, profileId: joinerProfileId, status: 'REQUESTED' }
    })

    const res = await request(app).post(`/api/circles/${circle.slug}/members/${membership.id}/approve`)
      .set('Authorization', `Bearer ${mod.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
  })

  it('a plain member (not a moderator) cannot approve a join request', async () => {
    const admin = await createTestUser({ email: 'circ-admin-approve2@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-approve2-test', name: 'Circulo Approve2', visibility: 'DISCOVERABLE', status: 'ACTIVE', createdByAdminId: admin.id }
    })

    const plainMember = await createTestUser({ email: 'circ-plain@test.com' })
    const plainProfileId = await createTestProfile(plainMember.id)
    await (prisma as any).circleMembership.create({
      data: { circleId: circle.id, profileId: plainProfileId, status: 'APPROVED', role: 'MEMBER' }
    })

    const joiner = await createTestUser({ email: 'circ-joiner3@test.com' })
    const joinerProfileId = await createTestProfile(joiner.id)
    const membership = await (prisma as any).circleMembership.create({
      data: { circleId: circle.id, profileId: joinerProfileId, status: 'REQUESTED' }
    })

    const res = await request(app).post(`/api/circles/${circle.slug}/members/${membership.id}/approve`)
      .set('Authorization', `Bearer ${plainMember.accessToken}`)
    expect(res.status).toBe(400)
  })
})

describe('Circles — PRIVATE visibility', () => {
  it('a PRIVATE circle does not appear in the public browse list', async () => {
    const admin = await createTestUser({ email: 'circ-admin-priv@test.com', adminRole: 'ADMIN' })
    await (prisma as any).circle.create({
      data: { slug: 'circulo-privado-test', name: 'Círculo Privado', visibility: 'PRIVATE', status: 'ACTIVE', createdByAdminId: admin.id }
    })

    const user = await createTestUser({ email: 'circ-browser@test.com' })
    const res = await request(app).get('/api/circles')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.body.circles.find((c: any) => c.slug === 'circulo-privado-test')).toBeUndefined()
  })

  it('a PRIVATE circle is still reachable directly by slug', async () => {
    const admin = await createTestUser({ email: 'circ-admin-priv2@test.com', adminRole: 'ADMIN' })
    await (prisma as any).circle.create({
      data: { slug: 'circulo-privado-direct-test', name: 'Círculo Privado Direto', visibility: 'PRIVATE', status: 'ACTIVE', createdByAdminId: admin.id }
    })

    const user = await createTestUser({ email: 'circ-direct@test.com' })
    const res = await request(app).get('/api/circles/circulo-privado-direct-test')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(200)
  })
})

describe('Circles — membership privacy (10.12)', () => {
  it('hides badge by default (hideCircleMemberships/showCircleBadge both unset)', async () => {
    const admin = await createTestUser({ email: 'circ-admin-badge@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-badge-test', name: 'Circulo Badge', visibility: 'DISCOVERABLE', status: 'ACTIVE', createdByAdminId: admin.id }
    })
    const member = await createTestUser({ email: 'circ-badge-member@test.com' })
    const memberProfileId = await createTestProfile(member.id)
    await (prisma as any).circleMembership.create({ data: { circleId: circle.id, profileId: memberProfileId, status: 'APPROVED' } })

    const viewer = await createTestUser({ email: 'circ-badge-viewer@test.com' })
    const res = await request(app).get(`/api/circles/badge/${memberProfileId}`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.body.circles).toEqual([])
  })

  it('shows badge once showCircleBadge is explicitly enabled', async () => {
    const admin = await createTestUser({ email: 'circ-admin-badge2@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-badge2-test', name: 'Circulo Badge2', visibility: 'DISCOVERABLE', status: 'ACTIVE', createdByAdminId: admin.id }
    })
    const member = await createTestUser({ email: 'circ-badge2-member@test.com' })
    const memberProfileId = await createTestProfile(member.id)
    await (prisma as any).circleMembership.create({ data: { circleId: circle.id, profileId: memberProfileId, status: 'APPROVED' } })
    await (prisma as any).privacySettings.update({ where: { profileId: memberProfileId }, data: { showCircleBadge: true } })

    const viewer = await createTestUser({ email: 'circ-badge2-viewer@test.com' })
    const res = await request(app).get(`/api/circles/badge/${memberProfileId}`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.body.circles.length).toBe(1)
    expect(res.body.circles[0].slug).toBe('circulo-badge2-test')
  })

  it('hideCircleMemberships wins even if showCircleBadge is true', async () => {
    const admin = await createTestUser({ email: 'circ-admin-badge3@test.com', adminRole: 'ADMIN' })
    const circle = await (prisma as any).circle.create({
      data: { slug: 'circulo-badge3-test', name: 'Circulo Badge3', visibility: 'DISCOVERABLE', status: 'ACTIVE', createdByAdminId: admin.id }
    })
    const member = await createTestUser({ email: 'circ-badge3-member@test.com' })
    const memberProfileId = await createTestProfile(member.id)
    await (prisma as any).circleMembership.create({ data: { circleId: circle.id, profileId: memberProfileId, status: 'APPROVED' } })
    await (prisma as any).privacySettings.update({ where: { profileId: memberProfileId }, data: { showCircleBadge: true, hideCircleMemberships: true } })

    const viewer = await createTestUser({ email: 'circ-badge3-viewer@test.com' })
    const res = await request(app).get(`/api/circles/badge/${memberProfileId}`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.body.circles).toEqual([])
  })
})
