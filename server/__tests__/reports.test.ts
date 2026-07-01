import request from 'supertest'
import app from './app'
import { prisma, createTestUser } from './helpers'

describe('Reports — priority assignment', () => {
  it('assigns high priority to MINOR reports', async () => {
    const reporter = await createTestUser({ email: 'rr@test.com' })
    const reported = await createTestUser({ email: 'rep@test.com' })

    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ reportedUserId: reported.id, reason: 'MINOR' })
    expect(res.status).toBe(201)
    expect(res.body.priority).toBe(10)
  })

  it('assigns high priority to THREAT reports', async () => {
    const reporter = await createTestUser({ email: 'rr2@test.com' })
    const reported = await createTestUser({ email: 'rep2@test.com' })

    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ reportedUserId: reported.id, reason: 'THREAT' })
    expect(res.status).toBe(201)
    expect(res.body.priority).toBe(10)
  })

  it('assigns normal priority to SPAM reports', async () => {
    const reporter = await createTestUser({ email: 'rr3@test.com' })
    const reported = await createTestUser({ email: 'rep3@test.com' })

    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ reportedUserId: reported.id, reason: 'SPAM' })
    expect(res.status).toBe(201)
    expect(res.body.priority).toBe(0)
  })

  it('increases priority for reincident users', async () => {
    const reporter = await createTestUser({ email: 'rr4@test.com' })
    const reported = await createTestUser({ email: 'rep4@test.com' })
    const reporter2 = await createTestUser({ email: 'rr5@test.com' })

    // Create 2 existing reports against the same user
    await prisma.report.createMany({
      data: [
        { reporterUserId: reporter.id, reportedUserId: reported.id, reason: 'SPAM', status: 'PENDING', priority: 0 },
        { reporterUserId: reporter2.id, reportedUserId: reported.id, reason: 'SPAM', status: 'PENDING', priority: 0 },
      ]
    })

    // A 3rd report should get bumped to priority 8
    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ reportedUserId: reported.id, reason: 'SPAM' })
    expect(res.status).toBe(201)
    expect(res.body.priority).toBeGreaterThanOrEqual(8)
  })
})
