import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/safety/checkin — create safety checkin
router.post('/checkin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, scheduledAt, locationHint } = req.body
    if (!scheduledAt) return res.status(400).json({ error: 'Hora de check-in obrigatória.' })

    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const checkin = await prisma.safetyCheckin.create({
      data: {
        profileId: profile.id,
        matchId,
        scheduledAt: new Date(scheduledAt),
        locationHint
      }
    })

    res.status(201).json({ checkin })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/safety/checkin/:id/confirm — confirm you're safe
router.put('/checkin/:id/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  const checkin = await prisma.safetyCheckin.update({
    where: { id: req.params.id },
    data: { confirmedAt: new Date() }
  })
  res.json({ ok: true, checkin })
})

// PUT /api/safety/checkin/:id/cancel
router.put('/checkin/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const checkin = await prisma.safetyCheckin.update({
    where: { id: req.params.id },
    data: { cancelledAt: new Date() }
  })
  res.json({ ok: true, checkin })
})

// GET /api/safety/checkins/me
router.get('/checkins/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

  const checkins = await prisma.safetyCheckin.findMany({
    where: { profileId: profile.id },
    orderBy: { scheduledAt: 'desc' },
    take: 10
  })
  res.json({ checkins })
})

export default router
