// 4.11 — Gender catalog (4.3): active-only public listing, and the
// "used option cannot be hard-deleted" guard on the admin route. HTTP-level
// since the interesting behavior here is in catalog.ts's route handlers,
// not a standalone service.
import request from 'supertest'
import app from './app'
import { createTestUser, createTestProfile, prisma } from './helpers'

describe('Gender catalog', () => {
  it('GET /api/catalog/genders only returns active options', async () => {
    const user = await createTestUser({ email: 'gender-viewer@test.com' })
    const active = await (prisma as any).genderOption.create({
      data: { slug: `active_${Date.now()}`, label: 'Active option', active: true }
    })
    const inactive = await (prisma as any).genderOption.create({
      data: { slug: `inactive_${Date.now()}`, label: 'Inactive option', active: false }
    })

    const res = await request(app).get('/api/catalog/genders')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(200)
    const slugs = res.body.genders.map((g: any) => g.slug)
    expect(slugs).toContain(active.slug)
    expect(slugs).not.toContain(inactive.slug)
  })

  it('admin cannot hard-delete a gender option currently in use by a profile', async () => {
    const admin = await createTestUser({ email: 'gender-admin@test.com', adminRole: 'ADMIN' })
    const owner = await createTestUser({ email: 'gender-owner@test.com' })
    const option = await (prisma as any).genderOption.create({
      data: { slug: `used_${Date.now()}`, label: 'Used option', active: true }
    })
    const profileId = await createTestProfile(owner.id, { type: 'INDIVIDUAL' })
    await prisma.profile.update({ where: { id: profileId }, data: { gender: option.slug } })

    const del = await request(app).delete(`/api/catalog/admin/genders/${option.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(del.status).toBe(409)
    expect(del.body.code).toBe('IN_USE')

    // deactivating (rather than deleting) must still succeed
    const deactivate = await request(app).put(`/api/catalog/admin/genders/${option.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ active: false })
    expect(deactivate.status).toBe(200)
    expect(deactivate.body.active).toBe(false)
  })

  it('admin CAN hard-delete an unused gender option', async () => {
    const admin = await createTestUser({ email: 'gender-admin2@test.com', adminRole: 'ADMIN' })
    const option = await (prisma as any).genderOption.create({
      data: { slug: `unused_${Date.now()}`, label: 'Unused option', active: true }
    })

    const del = await request(app).delete(`/api/catalog/admin/genders/${option.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(del.status).toBe(200)
  })
})
