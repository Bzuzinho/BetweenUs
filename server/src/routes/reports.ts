import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const reportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  reportedMessageId: z.string().uuid().optional(),
  reason: z.enum([
    'FAKE_PROFILE','HARASSMENT','OFFENSIVE_CONTENT','MINOR',
    'NON_CONSENSUAL_IMAGE','SPAM','THREAT','OTHER'
  ]),
  details: z.string().max(500).optional()
})

// Point 18: critical reasons get automatic high priority for faster review
const CRITICAL_REASONS = ['MINOR', 'THREAT', 'NON_CONSENSUAL_IMAGE', 'HARASSMENT']
const getPriority = (reason: string): number => CRITICAL_REASONS.includes(reason) ? 10 : 0

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = reportSchema.parse(req.body)

    // Point 18: check for reincidence — same reporter+reported pair recently,
    // or this reported user already has multiple reports → bump priority further
    let priority = getPriority(data.reason)
    if (data.reportedUserId) {
      const recentReportsCount = await prisma.report.count({
        where: { reportedUserId: data.reportedUserId, status: { in: ['PENDING', 'REVIEWING'] } }
      })
      if (recentReportsCount >= 2) priority = Math.max(priority, 8) // reincidence bump
    }

    const report = await prisma.report.create({
      data: {
        reporterUserId: req.userId!,
        reportedUserId: data.reportedUserId,
        reportedMessageId: data.reportedMessageId,
        reason: data.reason,
        details: data.details,
        status: 'PENDING',
        priority
      }
    })

    res.status(201).json({ ok: true, reportId: report.id, priority })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[REPORT ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao submeter denúncia.' })
  }
})

export default router
