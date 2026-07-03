import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { coarsenCoordinate } from '../utils/location'

const router = Router()

const profileSchema = z.object({
  displayName:        z.string().min(2).max(50).optional(),
  bio:                z.string().max(500).optional(),
  gender:             z.string().optional(),
  orientation:        z.string().optional(),
  relationshipStatus: z.enum(['SINGLE','COMMITTED','MARRIED','OPEN','POLYAMOROUS','COUPLE_CURIOUS','COUPLE_LIBERAL','OTHER']).optional(),
  city:               z.string().optional(),
  country:            z.string().optional(),
  locationLat:        z.number().min(-90).max(90).optional(),
  locationLng:        z.number().min(-180).max(180).optional(),
  discretionLevel:    z.enum(['MAXIMUM','SELECTIVE','OPEN']).optional(),
  intentions: z.array(z.union([
    z.object({ slug: z.string(), preference: z.enum(['YES','MAYBE','NO']).optional() }),
    z.string()
  ])).optional(),
  onboardingStep: z.number().min(1).max(10).optional()
})

const normaliseIntentions = (raw: any[]): { slug: string; preference: 'YES'|'MAYBE'|'NO' }[] =>
  raw.map(i => typeof i === 'string' ? { slug: i, preference: 'YES' as const } : { slug: i.slug, preference: i.preference || 'YES' as const })

async function upsertIntentions(profileId: string, intentions: { slug: string; preference: 'YES'|'MAYBE'|'NO' }[]) {
  for (const { slug } of intentions) {
    await prisma.intention.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug.replace(/_/g, ' '), active: true }
    })
  }
  const records = await prisma.intention.findMany({ where: { slug: { in: intentions.map(i => i.slug) } } })
  await prisma.profileIntention.deleteMany({ where: { profileId } })
  await prisma.profileIntention.createMany({
    data: records.map(ir => {
      const match = intentions.find(i => i.slug === ir.slug)
      return { profileId, intentionId: ir.id, preference: match?.preference || 'YES' }
    })
  })
}

router.get('/onboarding/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  res.json({ steps: [], currentStep: (profile as any)?.onboardingStep || 1 })
})

// GET /api/profiles/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: {
      photos:          { where: { moderationStatus: 'APPROVED' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      intentions:      { include: { intention: true } },
      boundaries:      { include: { boundary: true } },
      privacySettings: true,
      coupleProfile:   true,
    }
  })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const { locationLat, locationLng, ...safeProfile } = profile as any
  res.json(safeProfile)
})

