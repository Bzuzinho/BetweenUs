import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { coarsenCoordinate } from '../utils/location'
import { mergePhotosForViewer } from '../lib/mediaAccessService'
import { getVerificationBadges } from '../lib/verificationBadges'
import { isActiveMember, getActiveMembers, resolveMyProfileId, getRequiredApprovers } from '../lib/profileMembershipService'
import { evaluateCompleteness } from '../lib/profileCompletenessService'
import { canChangeHomeLocation, getHomeLocation } from '../lib/effectiveLocationService'

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
  onboardingStep: z.number().min(1).max(10).optional(),
  // Sistema de localidades (GeoNames) — secção 12 do pedido. homeLocationId
  // aponta para o catálogo GeoLocation (nunca texto livre); customLocality
  // é só apresentação (nunca usado para distância — ver distanceService.ts);
  // locationVisibility controla o que resolveDisplayLabel mostra no perfil
  // (CUSTOM_LOCALITY/REFERENCE_LOCALITY/REGION_ONLY). city/country
  // permanecem no schema para compatibilidade legacy (ver
  // effectiveLocationService.ts) e continuam aceites — um perfil pode
  // adoptar o catálogo aos poucos sem perder o que já tinha.
  homeLocationId:     z.string().nullable().optional(),
  customLocality:     z.string().max(120).nullable().optional(),
  locationVisibility: z.enum(['CUSTOM_LOCALITY', 'REFERENCE_LOCALITY', 'REGION_ONLY']).optional(),
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

// Sistema de localidades — nunca aceitar um homeLocationId às cegas: tem de
// existir no catálogo e estar activo (uma localidade desactivada por um
// admin, ver routes/locations.ts PUT /admin/:id/deactivate, deixa de poder
// ser escolhida por perfis novos, mas os perfis que já a tinham mantêm a
// referência — só a pesquisa/selecção nova é bloqueada aqui).
async function validateHomeLocationId(homeLocationId: string | null | undefined): Promise<string | null> {
  if (!homeLocationId) return null // null/undefined — nada para validar
  const location = await (prisma as any).geoLocation.findUnique({ where: { id: homeLocationId }, select: { id: true, active: true } })
  if (!location || !location.active) return 'Localidade de referência inválida.'
  return null
}


async function upsertIntentions(profileId: string, intentions: { slug: string; preference: 'YES'|'MAYBE'|'NO' }[]) {
  const requestedSlugs = [...new Set(intentions.map(i => i.slug))]
  const records = await prisma.intention.findMany({ where: { slug: { in: requestedSlugs }, active: true } })
  const knownSlugs = new Set(records.map(i => i.slug))
  const unknownSlugs = requestedSlugs.filter(slug => !knownSlugs.has(slug))
  if (unknownSlugs.length) {
    throw Object.assign(new Error('Uma ou mais intenções já não existem no catálogo.'), {
      statusCode: 400,
      code: 'UNKNOWN_INTENTIONS',
      unknownSlugs,
    })
  }
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
  // Sistema de localidades — só o rótulo pronto a mostrar (nunca
  // latitude/longitude, mesmo aqui em /me: secção 9 do pedido é explícita
  // que as coordenadas ficam sempre no backend, mesmo para o dono do perfil).
  const homeLocation = await getHomeLocation(profile.id)
  // homeLocationCountryCode — o código ISO2 da GeoLocation ligada (quando
  // existe), para o LocationAutocomplete do EditProfilePage conseguir
  // pré-seleccionar o país certo ao editar um perfil que já adoptou o
  // catálogo, sem ter de adivinhar a partir do texto livre legacy
  // `country` (que pode ser "Portugal", "PT", "portugal ", etc.).
  res.json({
    ...safeProfile, photos: resolvedPhotos, verificationBadges: getVerificationBadges(user?.verification), completeness,
    homeLocationLabel: homeLocation.displayLabel,
    homeLocationCountryCode: homeLocation.locationId ? homeLocation.country : null,
  })
})

