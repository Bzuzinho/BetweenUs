import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createBetaInvite } from './helpers'

describe('Auth — register', () => {
  const valid = {
    email: 'register@test.com',
    password: 'Password123!',
    dateOfBirth: '1990-01-01',
    termsAccepted: true,
    ageConfirmed: true,
    privacyAccepted: true,
    sensitiveDataAccepted: true,
    communityGuidelinesAccepted: true,
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

  // T14: under-18 blocked
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

  // T14: missing consents blocked
  it('rejects registration without ageConfirmed', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'noconsent@test.com', ageConfirmed: false
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('18')
  })

  it('rejects registration without privacyAccepted', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'noprivacy@test.com', privacyAccepted: false
    })
    expect(res.status).toBe(400)
  })

  it('rejects registration without sensitiveDataAccepted', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'nosensitive@test.com', sensitiveDataAccepted: false
    })
    expect(res.status).toBe(400)
  })

  // T14: optional consents stored correctly
  it('stores optional consents only when provided', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'optcons@test.com', marketingConsent: true, locationConsent: false
    })
    expect(res.status).toBe(201)
    const consents = await prisma.userConsent.findMany({ where: { userId: res.body.user.id } })
    const types = consents.map(c => c.consentType)
    expect(types).toContain('MARKETING')
    expect(types).not.toContain('LOCATION')
  })

  // T14: emailVerifiedAt not set in production
  it('does not auto-verify email in production mode', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const res = await request(app).post('/api/auth/register').send({
      ...valid, email: 'produser@test.com'
    })
    process.env.NODE_ENV = origEnv
    expect(res.status).toBe(201)
    const user = await prisma.user.findUnique({ where: { email: 'produser@test.com' } })
    expect(user!.emailVerifiedAt).toBeNull()
    expect(user!.status).toBe('PENDING_VERIFICATION')
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
    ageConfirmed: true,
    privacyAccepted: true,
    sensitiveDataAccepted: true,
    communityGuidelinesAccepted: true,
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
  const validBase = {
    termsAccepted: true, ageConfirmed: true, privacyAccepted: true,
    sensitiveDataAccepted: true, communityGuidelinesAccepted: true
  }

  it('returns tokens on correct credentials', async () => {
    await request(app).post('/api/auth/register').send({
      ...validBase, email: 'login@test.com', password: 'Password123!', dateOfBirth: '1990-01-01'
    })
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com', password: 'Password123!'
    })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      ...validBase, email: 'loginwrong@test.com', password: 'Password123!', dateOfBirth: '1990-01-01'
    })
    const res = await request(app).post('/api/auth/login').send({
      email: 'loginwrong@test.com', password: 'WrongPassword!'
    })
    expect(res.status).toBe(401)
  })

  // T14: suspended user cannot login
  it('blocks SUSPENDED user', async () => {
    await createTestUser({ email: 'suspended@test.com', password: 'Password123!', status: 'SUSPENDED' })
    const res = await request(app).post('/api/auth/login').send({
      email: 'suspended@test.com', password: 'Password123!'
    })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED')
  })

  // T14: banned user cannot login
  it('blocks BANNED user', async () => {
    await createTestUser({ email: 'banned@test.com', password: 'Password123!', status: 'BANNED' })
    const res = await request(app).post('/api/auth/login').send({
      email: 'banned@test.com', password: 'Password123!'
    })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_BANNED')
  })
})

describe('Auth — RGPD', () => {
  const validBase = {
    termsAccepted: true, ageConfirmed: true, privacyAccepted: true,
    sensitiveDataAccepted: true, communityGuidelinesAccepted: true
  }

  it('exports user data', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      ...validBase, email: 'export@test.com', password: 'Password123!', dateOfBirth: '1990-01-01'
    })
    const { accessToken } = regRes.body
    const res = await request(app).get('/api/auth/export')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('export@test.com')
    expect(res.body.exportVersion).toBe('1.0')
  })

  it('deletes account with correct password', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      ...validBase, email: 'delete@test.com', password: 'Password123!', dateOfBirth: '1990-01-01'
    })
    const { accessToken } = regRes.body
    const res = await request(app).delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'Password123!' })
    expect(res.status).toBe(200)
    const user = await prisma.user.findFirst({ where: { email: { contains: 'deleted' } } })
    expect(user?.status).toBe('DELETED')
  })

  it('rejects account deletion with wrong password', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      ...validBase, email: 'deletewrong@test.com', password: 'Password123!', dateOfBirth: '1990-01-01'
    })
    const { accessToken } = regRes.body
    const res = await request(app).delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'WrongPassword!' })
    expect(res.status).toBe(401)
  })
})

describe('Auth — /me', () => {
  const validBase = {
    termsAccepted: true, ageConfirmed: true, privacyAccepted: true,
    sensitiveDataAccepted: true, communityGuidelinesAccepted: true
  }

  it('returns user data with valid token', async () => {
    const user = await createTestUser({ email: 'me@test.com' })
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('me@test.com')
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
