// 9.13 — ReportEvidence: snapshot survives soft-delete of the source
// message, and the evidence detail route is gated by
// moderation.evidence.view (not just the broader 'reports' permission).
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'
import { captureMessageSnapshot } from '../src/lib/reportEvidenceService'

describe('ReportEvidence — snapshot survives source deletion', () => {
  it('a MESSAGE_SNAPSHOT keeps the original body after the Message is soft-deleted', async () => {
    const userA = await createTestUser({ email: 'ev-a@test.com' })
    const userB = await createTestUser({ email: 'ev-b@test.com' })
    const profileAId = await createTestProfile(userA.id)
    const profileBId = await createTestProfile(userB.id)
    const match = await createTestMatch(profileAId, profileBId)

    const message = await prisma.message.create({
      data: { conversationId: match.conversation!.id, senderUserId: userA.id, body: 'texto original sensível' }
    })

    const report = await prisma.report.create({
      data: { reporterUserId: userB.id, reportedUserId: userA.id, reportedMessageId: message.id, reason: 'HARASSMENT', status: 'PENDING', priority: 8 }
    })
    await captureMessageSnapshot(report.id, message.id, 'CONVERSATION')

    // Soft-delete the source message the way the cleanup job / user delete does.
    await prisma.message.update({ where: { id: message.id }, data: { deletedAt: new Date(), body: '[Mensagem apagada]' } })

    const evidence = await (prisma as any).reportEvidence.findMany({ where: { reportId: report.id } })
    expect(evidence.length).toBe(1)
    expect(evidence[0].data.body).toBe('texto original sensível')
    expect(evidence[0].type).toBe('MESSAGE_SNAPSHOT')
  })
})

describe('ReportEvidence — access gated by moderation.evidence.view (9.2)', () => {
  it('SUPPORT (has "reports" but not moderation.evidence.view) sees the report but not evidence', async () => {
    const support = await createTestUser({ email: 'ev-support@test.com', adminRole: 'SUPPORT' })
    const userA = await createTestUser({ email: 'ev-target@test.com' })
    const profileId = await createTestProfile(userA.id)
    const report = await prisma.report.create({
      data: { reporterUserId: userA.id, reportedUserId: userA.id, reason: 'HARASSMENT', status: 'PENDING', priority: 8 }
    })
    await (prisma as any).reportEvidence.create({ data: { reportId: report.id, type: 'MESSAGE_SNAPSHOT', data: { body: 'secreto' } } })

    const res = await request(app).get(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${support.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.evidence).toBeNull()
    expect(res.body.evidenceRestricted).toBe(true)
    expect(res.body.report.id).toBe(report.id) // report shell itself IS visible
  })

  it('MODERATOR (has moderation.evidence.view) sees the evidence', async () => {
    const moderator = await createTestUser({ email: 'ev-moderator@test.com', adminRole: 'MODERATOR' })
    const userA = await createTestUser({ email: 'ev-target2@test.com' })
    await createTestProfile(userA.id)
    const report = await prisma.report.create({
      data: { reporterUserId: userA.id, reportedUserId: userA.id, reason: 'HARASSMENT', status: 'PENDING', priority: 8 }
    })
    await (prisma as any).reportEvidence.create({ data: { reportId: report.id, type: 'MESSAGE_SNAPSHOT', data: { body: 'secreto' } } })

    const res = await request(app).get(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${moderator.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.evidenceRestricted).toBe(false)
    expect(res.body.evidence.length).toBe(1)
    expect(res.body.evidence[0].data.body).toBe('secreto')
  })

  it('viewing high-sensitivity evidence is logged via AdminAction', async () => {
    const moderator = await createTestUser({ email: 'ev-moderator2@test.com', adminRole: 'MODERATOR' })
    const userA = await createTestUser({ email: 'ev-target3@test.com' })
    await createTestProfile(userA.id)
    const report = await prisma.report.create({
      data: { reporterUserId: userA.id, reportedUserId: userA.id, reason: 'HARASSMENT', status: 'PENDING', priority: 8 }
    })
    await (prisma as any).reportEvidence.create({ data: { reportId: report.id, type: 'MESSAGE_SNAPSHOT', data: { body: 'secreto' } } })

    await request(app).get(`/api/admin/reports/${report.id}`).set('Authorization', `Bearer ${moderator.accessToken}`)

    const logs = await prisma.adminAction.findMany({ where: { adminId: moderator.id, action: 'VIEW_REPORT_EVIDENCE', targetId: report.id } })
    expect(logs.length).toBe(1)
  })

  it('unauthenticated request cannot reach the evidence route at all', async () => {
    const res = await request(app).get('/api/admin/reports/some-id')
    expect([401, 403]).toContain(res.status)
  })
})