// PUT /api/profiles/me  ← new: edit own profile
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const data = profileSchema.partial().parse(req.body)

    // Fase 3D — a localização habitual (city/country) tem uma política de
    // alteração própria (cooldown de 90 dias fora do onboarding), separada
    // de qualquer plano/entitlement: nunca uma gate paga, só integridade de
    // dados (ver effectiveLocationService.canChangeHomeLocation). Só se
    // aplica quando city/country estão de facto a mudar.
    let homeLocationStamp: Date | undefined
    if (data.city !== undefined || data.country !== undefined || data.homeLocationId !== undefined) {
      // `(prisma as any)` aqui — mesmo padrão já usado nesta base de código
      // para campos/modelos mais recentes que o Prisma Client gerado ainda
      // não conhece num ambiente sem `prisma generate` corrido de fresco
      // (ver o comentário de keyVersion em discoveryService.ts/
      // contactHashService.ts). `homeLocationUpdatedAt`/`homeLocationId`
      // existem mesmo no schema.prisma (Fase 3D / sistema de localidades)
      // — isto é só uma defesa de tipos, nunca um campo inventado.
      const current = await (prisma as any).profile.findUnique({
        where: { id: profileId },
        select: { status: true, homeLocationUpdatedAt: true, city: true, country: true, homeLocationId: true }
      })
      if (!current) return res.status(404).json({ error: 'Perfil não encontrado.' })
      if (data.homeLocationId !== undefined) {
        const validationError = await validateHomeLocationId(data.homeLocationId)
        if (validationError) return res.status(400).json({ error: validationError })
      }
      const check = canChangeHomeLocation(current as any, { city: data.city, country: data.country, homeLocationId: data.homeLocationId })
      if (!check.allowed) {
        return res.status(403).json({
          error: `A localização habitual só pode ser alterada novamente a partir de ${check.nextAllowedAt?.toLocaleDateString('pt')}.`,
          code: 'LOCATION_CHANGE_COOLDOWN',
          nextAllowedAt: check.nextAllowedAt,
        })
      }
      if (check.reason === 'FIRST_CONFIRMATION' || check.reason === 'COOLDOWN_ELAPSED') {
        homeLocationStamp = new Date()
      }
    }

    const updated = await (prisma as any).profile.update({
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
        ...(data.homeLocationId     !== undefined && { homeLocationId: data.homeLocationId }),
        ...(data.customLocality     !== undefined && { customLocality: data.customLocality }),
        ...(data.locationVisibility !== undefined && { locationVisibility: data.locationVisibility }),
        ...(homeLocationStamp     !== undefined && { homeLocationUpdatedAt: homeLocationStamp }),
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
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code, unknownSlugs: err.unknownSlugs })
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
      // Fase 3D — defesa extra: este ramo normalmente só é chamado durante
      // o onboarding (status DRAFT, onde a correcção é sempre livre), mas
      // se alguma vez for chamado sobre um perfil já confirmado, aplica-se
      // a mesma política de cooldown de PUT /me.
      let homeLocationStamp: Date | undefined
      if (data.city !== undefined || data.country !== undefined || data.homeLocationId !== undefined) {
        if (data.homeLocationId !== undefined) {
          const validationError = await validateHomeLocationId(data.homeLocationId)
          if (validationError) return res.status(400).json({ error: validationError })
        }
        const check = canChangeHomeLocation(existing as any, { city: data.city, country: data.country, homeLocationId: data.homeLocationId })
        if (!check.allowed) {
          return res.status(403).json({
            error: `A localização habitual só pode ser alterada novamente a partir de ${check.nextAllowedAt?.toLocaleDateString('pt')}.`,
            code: 'LOCATION_CHANGE_COOLDOWN',
            nextAllowedAt: check.nextAllowedAt,
          })
        }
        if (check.reason === 'FIRST_CONFIRMATION' || check.reason === 'COOLDOWN_ELAPSED') {
          homeLocationStamp = new Date()
        }
      }

      const updated = await (prisma as any).profile.update({
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
          ...(data.homeLocationId     !== undefined && { homeLocationId: data.homeLocationId }),
          ...(data.customLocality     !== undefined && { customLocality: data.customLocality }),
          ...(data.locationVisibility !== undefined && { locationVisibility: data.locationVisibility }),
          ...(homeLocationStamp     !== undefined && { homeLocationUpdatedAt: homeLocationStamp }),
        }
      })
      const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
      await invalidateScoresForProfile(updated.id).catch(() => {})
      if (data.intentions?.length) await upsertIntentions(updated.id, normaliseIntentions(data.intentions))
      return res.json(updated)
    }

    if (!data.displayName) return res.status(400).json({ error: 'Nome visível obrigatório.' })

    if (data.homeLocationId !== undefined) {
      const validationError = await validateHomeLocationId(data.homeLocationId)
      if (validationError) return res.status(400).json({ error: validationError })
    }

    const profile = await (prisma as any).profile.create({
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
        homeLocationId:     data.homeLocationId ?? undefined,
        customLocality:     data.customLocality ?? undefined,
        locationVisibility: data.locationVisibility || 'REFERENCE_LOCALITY',
        status:             isProd ? 'PENDING_REVIEW' : 'APPROVED',
        privacySettings: { create: {
          visibleInDiscovery: true, showDistance: true,
          showOnlineStatus: true, invisibleMode: false, notificationMode: 'DISCREET'
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
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code, unknownSlugs: err.unknownSlugs })
    console.error('[CREATE PROFILE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil.' })
  }
})

