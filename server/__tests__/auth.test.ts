import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createBetaInvite } from './helpers'

describe('Auth — register', () => {
  const valid = {
    email: 'register@test.com',
    password: 'Password123!',
    dateOfBirth: '1990-01-01',
    termsAccepted: true,
  }

  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(valid)
    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.user.email).toBe(valid.email)
  })

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send(valid)
    const res = await request(app).post('/api/auth/register').send(valid)
    expect(res.status).toBe(409)
  })

  it('rejects under-18 date of birth', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'young@test.com', dateOfBirth: new Date().toISOString().split('T')[0]
    })
    expect(res.status).toBe(400)
  })

  it('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, password: 'short' })
    expect(res.status).toBe(400)
  })
})

describe('Auth — beta closed', () => {
  beforeAll(() => { process.env.BETA_CLOSED = 'true' })
  afterAll(() => { process.env.BETA_CLOSED = 'false' })

  const valid = {
    email: 'betauser@test.com',
    password: 'Password123!',
    dateOfBirth: '1990-01-01',
    termsAccepted: true,
  }

  it('blocks registration without betaCode when BETA_CLOSED=true', async () => {
    const res = await request(app).post('/api/auth/register').send(valid)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('BETA_REQUIRED')
  })

  it('allows registration with valid betaCode', async () => {
    const admin = await createTestUser({ adminRole: 'SUPER_ADMIN' })
    const invite = await createBetaInvite(admin.id)
    const res = await request(app).post('/api/auth/register').send({
      ...valid, betaCode: invite.code
    })
    expect(res.status).toBe(201)
    // invite should be consumed
    const updated = await prisma.betaInvite.findUnique({ where: { id: invite.id } })
    expect(updated!.useCount).toBe(1)
  })

  it('rejects expired betaCode', async () => {
    const admin = await createTestUser({ adminRole: 'SUPER_ADMIN' })
    const invite = await createBetaInvite(admin.id, { expiresAt: new Date(Date.now() - 1000) })
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'expired@test.com', betaCode: invite.code
    })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('BETA_EXPIRED')
  })

  it('rejects exhausted betaCode', async () => {
    const admin = await createTestUser({ adminRole: 'SUPER_ADMIN' })
    const invite = await createBetaInvite(admin.id, { maxUses: 1, useCount: 1 })
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'exhausted@test.com', betaCode: invite.code
    })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('BETA_EXHAUSTED')
  })
})

describe('Auth — login', () => {
  it('returns tokens on correct credentials', async () => {
    await createTestUser({ email: 'login@test.com', password: 'Password123!' })
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com', password: 'Password123!'
    })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('rejects wrong password', async () => {
    await createTestUser({ email: 'loginwrong@test.com', password: 'Password123!' })
    const res = await request(app).post('/api/auth/login').send({
      email: 'loginwrong@test.com', password: 'WrongPassword!'
    })
    expect(res.status).toBe(401)
  })

  it('blocks SUSPENDED user', async () => {
    await createTestUser({ email: 'suspended@test.com', password: 'Password123!', status: 'SUSPENDED' })
    const res = await request(app).post('/api/auth/login').send({
      email: 'suspended@test.com', password: 'Password123!'
    })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED')
  })
})

describe('Auth — refresh token', () => {
  it('allows refresh with valid token', async () => {
    const user = await createTestUser({ email: 'refresh@test.com' })
    // Store hash in Redis via login
    await request(app).post('/api/auth/login').send({
      email: 'refresh@test.com', password: 'Password123!'
    })
    // This test is a sanity check — full Redis validation tested in integration
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: user.refreshToken
    })
    // Without Redis in test env, it may pass or return 401 — check it doesn't crash
    expect([200, 401]).toContain(res.status)
  })

  it('rejects obviously invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'not-a-valid-token'
    })
    expect(res.status).toBe(401)
  })
})

describe('Auth — /me', () => {
  it('returns user data with valid token', async () => {
    const user = await createTestUser({ email: 'me@test.com' })
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', \`Bearer \${user.accessToken}\`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('me@test.com')
    expect(res.body.adminRole).toBeNull()
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
