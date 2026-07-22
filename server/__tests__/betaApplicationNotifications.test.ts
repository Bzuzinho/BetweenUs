import request from 'supertest'
import app from './app'
import { prisma, createTestUser, waitForCondition } from './helpers'
import { getAdminNotificationSummary } from '../src/lib/adminWorkQueueService'

describe('Beta application admin notifications', () => {
  const email = `beta-notification-${Date.now()}@betweenus.test`

  beforeAll(async () => {
    // beta_applications is intentionally managed by a SQL migration rather
    // than Prisma's schema, while the test database is prepared with db push.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "beta_applications" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "source" TEXT NOT NULL DEFAULT 'LANDING_PAGE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "beta_applications_email_key"
      ON "beta_applications" (LOWER("email"))
    `)
  })

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM "beta_applications" WHERE LOWER("email") = ${email}`
  })

  it('creates one bell notification and exposes the pending request in the admin queue', async () => {
    const admin = await createTestUser({ email: 'beta-notification-admin@test.com', adminRole: 'ADMIN' })

    const first = await request(app).post('/api/beta/applications').send({ email })
    expect(first.status).toBe(202)

    const notification = await waitForCondition(() => prisma.notification.findFirst({
      where: { userId: admin.id, type: 'new_beta_application' },
    }))
    expect(notification).toBeTruthy()
    expect(JSON.parse(notification?.data || '{}')).toMatchObject({
      email,
      tab: 'affiliations',
      subtab: 'beta-access',
    })

    const summary = await getAdminNotificationSummary(admin.id, 'ADMIN')
    expect(summary.workQueue.betaApplicationsPending).toBeGreaterThanOrEqual(1)

    // Re-submitting the same address is deliberately idempotent and must not
    // generate another bell notification or another pending application.
    const duplicate = await request(app).post('/api/beta/applications').send({ email })
    expect(duplicate.status).toBe(202)
    expect(await prisma.notification.count({
      where: { userId: admin.id, type: 'new_beta_application' },
    })).toBe(1)
  })
})
