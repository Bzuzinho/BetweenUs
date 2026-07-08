// Security follow-up — JWT lifecycle after JWT_SECRET/JWT_REFRESH_SECRET
// rotation (commit 487b622596dd5936cea76a48c0152cbc18dc9744 exposed both
// in git history). These tests simulate "pre-rotation" tokens by signing
// with a DIFFERENT secret than the one utils/jwt.ts currently reads from
// process.env — from jsonwebtoken's perspective this is indistinguishable
// from "a token issued before a real secret rotation", which is exactly
// the property we need to verify: any such token must fail verification
// the same way an expired/garbage token does, with no special case.
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from './app'
import { createTestUser } from './helpers'
import { resolveSocketUserId } from '../src/lib/socketAuth'

const CURRENT_ACCESS_SECRET = process.env.JWT_SECRET!
const CURRENT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
// Stand-in for "the secret that was live before rotation" — deliberately
// just a distinct literal, never a value that was ever real. Signing with
// this and verifying against CURRENT_*_SECRET reproduces the exact
// signature-mismatch a real rotation produces for old tokens.
const PRE_ROTATION_SECRET = 'pre-rotation-secret-simulated-for-tests-only'

const signOldAccessToken = (userId: string) =>
  jwt.sign({ userId }, PRE_ROTATION_SECRET, { expiresIn: '15m' })
const signOldRefreshToken = (userId: string) =>
  jwt.sign({ userId }, PRE_ROTATION_SECRET, { expiresIn: '30d' })
const signExpiredAccessToken = (userId: string) =>
  jwt.sign({ userId }, CURRENT_ACCESS_SECRET, { expiresIn: '-1s' })

describe('JWT rotation — access token validation', () => {
  it('1. a valid, current access token is accepted', async () => {
    const user = await createTestUser({ email: 'jwt-valid@test.com' })
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(200)
  })

  it('2. an expired access token is rejected (but the user still has a valid refresh token)', async () => {
    const user = await createTestUser({ email: 'jwt-expired@test.com' })
    const expired = signExpiredAccessToken(user.id)
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)
    expect(res.status).toBe(401)
    // The refresh token issued alongside it is untouched by the access
    // token's expiry and still works.
    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken: user.refreshToken })
    expect(refreshed.status).toBe(200)
    expect(refreshed.body.accessToken).toBeDefined()
  })

  it('3. an access token with an invalid signature is rejected, independent of any refresh token', async () => {
    const user = await createTestUser({ email: 'jwt-badsig@test.com' })
    const tampered = user.accessToken.slice(0, -2) + 'xx'
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tampered}`)
    expect(res.status).toBe(401)
  })

  it('4. old access token AND old refresh token (both signed pre-rotation) are both rejected', async () => {
    const user = await createTestUser({ email: 'jwt-both-old@test.com' })
    const oldAccess = signOldAccessToken(user.id)
    const oldRefresh = signOldRefreshToken(user.id)

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldAccess}`)
    expect(meRes.status).toBe(401)

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh })
    expect(refreshRes.status).toBe(401)
  })
})

describe('JWT rotation — refresh token validation', () => {
  it('5. a refresh token signed with the wrong (pre-rotation) secret is rejected by /api/auth/refresh', async () => {
    const user = await createTestUser({ email: 'jwt-refresh-wrongsig@test.com' })
    const oldRefresh = signOldRefreshToken(user.id)
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh })
    expect(res.status).toBe(401)
  })

  it('6. an invalid refresh clears the accessToken/refreshToken cookies (Set-Cookie with Max-Age=0 / expiry in the past)', async () => {
    const user = await createTestUser({ email: 'jwt-refresh-clears-cookies@test.com' })
    const oldRefresh = signOldRefreshToken(user.id)
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh })
    expect(res.status).toBe(401)

    const setCookie = res.headers['set-cookie'] || []
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie)
    expect(cookieStr).toMatch(/accessToken=;/)
    expect(cookieStr).toMatch(/refreshToken=;/)
    expect(cookieStr.toLowerCase()).toMatch(/expires=thu, 01 jan 1970|max-age=0/)
  })

  it('a missing refresh token also clears cookies (defensive — not just the invalid-signature path)', async () => {
    const res = await request(app).post('/api/auth/refresh').send({})
    expect(res.status).toBe(401)
    const setCookie = res.headers['set-cookie'] || []
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie)
    expect(cookieStr).toMatch(/accessToken=;/)
  })
})

describe('JWT rotation — new sessions are unaffected', () => {
  it('7. a brand new login (after rotation) works normally and returns a fresh, valid access token', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'jwt-newlogin@test.com', password: 'Password123!', dateOfBirth: '1990-01-01',
      termsAccepted: true, ageConfirmed: true, privacyAccepted: true,
      sensitiveDataAccepted: true, communityGuidelinesAccepted: true,
    })
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'jwt-newlogin@test.com', password: 'Password123!'
    })
    expect(loginRes.status).toBe(200)
    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${loginRes.body.accessToken}`)
    expect(meRes.status).toBe(200)
  })

  it('8. admin login after rotation works the same way — same token mechanism, role is a DB lookup on top', async () => {
    const admin = await createTestUser({ email: 'jwt-admin@test.com', adminRole: 'ADMIN' })
    const res = await request(app).get('/api/admin/recommendations/status').set('Authorization', `Bearer ${admin.accessToken}`)
    expect(res.status).toBe(200)

    // And an old-secret admin token is rejected exactly like a regular one.
    const oldAdminToken = signOldAccessToken(admin.id)
    const rejected = await request(app).get('/api/admin/recommendations/status').set('Authorization', `Bearer ${oldAdminToken}`)
    expect(rejected.status).toBe(401)
  })
})

describe('JWT rotation — Socket.IO handshake auth', () => {
  it('9. a socket handshake with an old/invalid token is rejected', () => {
    expect(() => resolveSocketUserId({ auth: { token: PRE_ROTATION_SECRET }, headers: {} })).toThrow()
    const fakeOldToken = jwt.sign({ userId: 'whoever' }, PRE_ROTATION_SECRET)
    expect(() => resolveSocketUserId({ auth: { token: fakeOldToken }, headers: {} })).toThrow()
  })

  it('10. a socket handshake with a fresh, current token succeeds and resolves the right userId', async () => {
    const user = await createTestUser({ email: 'jwt-socket-fresh@test.com' })
    const userId = resolveSocketUserId({ auth: { token: user.accessToken }, headers: {} })
    expect(userId).toBe(user.id)
  })

  it('a socket handshake with no token at all is rejected (not just old tokens)', () => {
    expect(() => resolveSocketUserId({ auth: {}, headers: {} })).toThrow()
  })
})
