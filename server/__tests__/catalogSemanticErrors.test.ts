import request from 'supertest'
import app from './app'
import { createTestUser } from './helpers'

describe('Catalog semantic error codes', () => {
  it('returns a stable validation code and field', async () => {
    const admin = await createTestUser({ email: 'catalog-validation@test.com', adminRole: 'SUPER_ADMIN' })

    const response = await request(app)
      .post('/api/catalog/admin/intentions')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Valid name', slug: 'Invalid Slug' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('CATALOG_VALIDATION_FAILED')
    expect(response.body.field).toBe('slug')
  })

  it('returns a stable not-found code for catalog items', async () => {
    const admin = await createTestUser({ email: 'catalog-not-found@test.com', adminRole: 'SUPER_ADMIN' })

    const response = await request(app)
      .delete('/api/catalog/admin/genders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ code: 'CATALOG_ITEM_NOT_FOUND', resource: 'gender' })
  })

  it('returns a stable code for invalid boundary constraints', async () => {
    const admin = await createTestUser({ email: 'catalog-boundary@test.com', adminRole: 'SUPER_ADMIN' })

    const response = await request(app)
      .post('/api/catalog/admin/boundaries')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: 'Test boundary',
        slug: 'test_boundary',
        category: 'privacy',
        ruleType: 'CANDIDATE_CONSTRAINT',
      })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('BOUNDARY_CONSTRAINT_REQUIRED')
  })

  it('returns a stable code for unknown structural profile types', async () => {
    const admin = await createTestUser({ email: 'catalog-profile-type@test.com', adminRole: 'SUPER_ADMIN' })

    const response = await request(app)
      .put('/api/catalog/admin/profile-type-config/UNKNOWN')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ label: 'Unknown' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('PROFILE_TYPE_UNKNOWN')
  })
})