router.put('/onboarding/step', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { step } = req.body
    if (!step || step < 1 || step > 10) return res.status(400).json({ error: 'Passo inválido.' })
    // `(prisma as any)` — precisa de homeLocationId, campo do sistema de
    // localidades ainda não conhecido pelo Prisma Client gerado (mesmo
    // padrão do resto do ficheiro).
    const profile = await (prisma as any).profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const isProd = process.env.NODE_ENV === 'production'
    const completing = step >= 10
    // Fase 3D — o momento em que o onboarding termina é a "confirmação" da
    // localização habitual referida na secção 4 do pedido: a partir daqui
    // o cooldown de alteração começa a contar (só se já houver
    // city/country ou homeLocationId preenchidos — um perfil sem
    // localização nenhuma não tem nada para arrancar o relógio).
    const startsHomeLocationCooldown = completing && profile.status === 'DRAFT' && !!(profile.city || profile.country || profile.homeLocationId)
    const updated = await (prisma as any).profile.update({
      where: { userId: req.userId! },
      data: {
        ...(completing && profile.status === 'DRAFT' && { status: isProd ? 'PENDING_REVIEW' : 'APPROVED' }),
        ...(startsHomeLocationCooldown && { homeLocationUpdatedAt: new Date() }),
      }
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

    // Fase 3D — mesma política de cooldown de PUT /me, aplicada aqui ao
    // perfil partilhado (casal/grupo).
    let homeLocationStamp: Date | undefined
    if (data.city !== undefined || data.country !== undefined || data.homeLocationId !== undefined) {
      if (data.homeLocationId !== undefined) {
        const validationError = await validateHomeLocationId(data.homeLocationId)
        if (validationError) return res.status(400).json({ error: validationError })
      }
      const check = canChangeHomeLocation(profile as any, { city: data.city, country: data.country, homeLocationId: data.homeLocationId })
      if (!check.allowed) {
        return res.status(403).json({
          error: `A localização habitual só pode ser alterada novamente a partir de ${check.nextAllowedAt?.toLocaleDateString('pt')}.`,
          code: 'LOCATION_CHANGE_COOLDOWN',
          nextAllowedAt: check.nextAllowedAt,
        })
      }
      if (check.reason === 'FIRST_CONFIRMATION' || check.reason === 'COOLDOWN_ELAPSED') {
        homeLocationStamp = new Date()
      }
    }

    const updated = await (prisma as any).profile.update({
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
        ...(data.homeLocationId     !== undefined && { homeLocationId: data.homeLocationId }),
        ...(data.customLocality     !== undefined && { customLocality: data.customLocality }),
        ...(data.locationVisibility !== undefined && { locationVisibility: data.locationVisibility }),
        ...(homeLocationStamp     !== undefined && { homeLocationUpdatedAt: homeLocationStamp }),
      }
    })
    const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
    await invalidateScoresForProfile(updated.id).catch(() => {})
    if (data.intentions?.length) await upsertIntentions(updated.id, normaliseIntentions(data.intentions))
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code, unknownSlugs: err.unknownSlugs })
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
  // Sistema de localidades — nunca expor o homeLocationId em bruto (id
  // interno do catálogo) nem customLocality directamente a outro perfil:
  // o que se mostra é sempre homeLocationLabel, já filtrado por
  // locationVisibility (resolveDisplayLabel, chamado dentro de
  // getHomeLocation). locationVisibility em si não é sensível, mas também
  // não serve para nada no lado do viewer — sai também.
  const { userId, locationLat, locationLng, homeLocationId, customLocality, locationVisibility, photos, user, ...pub } = profile as any

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

  const homeLocation = await getHomeLocation(profile.id)
  res.json({ ...pub, photos: resolvedPhotos, verificationBadges: getVerificationBadges(user?.verification), homeLocationLabel: homeLocation.displayLabel })
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

