import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/travel — listar modos de viagem ativos do utilizador
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const travels = await prisma.travelMode.findMany({
      where: { profileId: profile.id },
      orderBy: { startDate: 'asc' }
    })

    res.json({ travels })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/travel — criar modo de viagem
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city, country, startDate, endDate } = req.body

    if (!city || !startDate || !endDate) {
      return res.status(400).json({ error: 'Cidade, data de início e fim são obrigatórias.' })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Datas inválidas.' })
    }
    if (end <= start) {
      return res.status(400).json({ error: 'A data de fim deve ser após a data de início.' })
    }
    if (end < new Date()) {
      return res.status(400).json({ error: 'Não podes criar viagens no passado.' })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Máximo de 5 viagens ativas
    const activeCount = await prisma.travelMode.count({
      where: { profileId: profile.id, active: true, endDate: { gte: new Date() } }
    })
    if (activeCount >= 5) {
      return res.status(400).json({ error: 'Máximo de 5 viagens ativas.' })
    }

    const travel = await prisma.travelMode.create({
      data: {
        profileId: profile.id,
        city: city.trim(),
        country: country?.trim() || null,
        startDate: start,
        endDate: end,
        active: true
      }
    })

    res.status(201).json({ travel })
  } catch (err: any) {
    console.error('[TRAVEL CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar viagem.' })
  }
})

// PUT /api/travel/:id — atualizar viagem
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const travel = await prisma.travelMode.findUnique({
      where: { id: req.params.id }
    })
    if (!travel) return res.status(404).json({ error: 'Viagem não encontrada.' })
    if (travel.profileId !== profile.id) {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    const { city, country, startDate, endDate, active } = req.body

    const updated = await prisma.travelMode.update({
      where: { id: req.params.id },
      data: {
        ...(city && { city: city.trim() }),
        ...(country !== undefined && { country: country?.trim() || null }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(active !== undefined && { active })
      }
    })

    res.json({ travel: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/travel/:id — apagar viagem
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const travel = await prisma.travelMode.findUnique({
      where: { id: req.params.id }
    })
    if (!travel) return res.status(404).json({ error: 'Viagem não encontrada.' })
    if (travel.profileId !== profile.id) {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    await prisma.travelMode.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/travel/discovery — perfis que viajam para a mesma cidade no mesmo período
router.get('/discovery', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city, startDate, endDate } = req.query

    if (!city) {
      return res.status(400).json({ error: 'Cidade obrigatória.' })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const start = startDate ? new Date(startDate as string) : new Date()
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

    // Encontrar perfis com Travel Mode ativo para essa cidade e período
    const travels = await prisma.travelMode.findMany({
      where: {
        city: { contains: city as string, mode: 'insensitive' },
        active: true,
        startDate: { lte: end },
        endDate: { gte: start },
        profileId: { not: profile.id },
        profile: {
          status: 'active',
          visibilityMode: { not: 'INVISIBLE' },
          userId: { not: req.userId! }
        }
      },
      include: {
        profile: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            city: true,
            type: true,
            relationshipStatus: true,
            discretionLevel: true,
            photos: {
              where: { moderationStatus: 'APPROVED', isPrimary: true },
              take: 1
            },
            intentions: { include: { intention: true } }
          }
        }
      },
      take: 20
    })

    const results = travels.map(t => ({
      travelId: t.id,
      city: t.city,
      country: t.country,
      startDate: t.startDate,
      endDate: t.endDate,
      profile: t.profile
    }))

    res.json({ results, city, total: results.length })
  } catch (err: any) {
    console.error('[TRAVEL DISCOVERY]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
