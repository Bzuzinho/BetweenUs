import request from 'supertest'
import app from './app'
import { createTestUser, createTestProfile } from './helpers'

describe('Admin — access control', () => {
  it('blocks unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/dashboard')
    expect(res.status).toBe(401)
  })

  it('blocks regular user from dashboard', async () => {
    const user = await createTestUser({ email: 'regular@test.com' })
    const res = await request(app).get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(403)
  })

  it('allows ADMIN to access dashboard', async () => {
    const admin = await createTestUser({ email: 'admin@test.com', adminRole: 'ADMIN' })
    const res = await request(app).get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.users).toBeDefined()
  })

  it('allows MODERATOR to access reports', async () => {
    const mod = await createTestUser({ email: 'mod@test.com', adminRole: 'MODERATOR' })
    const res = await request(app).get('/api/admin/reports')
      .set('Authorization', `Bearer ${mod.accessToken}`)
    expect(res.status).toBe(200)
  })

  it('blocks MODERATOR from subscriptions (no permission)', async () => {
    const mod = await createTestUser({ email: 'mod2@test.com', adminRole: 'MODERATOR' })
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${mod.accessToken}`)
    // MODERATOR has no 'users' permission
    expect(res.status).toBe(403)
  })

  it('blocks FINANCE from reports', async () => {
    const finance = await createTestUser({ email: 'finance@test.com', adminRole: 'FINANCE' })
    const res = await request(app).get('/api/admin/reports')
      .set('Authorization', `Bearer ${finance.accessToken}`)
    expect(res.status).toBe(403)
  })

  it('only SUPER_ADMIN can change user role', async () => {
    const admin = await createTestUser({ email: 'admin2@test.com', adminRole: 'ADMIN' })
    const target = await createTestUser({ email: 'target@test.com' })
    const res = await request(app).put(`/api/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ adminRole: 'MODERATOR' })
    expect(res.status).toBe(403)
  })
})

describe('Admin — users management', () => {
  it('lists users', async () => {
    const admin = await createTestUser({ email: 'admin3@test.com', adminRole: 'ADMIN' })
    await createTestUser({ email: 'listed@test.com' })
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.users)).toBe(true)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('suspends a user and creates AdminAction', async () => {
    const { prisma } = await import('./helpers')
    const admin = await createTestUser({ email: 'admin4@test.com', adminRole: 'ADMIN' })
    const target = await createTestUser({ email: 'tosuspend@test.com' })
    const res = await request(app).put(`/api/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'SUSPENDED', reason: 'Test suspension' })
    expect(res.status).toBe(200)

    const action = await prisma.adminAction.findFirst({
      where: { adminId: admin.id, action: 'SUSPENDED_USER', targetUserId: target.id }
    })
    expect(action).not.toBeNull()
    expect(action!.reason).toBe('Test suspension')
  })
})

describe('Admin — beta invites', () => {
  it('admin can create and list beta invites', async () => {
    const admin = await createTestUser({ email: 'admin5@test.com', adminRole: 'ADMIN' })
    const createRes = await request(app).post('/api/admin/beta/invites')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ maxUses: 1 })
    expect(createRes.status).toBe(200)
    expect(createRes.body.invite.code).toBeDefined()
    expect(createRes.body.inviteUrl).toContain('/join/')

    const listRes = await request(app).get('/api/admin/beta/invites')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.invites.length).toBeGreaterThan(0)
  })

  it('cannot delete an already-used invite', async () => {
    const { prisma } = await import('./helpers')
    const admin = await createTestUser({ email: 'admin6@test.com', adminRole: 'ADMIN' })
    const user = await createTestUser({ email: 'inviteuser@test.com' })
    const invite = await prisma.betaInvite.create({
      data: { code: 'USED1234', createdById: admin.id, maxUses: 1, useCount: 1, usedById: user.id }
    })
    const res = await request(app).delete(`/api/admin/beta/invites/${invite.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(res.status).toBe(400)
  })
})