// PUT /api/profiles/me  ← new: edit own profile
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const data = profileSchema.partial().parse(req.body)
    const updated = await prisma.profile.update({
      where: { userId: req.userId! },
      data: {
        ...(data.displayName      !== undefined && { displayName: data.displayName }),
        ...(data.bio              !== undefined && { bio: data.bio }),
        ...(data.gender           !== undefined && { gender: data.gender }),
        ...(data.orientation      !== undefined && { orientation: data.orientation }),
        ...(data.relationshipStatus !== undefined && { relationshipStatus: data.relationshipStatus }),
        ...(data.city             !== undefined && { city: data.city }),
        ...(data.country          !== undefined && { country: data.country }),
        ...(data.locationLat      !== undefined && { locationLat: coarsenCoordinate(data.locationLat) }),
        ...(data.locationLng      !== undefined && { locationLng: coarsenCoordinate(data.locationLng) }),
        ...(data.discretionLevel  !== undefined && { discretionLevel: data.discretionLevel }),
      }
    })
    if (data.intentions?.length) await upsertIntentions(profile.id, normaliseIntentions(data.intentions))
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/profiles — create
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = profileSchema.parse(req.body)
    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    const isProd = process.env.NODE_ENV === 'production'

    if (existing) {
      const updated = await prisma.profile.update({
        where: { userId: req.userId! },
        data: {
          ...(data.displayName      !== undefined && { displayName: data.displayName }),
          ...(data.bio              !== undefined && { bio: data.bio }),
          ...(data.gender           !== undefined && { gender: data.gender }),
          ...(data.orientation      !== undefined && { orientation: data.orientation }),
          ...(data.relationshipStatus !== undefined && { relationshipStatus: data.relationshipStatus }),
          ...(data.city             !== undefined && { city: data.city }),
          ...(data.country          !== undefined && { country: data.country }),
          ...(data.locationLat      !== undefined && { locationLat: coarsenCoordinate(data.locationLat) }),
          ...(data.locationLng      !== undefined && { locationLng: coarsenCoordinate(data.locationLng) }),
          ...(data.discretionLevel  !== undefined && { discretionLevel: data.discretionLevel }),
        }
      })
      if (data.intentions?.length) await upsertIntentions(updated.id, normaliseIntentions(data.intentions))
      return res.json(updated)
    }

    if (!data.displayName) return res.status(400).json({ error: 'Nome visível obrigatório.' })

    const profile = await prisma.profile.create({
      data: {
        userId:             req.userId!,
        displayName:        data.displayName,
        bio:                data.bio,
        gender:             data.gender,
        orientation:        data.orientation,
        relationshipStatus: data.relationshipStatus || 'SINGLE',
        city:               data.city,
        country:            data.country,
        locationLat:        data.locationLat !== undefined ? coarsenCoordinate(data.locationLat) : undefined,
        locationLng:        data.locationLng !== undefined ? coarsenCoordinate(data.locationLng) : undefined,
        discretionLevel:    data.discretionLevel || 'SELECTIVE',
        status:             isProd ? 'PENDING_REVIEW' : 'APPROVED',
        privacySettings: { create: {
          visibleInDiscovery: false, showDistance: true,
          showOnlineStatus: false, invisibleMode: false, notificationMode: 'DISCREET'
        }}
      }
    })

    if (data.intentions?.length) await upsertIntentions(profile.id, normaliseIntentions(data.intentions))
    res.status(201).json(profile)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[CREATE PROFILE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil.' })
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
      data: { ...(completing && profile.status === 'DRAFT' && { status: isProd ? 'PENDING_REVIEW' : 'APPROVED' }) }
    })
    if (completing) {
      await prisma.privacySettings.update({ where: { profileId: profile.id }, data: { visibleInDiscovery: true } })
    }
    res.json({ ok: true, profile: updated, completed: completing })
  } catch {
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
        ...(data.displayName      !== undefined && { displayName: data.displayName }),
        ...(data.bio              !== undefined && { bio: data.bio }),
        ...(data.gender           !== undefined && { gender: data.gender }),
        ...(data.orientation      !== undefined && { orientation: data.orientation }),
        ...(data.relationshipStatus !== undefined && { relationshipStatus: data.relationshipStatus }),
        ...(data.city             !== undefined && { city: data.city }),
        ...(data.country          !== undefined && { country: data.country }),
        ...(data.locationLat      !== undefined && { locationLat: coarsenCoordinate(data.locationLat) }),
        ...(data.locationLng      !== undefined && { locationLng: coarsenCoordinate(data.locationLng) }),
        ...(data.discretionLevel  !== undefined && { discretionLevel: data.discretionLevel }),
      }
    })
    if (data.intentions?.length) await upsertIntentions(updated.id, normaliseIntentions(data.intentions))
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.id },
    include: { photos: { where: { moderationStatus: 'APPROVED', visibilityLevel: 'PUBLIC' }, orderBy: [{ isPrimary: 'desc' }] }, intentions: { include: { intention: true } }, privacySettings: true }
  })
  if (!profile || profile.status !== 'APPROVED') return res.status(404).json({ error: 'Perfil não encontrado.' })
  const { userId, locationLat, locationLng, ...pub } = profile as any
  res.json(pub)
})

router.put('/:id/boundaries', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
  const { boundaries } = req.body
  if (!Array.isArray(boundaries)) return res.status(400).json({ error: 'Formato inválido.' })
  await prisma.profileBoundary.deleteMany({ where: { profileId: profile.id } })
  await prisma.profileBoundary.createMany({ data: boundaries.map((b: any) => ({ profileId: profile.id, boundaryId: b.boundaryId, preference: b.preference })) })
  res.json({ message: 'Limites actualizados.' })
})

router.put('/:id/privacy', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
  if (req.body.invisibleMode && (!sub || sub.plan === 'FREE')) return res.status(403).json({ error: 'Modo invisível requer Premium.', code: 'PREMIUM_REQUIRED' })
  const settings = await prisma.privacySettings.upsert({ where: { profileId: profile.id }, update: req.body, create: { profileId: profile.id, ...req.body } })
  res.json(settings)
})

export default router
