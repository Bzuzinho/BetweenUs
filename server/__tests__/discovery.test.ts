import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'

// Mirrors discoveryService.test.ts's withPhoto helper — the 4.9
// completeness gate (profileCompletenessService.ts, wired into
// discoveryService.ts's candidate loop) excludes any CANDIDATE profile
// with zero approved photos from discovery results, regardless of
// status/eligibility. Fixtures below need this for any profile that's
// expected to actually show up (or whose absence should be attributable
// to the thing actually being tested, not incidentally to a missing photo).
async function withPhoto(profileId: string) {
  await prisma.profilePhoto.create({
    data: { profileId, storagePath: `test/${profileId}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' }
  })
}

describe('Discovery — feed filtering', () => {
  it('returns 404 for a user with no profile, even if other profiles (including admins) exist', async () => {
    const regular = await createTestUser({ email: 'dr@test.com' })
    const admin = await createTestUser({ email: 'da@test.com', adminRole: 'ADMIN' })
    await createTestProfile(admin.id)

    const res = await request(app).get('/api/discovery')
      .set('Authorization', `Bearer ${regular.accessToken}`)
    expect(res.status).toBe(404)
  })

  it('with approved profile, excludes admins and pending profiles', async () => {
    const searcher = await createTestUser({ email: 'ds@test.com' })
    const searcherProfileId = await createTestProfile(searcher.id, { status: 'APPROVED' })
    await withPhoto(searcherProfileId)

    const adminUser = await createTestUser({ email: 'daa@test.com', adminRole: 'ADMIN' })
    const adminProfileId = await createTestProfile(adminUser.id, { status: 'APPROVED' })
    await withPhoto(adminProfileId)

    const pendingUser = await createTestUser({ email: 'dp@test.com' })
    const pendingProfileId = await createTestProfile(pendingUser.id, { status: 'PENDING_REVIEW' })
    await withPhoto(pendingProfileId)

    const approvedUser = await createTestUser({ email: 'dap@test.com' })
    const approvedProfileId = await createTestProfile(approvedUser.id, { status: 'APPROVED' })
    await withPhoto(approvedProfileId)

    const res = await request(app).get('/api/discovery')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
    expect(res.status).toBe(200)

    // userId is stripped from the response, so identify profiles by
    // displayName (createTestProfile sets it to `User ${userId.slice(0,6)}`).
    const names = res.body.profiles.map((p: any) => p.displayName)
    expect(names.some((n: string) => n.includes(adminUser.id.slice(0, 6)))).toBe(false)
    expect(names.some((n: string) => n.includes(pendingUser.id.slice(0, 6)))).toBe(false)
    expect(names.some((n: string) => n.includes(approvedUser.id.slice(0, 6)))).toBe(true)
  })

  it('returns 404 if user has no profile yet', async () => {
    const noprofile = await createTestUser({ email: 'dn@test.com' })
    const res = await request(app).get('/api/discovery')
      .set('Authorization', `Bearer ${noprofile.accessToken}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('perfil')
  })
})
