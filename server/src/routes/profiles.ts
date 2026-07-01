import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { coarsenCoordinate } from '../utils/location'

const router = Router()

const profileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  orientation: z.string().optional(),
  relationshipStatus: z.enum([
    'SINGLE','COMMITTED','MARRIED','OPEN',
    'POLYAMOROUS','COUPLE_CURIOUS','COUPLE_LIBERAL','OTHER'
  ]).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  // T6: coordinates accepted from client but coarsened before storage
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  discretionLevel: z.enum(['MAXIMUM','SELECTIVE','OPEN']).optional(),
  intentions: z.array(z.object({
    slug: z.string(),
    preference: z.enum(['YES','MAYBE','NO']).optional()
  })).optional(),
  onboardingStep: z.number().min(1).max(10).optional()
})

const ONBOARDING_STEPS = [
  { step: 1, name: 'account', label: 'Criar conta' },
  { step: 2, name: 'age_verification', label: 'Verificar idade' },
  { step: 3, name: 'profile_type', label: 'Tipo de perfil' },
  { step: 4, name: 'relationship_dynamic', label: 'Dinâmica relacional' },
  { step: 5, name: 'intentions', label: 'Intenções' },
  { step: 6, name: 'boundaries', label: 'Limites' },
  { step: 7, name: 'privacy', label: 'Privacidade' },
  { step: 8, name: 'photos', label: 'Fotos' },
  { step: 9, name: 'bio', label: 'Bio' },
  { step: 10, name: 'discovery_mode', label: 'Modo de descoberta' },
]

router.get('/onboarding/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  res.json({ steps: ONBOARDING_STEPS, currentStep: (profile as any)?.onboardingStep || 1 })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: {
      photos: { where: { moderationStatus: 'APPROVED' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      intentions: { include: { intention: true } },
      boundaries: { include: { boundary: true } },
      privacySettings: true,
      coupleProfile: true,
    }
  })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  // T6: never return exact coordinates to client
  const { locationLat, locationLng, ...safeProfile } = profile as any
  res.json(safeProfile)
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = profileSchema.parse(req.body)
    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } })

    if (existing) {
      const updated = await prisma.profile.update({
        where: { userId: req.userId! },
        data: {
          ...(data.displayName && { displayName: data.displayName }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.gender && { gender: data.gender }),
          ...(data.orientation && { orientation: data.orientation }),
          ...(data.relationshipStatus && { relationshipStatus: data.relationshipStatus }),
          ...(data.city && { city: data.city }),
          ...(data.country && { country: data.country }),
          // T6: coarsen before saving — 1 decimal place ≈ ±11km
          ...(data.locationLat !== undefined && { locationLat: coarsenCoordinate(data.locationLat) }),
          ...(data.locationLng !== undefined && { locationLng: coarsenCoordinate(data.locationLng) }),
          ...(data.discretionLevel && { discretionLevel: data.discretionLevel }),
        }
      })
      return res.json(updated)
    }

    if (!data.displayName) return res.status(400).json({ error: 'Nome obrigatório.' })

    const profile = await prisma.profile.create({
      data: {
        userId: req.userId!,
        displayName: data.displayName,
        bio: data.bio,
        gender: data.gender,
        orientation: data.orientation,
        relationshipStatus: data.relationshipStatus || 'SINGLE',
        city: data.city, country: data.country,
        // T6: coarsen before saving
        locationLat: data.locationLat !== undefined ? coarsenCoordinate(data.locationLat) : undefined,
        locationLng: data.locationLng !== undefined ? coarsenCoordinate(data.locationLng) : undefined,
        discretionLevel: data.discretionLevel || 'SELECTIVE',
        status: 'DRAFT',
        privacySettings: { create: {
          visibleInDiscovery: false, showDistance: true,
          showOnlineStatus: false, invisibleMode: false, notificationMode: 'DISCREET'
        }}
      }
    })

    if (data.intentions?.length) {
      const intentionRecords = await prisma.intention.findMany({
        where: { slug: { in: data.intentions.map(i => i.slug) } }
      })
      await prisma.profileIntention.createMany({
        data: intentionRecords.map(ir => {
          const match = data.intentions!.find(i => i.slug === ir.slug)
          return { profileId: profile.id, intentionId: ir.id, preference: match?.preference || 'YES' }
        })
      })
    }

    res.status(201).json(profile)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[CREATE PROFILE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/onboarding/step', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { step } = req.body
    if (!step || step < 1 || step > 10) return res.status(400).json({ error: 'Passo inválido.' })

    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const isProd = process.env.NODE_ENV === 'production'
    const completing = step >= 10

    const updated = await prisma.profile.update({
      where: { userId: req.userId! },
      data: {
        ...(completing && profile.status === 'DRAFT' && {
          status: isProd ? 'PENDING_REVIEW' : 'APPROVED'
        })
      }
    })

    if (completing) {
      await prisma.privacySettings.update({
        where: { profileId: profile.id },
        data: { visibleInDiscovery: true }
      })
    }

    res.json({ ok: true, profile: updated, completed: completing })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

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
        // T6: coarsen coordinates on update too
        ...(data.locationLat !== undefined && { locationLat: coarsenCoordinate(data.locationLat) }),
        ...(data.locationLng !== undefined && { locationLng: coarsenCoordinate(data.locationLng) }),
        ...(data.discretionLevel && { discretionLevel: data.discretionLevel }),
      }
    })

    if (data.intentions) {
      await prisma.profileIntention.deleteMany({ where: { profileId: updated.id } })
      const intentionRecords = await prisma.intention.findMany({
        where: { slug: { in: data.intentions.map(i => i.slug) } }
      })
      await prisma.profileIntention.createMany({
        data: intentionRecords.map(ir => {
          const match = data.intentions!.find(i => i.slug === ir.slug)
          return { profileId: updated.id, intentionId: ir.id, preference: match?.preference || 'YES' }
        })
      })
    }

    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.id },
    include: {
      photos: { where: { moderationStatus: 'APPROVED', visibilityLevel: 'PUBLIC' }, orderBy: [{ isPrimary: 'desc' }] },
      intentions: { include: { intention: true } },
      privacySettings: true,
    }
  })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  if (profile.visibilityMode === 'INVISIBLE') return res.status(404).json({ error: 'Perfil não encontrado.' })
  if (profile.status !== 'APPROVED') return res.status(404).json({ error: 'Perfil não disponível.' })

  // T6: strip exact coordinates from public API response
  const { userId, locationLat, locationLng, ...publicProfile } = profile as any
  res.json(publicProfile)
})

router.put('/:id/boundaries', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
  const { boundaries } = req.body
  if (!Array.isArray(boundaries)) return res.status(400).json({ error: 'Formato inválido.' })
  await prisma.profileBoundary.deleteMany({ where: { profileId: profile.id } })
  await prisma.profileBoundary.createMany({
    data: boundaries.map((b: any) => ({ profileId: profile.id, boundaryId: b.boundaryId, preference: b.preference }))
  })
  res.json({ message: 'Limites actualizados.' })
})

router.put('/:id/privacy', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
  const isPremium = sub && sub.plan !== 'FREE'
  if (req.body.invisibleMode && !isPremium) {
    return res.status(403).json({ error: 'Modo invisível requer Premium.', code: 'PREMIUM_REQUIRED' })
  }
  const settings = await prisma.privacySettings.upsert({
    where: { profileId: profile.id }, update: req.body, create: { profileId: profile.id, ...req.body }
  })
  res.json(settings)
})

export default router
