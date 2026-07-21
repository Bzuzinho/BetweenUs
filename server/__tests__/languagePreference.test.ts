import request from 'supertest'
import app from './app'
import { createTestUser, prisma } from './helpers'

describe('Account language preference', () => {
  it('returns Portuguese by default and persists a supported language', async () => {
    const user = await createTestUser({ email: 'language-preference@test.com' })

    const initial = await request(app)
      .get('/api/push/language')
      .set('Authorization', `Bearer ${user.accessToken}`)

    expect(initial.status).toBe(200)
    expect(initial.body.preferredLanguage).toBe('pt-PT')

    const update = await request(app)
      .put('/api/push/language')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ preferredLanguage: 'fr' })

    expect(update.status).toBe(200)
    expect(update.body).toEqual({ ok: true, preferredLanguage: 'fr' })

    const stored = await prisma.user.findUnique({ where: { id: user.id } })
    expect((stored as any)?.preferredLanguage).toBe('fr')
  })

  it('rejects unsupported languages without changing the stored preference', async () => {
    const user = await createTestUser({ email: 'language-invalid@test.com' })

    const update = await request(app)
      .put('/api/push/language')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ preferredLanguage: 'de' })

    expect(update.status).toBe(400)

    const stored = await prisma.user.findUnique({ where: { id: user.id } })
    expect((stored as any)?.preferredLanguage).toBe('pt-PT')
  })
})
