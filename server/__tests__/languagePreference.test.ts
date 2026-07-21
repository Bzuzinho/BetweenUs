import request from 'supertest'
import app from './app'
import { createTestUser, prisma } from './helpers'

const readLanguage = async (userId: string) => {
  const rows = await prisma.$queryRaw<Array<{ preferredLanguage: string }>>`
    SELECT "preferredLanguage" FROM "User" WHERE id = ${userId} LIMIT 1
  `
  return rows[0]?.preferredLanguage
}

describe('Account language preference', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT NOT NULL DEFAULT 'pt-PT'
    `)
  })

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
    expect(await readLanguage(user.id)).toBe('fr')
  })

  it('rejects unsupported languages without changing the stored preference', async () => {
    const user = await createTestUser({ email: 'language-invalid@test.com' })

    const update = await request(app)
      .put('/api/push/language')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ preferredLanguage: 'de' })

    expect(update.status).toBe(400)
    expect(await readLanguage(user.id)).toBe('pt-PT')
  })
})
