import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const profileSchema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  orientation: z.string().optional(),
  relationshipStatus: z.enum([
    'SINGLE','COMMITTED','MARRIED','OPEN',
    'POLYAMOROUS','COUPLE_CURIOUS','COUPLE_LIBERAL','OTHER'
  ]).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  discretionLevel: z.enum(['MAXIMUM','SELECTIVE','OPEN']).optional(),
  intentions: z.array(z.string()).optional(),
})

// GET /api/profiles/me — get own profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: {
      photos: { where: { moderationStatus: 'APPROVED' }, orderBy: { sortOrder: 'asc' } },
      intentions: { include: { intention: true } },
      boundaries: { include: { boundary: true } },
      privacySettings: true,
      coupleProfile: true,
    }
  })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  res.json(profile)
})

// POST /api/profiles — create profile
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = profileSchema.parse(req.body)

    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (existing) return res.status(409).json({ error: 'Já tens um perfil criado.' })

    const profile = await prisma.profile.create({
      data: {
        userId: req.userId!,
        displayName: data.displayName,
        bio: data.bio,
        gender: data.gender,
        orientation: data.orientation,
        relationshipStatus: data.relationshipStatus || 'SINGLE',
        city: data.city,
        country: data.country,
        discretionLevel: data.discretionLevel || 'SELECTIVE',
        privacySettings: {
          create: {
            visibleInDiscovery: true,
            showDistance: true,
            showOnlineStatus: false,
            invisibleMode: false,
            notificationMode: 'DISCREET'
          }
        }
      }
    })

    // Add intentions if provided
    if (data.intentions?.length) {
      const intentionRecords = await prisma.intention.findMany({
        where: { slug: { in: data.intentions } }
      })
      await prisma.profileIntention.createMany({
        data: intentionRecords.map(i => ({ profileId: profile.id, intentionId: i.id }))
      })
    }

    res.status(201).json(profile)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[CREATE PROFILE]', err)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/profiles/:id — update profile
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })

    const data = profileSchema.partial().parse(req.body)
    const updated = await prisma.profile.update({
      where: { id: req.params.id },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.gender && { gender: data.gender }),
        ...(data.orientation && { orientation: data.orientation }),
        ...(data.relationshipStatus && { relationshipStatus: data.relationshipStatus }),
        ...(data.city && { city: data.city }),
        ...(data.country && { country: data.country }),
        ...(data.discretionLevel && { discretionLevel: data.discretionLevel }),
      }
    })

    // Update intentions
    if (data.intentions) {
      await prisma.profileIntention.deleteMany({ where: { profileId: updated.id } })
      const intentionRecords = await prisma.intention.findMany({
        where: { slug: { in: data.intentions } }
      })
      await prisma.profileIntention.createMany({
        data: intentionRecords.map(i => ({ profileId: updated.id, intentionId: i.id }))
      })
    }

    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[UPDATE PROFILE]', err)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/profiles/:id — view a profile (public)
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.id },
    include: {
      photos: {
        where: { moderationStatus: 'APPROVED', visibilityLevel: 'PUBLIC' },
        orderBy: { sortOrder: 'asc' }
      },
      intentions: { include: { intention: true } },
      privacySettings: true,
    }
  })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  if (profile.visibilityMode === 'INVISIBLE') {
    return res.status(404).json({ error: 'Perfil não encontrado.' })
  }

  // Mask sensitive data for public view
  const { userId, locationLat, locationLng, ...publicProfile } = profile as any
  res.json(publicProfile)
})

// PUT /api/profiles/:id/boundaries — update limits map
router.put('/:id/boundaries', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || profile.userId !== req.userId) {
    return res.status(403).json({ error: 'Sem permissão.' })
  }
  const { boundaries } = req.body
  if (!Array.isArray(boundaries)) return res.status(400).json({ error: 'Formato inválido.' })

  await prisma.profileBoundary.deleteMany({ where: { profileId: profile.id } })
  await prisma.profileBoundary.createMany({
    data: boundaries.map((b: any) => ({
      profileId: profile.id,
      boundaryId: b.boundaryId,
      preference: b.preference
    }))
  })
  res.json({ message: 'Limites atualizados.' })
})

// PUT /api/profiles/:id/privacy — update privacy settings
router.put('/:id/privacy', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || profile.userId !== req.userId) {
    return res.status(403).json({ error: 'Sem permissão.' })
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
  const isPremium = subscription && subscription.plan !== 'FREE'

  // Invisible mode is premium only
  if (req.body.invisibleMode && !isPremium) {
    return res.status(403).json({ error: 'Modo invisível requer subscrição Premium.', code: 'PREMIUM_REQUIRED' })
  }

  const settings = await prisma.privacySettings.upsert({
    where: { profileId: profile.id },
    update: req.body,
    create: { profileId: profile.id, ...req.body }
  })
  res.json(settings)
})

export default router
