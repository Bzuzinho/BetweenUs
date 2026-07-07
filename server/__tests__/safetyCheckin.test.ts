// 9.13 — SafetyCheckin V2: state machine transitions + the three jobs.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'
import { canTransitionSafetyCheckin } from '../src/lib/safetyCheckinStateMachine'
import {
  runSafetyCheckinRequestJob, runSafetyCheckinOverdueJob, runSafetyCheckinEscalationJob
} from '../src/lib/safetyCheckinService'

describe('SafetyCheckinStateMachine — transitions', () => {
  it('SCHEDULE only valid for a brand new check-in', () => {
    expect(canTransitionSafetyCheckin(null, 'SCHEDULE').allowed).toBe(true)
    expect(canTransitionSafetyCheckin('SCHEDULED', 'SCHEDULE').allowed).toBe(false)
  })

  it('the full happy path: SCHEDULED -> WAITING_CONFIRMATION -> OVERDUE -> ESCALATED -> SAFE_CONFIRMED', () => {
    expect(canTransitionSafetyCheckin('SCHEDULED', 'REQUEST_CONFIRMATION').toState).toBe('WAITING_CONFIRMATION')
    expect(canTransitionSafetyCheckin('WAITING_CONFIRMATION', 'MARK_OVERDUE').toState).toBe('OVERDUE')
    expect(canTransitionSafetyCheckin('OVERDUE', 'ESCALATE').toState).toBe('ESCALATED')
    expect(canTransitionSafetyCheckin('ESCALATED', 'CONFIRM_SAFE').toState).toBe('SAFE_CONFIRMED')
  })

  it('CANCEL is not valid once ESCALATED', () => {
    expect(canTransitionSafetyCheckin('ESCALATED', 'CANCEL').allowed).toBe(false)
  })

  it('CONFIRM_SAFE is valid from every non-terminal state including ESCALATED', () => {
    for (const s of ['SCHEDULED', 'WAITING_CONFIRMATION', 'OVERDUE', 'ESCALATED'] as const) {
      expect(canTransitionSafetyCheckin(s, 'CONFIRM_SAFE').allowed).toBe(true)
    }
  })

  it('MARK_OVERDUE only valid from WAITING_CONFIRMATION', () => {
    expect(canTransitionSafetyCheckin('SCHEDULED', 'MARK_OVERDUE').allowed).toBe(false)
    expect(canTransitionSafetyCheckin('WAITING_CONFIRMATION', 'MARK_OVERDUE').allowed).toBe(true)
  })
})

describe('SafetyCheckin HTTP — schedule and confirm', () => {
  it('a user can schedule and then confirm their own check-in', async () => {
    const user = await createTestUser({ email: 'sc-user@test.com' })
    await createTestProfile(user.id)

    const create = await request(app).post('/api/safety/checkin')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ scheduledAt: new Date(Date.now() + 3600000).toISOString(), safetyEmail: 'trusted@example.com' })
    expect(create.status).toBe(201)
    expect(create.body.checkin.status).toBe('SCHEDULED')
    expect(create.body.checkin.safetyEmail).toContain('***') // masked

    const confirm = await request(app).put(`/api/safety/checkin/${create.body.checkin.id}/confirm`)
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(confirm.status).toBe(200)
    expect(confirm.body.checkin.status).toBe('SAFE_CONFIRMED')
  })

  it('another user cannot confirm someone else\'s check-in', async () => {
    const owner = await createTestUser({ email: 'sc-owner@test.com' })
    const outsider = await createTestUser({ email: 'sc-outsider@test.com' })
    await createTestProfile(owner.id)
    await createTestProfile(outsider.id)

    const create = await request(app).post('/api/safety/checkin')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ scheduledAt: new Date(Date.now() + 3600000).toISOString() })

    const res = await request(app).put(`/api/safety/checkin/${create.body.checkin.id}/confirm`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
    expect(res.status).toBe(403)
  })
})

describe('SafetyCheckin jobs (9.6)', () => {
  it('safety-checkin-request moves a due SCHEDULED checkin to WAITING_CONFIRMATION', async () => {
    const user = await createTestUser({ email: 'sc-job-request@test.com' })
    const profileId = await createTestProfile(user.id)
    const checkin = await (prisma as any).safetyCheckin.create({
      data: { profileId, scheduledAt: new Date(Date.now() - 1000), status: 'SCHEDULED' }
    })

    const processed = await runSafetyCheckinRequestJob()
    expect(processed).toBeGreaterThanOrEqual(1)

    const updated = await (prisma as any).safetyCheckin.findUnique({ where: { id: checkin.id } })
    expect(updated.status).toBe('WAITING_CONFIRMATION')
    expect(updated.requestSentAt).not.toBeNull()
  })

  it('safety-checkin-overdue marks a stale WAITING_CONFIRMATION as OVERDUE, and is idempotent', async () => {
    const user = await createTestUser({ email: 'sc-job-overdue@test.com' })
    const profileId = await createTestProfile(user.id)
    const checkin = await (prisma as any).safetyCheckin.create({
      data: {
        profileId, status: 'WAITING_CONFIRMATION',
        scheduledAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // well past the default 3h grace
      }
    })

    const first = await runSafetyCheckinOverdueJob()
    expect(first).toBeGreaterThanOrEqual(1)
    const updated = await (prisma as any).safetyCheckin.findUnique({ where: { id: checkin.id } })
    expect(updated.status).toBe('OVERDUE')

    // Idempotent: running again shouldn't re-process the same row (it's
    // no longer WAITING_CONFIRMATION).
    const beforeCount = await (prisma as any).safetyCheckin.count({ where: { id: checkin.id, status: 'WAITING_CONFIRMATION' } })
    expect(beforeCount).toBe(0)
  })

  it('safety-checkin-escalation escalates a stale OVERDUE checkin and sends the safety contact email', async () => {
    const user = await createTestUser({ email: 'sc-job-escalate@test.com' })
    const profileId = await createTestProfile(user.id)
    const checkin = await (prisma as any).safetyCheckin.create({
      data: {
        profileId, status: 'OVERDUE', safetyEmail: 'trusted-contact@example.com',
        scheduledAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // past both grace periods
      }
    })

    const processed = await runSafetyCheckinEscalationJob()
    expect(processed).toBeGreaterThanOrEqual(1)

    const updated = await (prisma as any).safetyCheckin.findUnique({ where: { id: checkin.id } })
    expect(updated.status).toBe('ESCALATED')
    expect(updated.escalatedAt).not.toBeNull()
    expect(updated.alertSent).toBe(true)
  })

  it('escalation does not send anything if no safety contact was configured', async () => {
    const user = await createTestUser({ email: 'sc-job-nocontact@test.com' })
    const profileId = await createTestProfile(user.id)
    const checkin = await (prisma as any).safetyCheckin.create({
      data: {
        profileId, status: 'OVERDUE', safetyEmail: null,
        scheduledAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      }
    })

    await runSafetyCheckinEscalationJob()

    const updated = await (prisma as any).safetyCheckin.findUnique({ where: { id: checkin.id } })
    expect(updated.status).toBe('ESCALATED') // still escalates internally
    expect(updated.alertSent).toBe(false) // but nothing external was sent
  })
})