// BETA.2 (FASE C) — Shared Profile individual-discovery policy.
//
// Governs whether a couple/group member's own Individual Profile is
// additionally visible in Discovery (INDIVIDUAL_AND_SHARED) or hidden
// while acting through the Shared Profile only (SHARED_ONLY, the
// default). Changing it requires every active member to agree — reuses
// ApprovalPolicyService's isApprovalSatisfied (the same ALL/MAJORITY/
// DESIGNATED machinery already governing match approval) rather than
// inventing new consensus rules, and ProfileMembershipService.
// getRequiredApprovers for "who must approve" — both already
// battle-tested by couples.ts's match approval flow. Deliberately NOT
// built on ProfileAgreement/AgreementQuestion: that machinery does a
// conservative merge across a whole round of unrelated Q&A questions at
// once, and entangling an eligibility-critical discovery flag in that
// round would let an edit to an unrelated question silently affect
// discovery visibility.

// GET /api/profiles/:id/policy — current policy + any pending proposal
router.get('/:id/policy', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, select: { id: true, type: true, individualDiscoveryPolicy: true } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (profile.type === 'INDIVIDUAL') return res.status(400).json({ error: 'Só perfis de casal/grupo têm esta política.' })
    if (!(await isActiveMember(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })

    const pending = await (prisma as any).sharedProfilePolicyProposal.findFirst({
      where: { profileId: profile.id, status: 'PENDING' },
      include: { approvals: true },
      orderBy: { createdAt: 'desc' }
    })
    const requiredApprovers = await getRequiredApprovers(profile.id)

    res.json({
      currentPolicy: profile.individualDiscoveryPolicy,
      pendingProposal: pending ? {
        id: pending.id,
        proposedPolicy: pending.proposedPolicy,
        proposedByUserId: pending.proposedByUserId,
        createdAt: pending.createdAt,
        requiredApprovers,
        approvedUserIds: pending.approvals.filter((a: any) => a.approvedAt).map((a: any) => a.userId)
      } : null
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/profiles/:id/policy/propose — start (or replace) a proposal to
// change this Shared Profile's individualDiscoveryPolicy. The proposer's
// own approval is recorded immediately (same posture as a match like —
// proposing something IS your vote for it).
router.post('/:id/policy/propose', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { policy } = req.body
    if (!['INDIVIDUAL_AND_SHARED', 'SHARED_ONLY'].includes(policy)) {
      return res.status(400).json({ error: 'Política inválida.' })
    }
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, select: { id: true, type: true, individualDiscoveryPolicy: true } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (profile.type === 'INDIVIDUAL') return res.status(400).json({ error: 'Só perfis de casal/grupo têm esta política.' })
    if (!(await isActiveMember(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })

    if (profile.individualDiscoveryPolicy === policy) {
      return res.status(409).json({ error: 'Já é a política atual.' })
    }

    // Only one PENDING proposal at a time — a new one from anyone
    // supersedes (cancels) whatever was pending before, same as changing
    // your mind before everyone's answered.
    await (prisma as any).sharedProfilePolicyProposal.updateMany({
      where: { profileId: profile.id, status: 'PENDING' },
      data: { status: 'CANCELLED' }
    })

    const proposal = await (prisma as any).sharedProfilePolicyProposal.create({
      data: { profileId: profile.id, proposedPolicy: policy, proposedByUserId: req.userId! }
    })
    await (prisma as any).sharedProfilePolicyApproval.create({
      data: { proposalId: proposal.id, userId: req.userId!, approvedAt: new Date() }
    })

    // A lone member (e.g. a couple still PENDING_PARTNER) satisfies "ALL"
    // immediately — apply right away instead of waiting for a second
    // member who may not exist yet.
    const { isApprovalSatisfied } = await import('../lib/approvalPolicyService')
    const approvedUserIds = new Set<string>([req.userId!])
    if (await isApprovalSatisfied(profile.id, approvedUserIds)) {
      await prisma.$transaction([
        prisma.profile.update({ where: { id: profile.id }, data: { individualDiscoveryPolicy: policy } }),
        (prisma as any).sharedProfilePolicyProposal.update({ where: { id: proposal.id }, data: { status: 'APPROVED' } })
      ])
      return res.status(201).json({ proposalId: proposal.id, applied: true, currentPolicy: policy })
    }

    res.status(201).json({ proposalId: proposal.id, applied: false, currentPolicy: profile.individualDiscoveryPolicy })
  } catch (err: any) {
    console.error('[POLICY PROPOSE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/profiles/:id/policy/proposals/:proposalId/approve
router.post('/:id/policy/proposals/:proposalId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (!(await isActiveMember(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })

    const proposal = await (prisma as any).sharedProfilePolicyProposal.findUnique({ where: { id: req.params.proposalId } })
    if (!proposal || proposal.profileId !== profile.id || proposal.status !== 'PENDING') {
      return res.status(404).json({ error: 'Proposta inválida ou já resolvida.' })
    }

    await (prisma as any).sharedProfilePolicyApproval.upsert({
      where: { proposalId_userId: { proposalId: proposal.id, userId: req.userId! } },
      update: { approvedAt: new Date(), rejectedAt: null },
      create: { proposalId: proposal.id, userId: req.userId!, approvedAt: new Date() }
    })

    const approvals = await (prisma as any).sharedProfilePolicyApproval.findMany({
      where: { proposalId: proposal.id, approvedAt: { not: null } }
    })
    const approvedUserIds = new Set<string>(approvals.map((a: any) => a.userId))

    const { isApprovalSatisfied } = await import('../lib/approvalPolicyService')
    if (await isApprovalSatisfied(profile.id, approvedUserIds)) {
      await prisma.$transaction([
        prisma.profile.update({ where: { id: profile.id }, data: { individualDiscoveryPolicy: proposal.proposedPolicy } }),
        (prisma as any).sharedProfilePolicyProposal.update({ where: { id: proposal.id }, data: { status: 'APPROVED' } })
      ])
      return res.json({ applied: true, currentPolicy: proposal.proposedPolicy })
    }

    res.json({ applied: false })
  } catch (err: any) {
    console.error('[POLICY APPROVE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/profiles/:id/policy/proposals/:proposalId/reject — any active
// member can veto (unanimous approval means a single rejection blocks it).
router.post('/:id/policy/proposals/:proposalId/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (!(await isActiveMember(profile.id, req.userId!))) return res.status(403).json({ error: 'Sem permissão.' })

    const proposal = await (prisma as any).sharedProfilePolicyProposal.findUnique({ where: { id: req.params.proposalId } })
    if (!proposal || proposal.profileId !== profile.id || proposal.status !== 'PENDING') {
      return res.status(404).json({ error: 'Proposta inválida ou já resolvida.' })
    }

    await (prisma as any).sharedProfilePolicyApproval.upsert({
      where: { proposalId_userId: { proposalId: proposal.id, userId: req.userId! } },
      update: { rejectedAt: new Date(), approvedAt: null },
      create: { proposalId: proposal.id, userId: req.userId!, rejectedAt: new Date() }
    })
    await (prisma as any).sharedProfilePolicyProposal.update({ where: { id: proposal.id }, data: { status: 'REJECTED' } })

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
