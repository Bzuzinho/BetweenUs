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

// POST /api/reports
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = reportSchema.parse(req.body)

    const report = await prisma.report.create({
      data: {
        reporterUserId: req.userId!,
        reportedUserId: data.reportedUserId,
        reportedMessageId: data.reportedMessageId,
        reason: data.reason,
        details: data.details,
        status: 'PENDING'
      }
    })

    res.status(201).json({ ok: true, reportId: report.id })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message })
    }
    console.error('[REPORT ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao submeter denúncia.' })
  }
})

export default router
