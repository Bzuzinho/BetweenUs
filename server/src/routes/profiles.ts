import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { coarsenCoordinate } from '../utils/location'
import { mergePhotosForViewer } from '../lib/mediaAccessService'
import { getVerificationBadges } from '../lib/verificationBadges'
import { isActiveMember, getActiveMembers, resolveMyProfileId } from '../lib/profileMembershipService'
import { evaluateCompleteness } from '../lib/profileCompletenessService'

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

// 4.1: delegates to ProfileMembershipService.isActiveMember, which owns
// the ProfileMember-first / CoupleProfile-fallback logic in one place
// instead of duplicating it here.
async function canManageProfile(profileId: string, userId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { userId: true } })
  if (!profile) return false
  if (profile.userId === userId) return true
  return isActiveMember(profileId, userId)
}

// 6.1 — resolveMyProfileId moved to profileMembershipService.ts (imported
// at top of file) so every Sprint 6 router can share the exact same
// resolution logic instead of re-deriving it.


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
    data: (records as { id: string; slug: string }[]).map((ir: { id: string; slug: string }) => {
      const match = intentions.find(i => i.slug === ir.slug)
      return { profileId, intentionId: ir.id, preference: match?.preference || 'YES' }
    })
  })
  // 5.8 — single hook point for all 4 call sites (PUT /me, PUT /:id, POST /
  // create+update branches) instead of invalidating at each route.
  const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
  await invalidateScoresForProfile(profileId).catch(() => {})
}

router.get('/onboarding/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  res.json({ steps: [], currentStep: (profile as any)?.onboardingStep || 1 })
})

// 4.10 — save/resume for the Create Profile wizard (CreateProfilePage.jsx),
// which collects everything client-side and only calls POST /profiles once
// at the very end. Before this, closing the tab mid-wizard lost everything.
// This does NOT change that "submit once" shape — it just persists a draft
// blob alongside it so the wizard can prefill on return. Deliberately
// separate from the /onboarding/step(s) routes above, which predate the
// current wizard and aren't called by any frontend code.
router.get('/onboarding/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } })
  if (existing) return res.json({ progress: null, reason: 'PROFILE_ALREADY_EXISTS' })
  const draft = await (prisma as any).onboardingProgress.findUnique({ where: { userId: req.userId! } })
  res.json({ progress: draft ? { step: draft.step, data: draft.data } : null })
})

router.put('/onboarding/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  const { step, data } = req.body
  if (typeof step !== 'number' || step < 1) return res.status(400).json({ error: 'Passo inválido.' })
  if (data && typeof data !== 'object') return res.status(400).json({ error: 'Dados inválidos.' })
  await (prisma as any).onboardingProgress.upsert({
    where:  { userId: req.userId! },
    update: { step, data: data || {} },
    create: { userId: req.userId!, step, data: data || {} }
  })
  res.json({ ok: true })
})

// GET /api/profiles/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      photos:          { where: { moderationStatus: 'APPROVED' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      intentions:      { include: { intention: true } },
      boundaries:      { include: { boundary: true } },
      privacySettings: true,
      coupleProfile:   true,
      user:            { select: { verification: { select: { type: true, status: true } } } },
    }
  })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const { locationLat, locationLng, photos, user, ...safeProfile } = profile as any
  // 3.1: sign photo URLs fresh on every read instead of exposing storage keys/permanent URLs
  const resolvedPhotos = await mergePhotosForViewer(photos, {
    ownerUserId: req.userId!,
    viewerUserId: req.userId!,
    viewerProfileId: profile.id
  })
  // 3.4: public verification badge, derived from Verification.status, not exposed elsewhere
  // 4.9: completeness is computed server-side so the frontend never hardcodes
  // a percentage — { score, complete, missing: [...] }
  const completeness = await evaluateCompleteness(profile as any)
  res.json({ ...safeProfile, photos: resolvedPhotos, verificationBadges: getVerificationBadges(user?.verification), completeness })
})

