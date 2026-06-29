import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/consent/check — initiate a consent check
router.post('/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, phase } = req.body
    if (!matchId || !phase) {
      return res.status(400).json({ error: 'matchId e phase são obrigatórios.' })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const check = await prisma.consentCheck.create({
      data: {
        matchId,
        profileId: profile.id,
        phase,
        status: 'PENDING',
        initiatedBy: req.userId!,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      }
    })

    res.status(201).json({ consentCheck: check })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/consent/check/:id — respond to consent check
router.put('/check/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body // ACCEPTED | DECLINED
    if (!['ACCEPTED','DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' })
    }

    const check = await prisma.consentCheck.findUnique({ where: { id: req.params.id } })
    if (!check) return res.status(404).json({ error: 'Consent check não encontrado.' })
    if (check.expiresAt && check.expiresAt < new Date()) {
      await prisma.consentCheck.update({ where: { id: check.id }, data: { status: 'EXPIRED' } })
      return res.status(400).json({ error: 'Este consent check expirou.' })
    }

    const updated = await prisma.consentCheck.update({
      where: { id: req.params.id },
      data: { status, respondedAt: new Date() }
    })

    res.json({ consentCheck: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/consent/match/:matchId — get consent checks for a match
router.get('/match/:matchId', requireAuth, async (req: AuthRequest, res: Response) => {
  const checks = await prisma.consentCheck.findMany({
    where: { matchId: req.params.matchId },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ checks })
})

export default router
