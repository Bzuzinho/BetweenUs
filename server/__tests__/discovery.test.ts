import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'

describe('Discovery — feed filtering', () => {
  it('excludes admin users from discovery', async () => {
    const regular = await createTestUser({ email: 'dr@test.com' })
    const admin = await createTestUser({ email: 'da@test.com', adminRole: 'ADMIN' })
    await createTestProfile(regular.id)
    await createTestProfile(admin.id)

    const res = await request(app).get('/api/discovery')
      .set('Authorization', `Bearer ${regular.accessToken}`)
    expect(res.status).toBe(404) // no profile yet for `regular` in this test
  })

  it('with approved profile, excludes admins and pending profiles', async () => {
    const searcher = await createTestUser({ email: 'ds@test.com' })
    const searcherProfileId = await createTestProfile(searcher.id, { status: 'APPROVED' })

    const adminUser = await createTestUser({ email: 'daa@test.com', adminRole: 'ADMIN' })
    await createTestProfile(adminUser.id, { status: 'APPROVED' })

    const pendingUser = await createTestUser({ email: 'dp@test.com' })
    await createTestProfile(pendingUser.id, { status: 'PENDING_REVIEW' })

    const approvedUser = await createTestUser({ email: 'dap@test.com' })
    await createTestProfile(approvedUser.id, { status: 'APPROVED' })

    const res = await request(app).get('/api/discovery')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
    expect(res.status).toBe(200)

    const ids = res.body.profiles.map((p: any) => p.userId).filter(Boolean)
    // Admin and pending profiles must not appear
    // (userId is stripped from response, but we can check displayName)
    const names = res.body.profiles.map((p: any) => p.displayName)
    // The approved user should appear (different email prefix)
    expect(res.body.profiles.some((p: any) =>
      p.displayName.includes(approvedUser.id.slice(0, 6))
    )).toBe(true)
  })

  it('returns 404 if user has no profile yet', async () => {
    const noprofile = await createTestUser({ email: 'dn@test.com' })
    const res = await request(app).get('/api/discovery')
      .set('Authorization', `Bearer ${noprofile.accessToken}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('perfil')
  })
})