// PUT /api/profiles/me  ← new: edit own profile
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const data = profileSchema.partial().parse(req.body)
    const updated = await prisma.profile.update({
      where: { id: profileId },
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
    // 5.8 — relationshipStatus/discretionLevel/city/location all feed
    // BetweenScoreService directly, independent of whether intentions were
    // also touched in this same request (upsertIntentions invalidates on
    // its own path, redundant-but-harmless if both fire).
    const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
    await invalidateScoresForProfile(updated.id).catch(() => {})
    if (data.intentions?.length) await upsertIntentions(updated.id, normaliseIntentions(data.intentions))
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
      const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
      await invalidateScoresForProfile(updated.id).catch(() => {})
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
    // 4.10 — the real Profile now exists, so the onboarding draft (if any)
    // is done serving its purpose. Best-effort: a failure here shouldn't
    // fail profile creation itself, it'd just leave one harmless stale row.
    await (prisma as any).onboardingProgress.delete({ where: { userId: req.userId! } }).catch(() => {})
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
    if (!(await canManageProfile(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })
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
    const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
    await invalidateScoresForProfile(updated.id).catch(() => {})
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
    // 3.1/3.2 fix: this used to hard-filter to visibilityLevel:'PUBLIC', which
    // meant BLURRED/PRIVATE_AFTER_MATCH/PRIVATE_AFTER_APPROVAL photos never
    // reached the client at all — not even blurred. Access is now decided
    // per-viewer below via mergePhotosForViewer instead of at the query level.
    include: {
      photos: { where: { moderationStatus: 'APPROVED' }, orderBy: [{ isPrimary: 'desc' }] },
      intentions: { include: { intention: true } },
      privacySettings: true,
      user: { select: { verification: { select: { type: true, status: true } } } },
    }
  })
  if (!profile || profile.status !== 'APPROVED') return res.status(404).json({ error: 'Perfil não encontrado.' })
  const { userId, locationLat, locationLng, photos, user, ...pub } = profile as any

  const viewerProfileId = await resolveMyProfileId(req.userId!)
  const resolvedPhotos = await mergePhotosForViewer(photos, {
    ownerUserId: userId,
    viewerUserId: req.userId!,
    viewerProfileId
  })

  // 11.1/11.5.6 — PROFILE_VIEW signal, fire-and-forget, deduped to at
  // most one per (viewer, target) pair per UTC day (see
  // recordProfileViewSignal) so repeated GET /profiles/:id calls from the
  // same viewer in one session don't inflate this signal. Also no-ops
  // when actor===target (viewing your own profile).
  if (viewerProfileId) {
    import('../lib/recommendationSignalService').then(({ recordProfileViewSignal }) => {
      recordProfileViewSignal(viewerProfileId, profile.id).catch(() => {})
    }).catch(() => {})
  }

  res.json({ ...pub, photos: resolvedPhotos, verificationBadges: getVerificationBadges(user?.verification) })
})

router.put('/me/boundaries', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const { boundaries } = req.body
  if (!Array.isArray(boundaries)) return res.status(400).json({ error: 'Formato inválido.' })
  await prisma.profileBoundary.deleteMany({ where: { profileId } })
  await prisma.profileBoundary.createMany({ data: boundaries.map((b: any) => ({ profileId, boundaryId: b.boundaryId, preference: b.preference })) })
  const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
  await invalidateScoresForProfile(profileId).catch(() => {})
  res.json({ message: 'Limites actualizados.' })
})

router.put('/:id/boundaries', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || !(await canManageProfile(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })
  const { boundaries } = req.body
  if (!Array.isArray(boundaries)) return res.status(400).json({ error: 'Formato inválido.' })
  await prisma.profileBoundary.deleteMany({ where: { profileId: profile.id } })
  await prisma.profileBoundary.createMany({ data: boundaries.map((b: any) => ({ profileId: profile.id, boundaryId: b.boundaryId, preference: b.preference })) })
  const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
  await invalidateScoresForProfile(profile.id).catch(() => {})
  res.json({ message: 'Limites actualizados.' })
})

router.put('/:id/privacy', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } })
  if (!profile || !(await canManageProfile(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
  if (req.body.invisibleMode && (!sub || sub.plan === 'FREE')) return res.status(403).json({ error: 'Modo invisível requer Premium.', code: 'PREMIUM_REQUIRED' })
  const settings = await prisma.privacySettings.upsert({ where: { profileId: profile.id }, update: req.body, create: { profileId: profile.id, ...req.body } })
  res.json(settings)
})

export default router
