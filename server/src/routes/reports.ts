import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// T7: full report reason enum including previously missing critical categories
const reportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  reportedMessageId: z.string().uuid().optional(),
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

// T7: extended priority mapping including new categories
const PRIORITY_MAP: Record<string, number> = {
  MINOR: 10,
  THREAT: 10,
  NON_CONSENSUAL_IMAGE: 10,
  REVENGE_PORN: 10,
  HARASSMENT: 8,
  COERCION: 8,
  DOXXING: 8,
  PROSTITUTION_OR_ESCORT: 7,
  PAID_SEXUAL_SERVICES: 7,
  FAKE_PROFILE: 5,
  SCAM: 5,
  OFFENSIVE_CONTENT: 3,
  SPAM: 1,
  OTHER: 0,
}

const getPriority = (reason: string): number => PRIORITY_MAP[reason] ?? 0

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = reportSchema.parse(req.body)

    let priority = getPriority(data.reason)

    // Reincidence bump: if reported user already has ≥2 pending/reviewing reports
    if (data.reportedUserId) {
      const recentCount = await prisma.report.count({
        where: { reportedUserId: data.reportedUserId, status: { in: ['PENDING', 'REVIEWING'] } }
      })
      if (recentCount >= 2) priority = Math.max(priority, 8)
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
