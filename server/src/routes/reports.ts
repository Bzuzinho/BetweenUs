import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { computeReportPriority, ReportReasonValue } from '../lib/reportPriorityService'
import { captureMessageSnapshot, captureProfileSnapshot } from '../lib/reportEvidenceService'
import { runModerationAssessment } from '../lib/moderationAssessmentService'

const router = Router()

// T7: full report reason enum including previously missing critical categories
const reportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  reportedMessageId: z.string().uuid().optional(),
  // 10.8 — event report support: loose reference (no FK, matches
  // reportedUserId/reportedMessageId's own pattern), lets an attendee
  // flag a problematic event itself rather than a specific user/message.
  reportedEventId: z.string().uuid().optional(),
  // 9.1 — disambiguates which table reportedMessageId points at. Optional
  // for backward-compat with existing clients that never set it (none
  // currently report a specific message at all) — when omitted, evidence
  // capture tries both tables.
  messageSource: z.enum(['CONVERSATION', 'ROOM']).optional(),
  reason: z.enum([
    'FAKE_PROFILE',
    'HARASSMENT',
    'OFFENSIVE_CONTENT',
    'MINOR',
    'NON_CONSENSUAL_IMAGE',
    'SPAM',
    'THREAT',
    'COERCION',
    'REVENGE_PORN',
    'DOXXING',
    'PROSTITUTION_OR_ESCORT',
    'PAID_SEXUAL_SERVICES',
    'SCAM',
    'OTHER'
  ]),
  details: z.string().max(500).optional()
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = reportSchema.parse(req.body)

    // Reincidence signal feeds the rule engine (9.4) — count of the
    // target's currently open reports BEFORE this new one.
    const openReportCount = data.reportedUserId
      ? await prisma.report.count({ where: { reportedUserId: data.reportedUserId, status: { in: ['PENDING', 'REVIEWING'] } } })
      : undefined

    const { priority } = computeReportPriority({ reason: data.reason as ReportReasonValue, openReportCountForTarget: openReportCount })

    const report = await prisma.report.create({
      data: {
        reporterUserId: req.userId!,
        reportedUserId: data.reportedUserId,
        reportedMessageId: data.reportedMessageId,
        reportedEventId: data.reportedEventId,
        reason: data.reason,
        details: data.details,
        status: 'PENDING',
        priority
      }
    })

    // 9.1 — best-effort evidence capture at submission time. Never blocks
    // or fails the report itself if a snapshot can't be taken (e.g. the
    // referenced message/profile no longer exists).
    try {
      if (data.reportedMessageId) {
        if (data.messageSource === 'ROOM') {
          await captureMessageSnapshot(report.id, data.reportedMessageId, 'ROOM')
        } else if (data.messageSource === 'CONVERSATION') {
          await captureMessageSnapshot(report.id, data.reportedMessageId, 'CONVERSATION')
        } else {
          // No hint from the client — try both, whichever exists wins.
          const captured = await captureMessageSnapshot(report.id, data.reportedMessageId, 'CONVERSATION')
          if (!captured) await captureMessageSnapshot(report.id, data.reportedMessageId, 'ROOM')
        }
      }
      if (data.reportedUserId) {
        const targetProfile = await prisma.profile.findUnique({ where: { userId: data.reportedUserId }, select: { id: true } })
        if (targetProfile) await captureProfileSnapshot(report.id, targetProfile.id)
      }
    } catch (evidenceErr: any) {
      console.error('[REPORT EVIDENCE CAPTURE]', evidenceErr.message)
    }

    // 11.1 — behavioral signal, resolved from user->profile since Report
    // is anchored to User, RecommendationSignal to Profile. Best-effort.
    if (data.reportedUserId) {
      try {
        const [reporterProfile, reportedProfile] = await Promise.all([
          prisma.profile.findUnique({ where: { userId: req.userId! }, select: { id: true } }),
          prisma.profile.findUnique({ where: { userId: data.reportedUserId }, select: { id: true } }),
        ])
        if (reporterProfile && reportedProfile) {
          const { recordSignal } = await import('../lib/recommendationSignalService')
          recordSignal(reporterProfile.id, reportedProfile.id, 'REPORT').catch(() => {})
        }
      } catch { /* best-effort */ }
    }

    // 9.8/9.11 — best-effort, fire-and-forget: runModerationAssessment
    // already no-ops instantly if AI_MODERATION_ENABLED is off, and never
    // throws. Not awaited so report submission never waits on it.
    runModerationAssessment(report.id).catch((e: any) => console.error('[MODERATION AI]', e.message))

    res.status(201).json({ ok: true, reportId: report.id, priority })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[REPORT ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao submeter denúncia.' })
  }
})

export default router
