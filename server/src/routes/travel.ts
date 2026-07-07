import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/travel/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

  const modes = await prisma.travelMode.findMany({
    where: { profileId: profile.id },
    orderBy: { startDate: 'desc' }
  })
  res.json({ travelModes: modes })
})

// POST /api/travel — activate travel mode
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city, country, startDate, endDate } = req.body
    if (!city || !startDate || !endDate) {
      return res.status(400).json({ error: 'Cidade, data de início e fim são obrigatórias.' })
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: 'Data de fim deve ser posterior ao início.' })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Deactivate any current travel modes
    await prisma.travelMode.updateMany({
      where: { profileId: profile.id, active: true },
      data: { active: false }
    })

    const travel = await prisma.travelMode.create({
      data: {
        profileId: profile.id,
        city, country,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        active: true
      }
    })

    // 5.8 — Travel Mode now actually feeds BetweenScoreService's location
    // dimension (5.2 pipeline step 10) - before Sprint 5 this route had
    // zero effect on discovery at all, so there was nothing to invalidate.
    const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
    await invalidateScoresForProfile(profile.id).catch(() => {})

    res.status(201).json({ travelMode: travel })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/travel/:id — deactivate travel mode
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

  await prisma.travelMode.update({
    where: { id: req.params.id },
    data: { active: false }
  })
  const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
  await invalidateScoresForProfile(profile.id).catch(() => {})
  res.json({ ok: true })
})

export default router
