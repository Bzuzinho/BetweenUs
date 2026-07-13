import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyUser, notifyAdmins } from '../lib/notify'
import { signMediaUrl } from '../lib/mediaAccessService'
import { getVerificationBadges } from '../lib/verificationBadges'
import { resolveMyProfileId } from '../lib/profileMembershipService'

const router = Router()

// GET /api/discovery — the DiscoveryService pipeline (5.2), cursor-paginated (5.4)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.2 (FASE C) — this used to be a direct Profile.userId lookup,
    // which 404'd for every non-creator couple/group member (they never
    // owned a Profile row for the shared profile — see
    // activeProfileContextService.ts's header comment). resolveMyProfileId
    // now returns whichever profile the caller is currently acting as
    // (their own Individual Profile, or a Shared Profile they belong to),
    // matching what Discovery should present them as.
    const viewerProfileId = await resolveMyProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })
    const viewerProfile = { id: viewerProfileId }

    const typeFilter = ['INDIVIDUAL', 'COUPLE', 'GROUP'].includes(String(req.query.type))
      ? String(req.query.type) as 'INDIVIDUAL' | 'COUPLE' | 'GROUP' : undefined
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

    const { getCandidates } = await import('../lib/discoveryService')
    const { items: rawItems, nextCursor } = await getCandidates(viewerProfile.id, { type: typeFilter }, cursor, limit)

    // 11.5/11.12 — LAYER 3. applyRecommendations only ever reorders/relabels
    // the exact `rawItems` array Layers 1+2 already produced above — it
    // cannot add or remove a candidate (see recommendationOrchestrator.ts's
    // header). Shadow mode (default): computes + logs, returns rawItems
    // unchanged. Enabled + RECOMMENDATION_V1 cohort: returns the reordered
    // list. Both flags off (default): a no-op passthrough.
    const { applyRecommendations } = await import('../lib/recommendationOrchestrator')
    const { items } = await applyRecommendations(viewerProfile.id, rawItems, { type: !!typeFilter })

    // 3.1: discovery always shows the blurred teaser regardless of a
    // photo's visibilityLevel (that's the point of a discovery grid) — but
    // since new uploads store an R2 key, not a public URL, it now has to be
    // signed before it reaches the client. Kept here (not in
    // DiscoveryService) since signed-URL generation is a view/transport
    // concern, not part of the ranking pipeline itself.
    const profiles = await Promise.all(items.map(async item => {
      const p = item.profile
      const teaserSource = p.photos?.find((ph: any) => ph.isPrimary)?.blurredPath || p.photos?.[0]?.blurredPath || null
      const primaryPhoto = await signMediaUrl(teaserSource)
      return {
        id:                 p.id,
        displayName:        p.displayName,
        city:               p.city,
        country:            p.country,
        bio:                p.bio,
        type:               p.type,
        relationshipStatus: p.relationshipStatus,
        discretionLevel:    p.discretionLevel,
        score:              item.betweenScore,
        compatibility:      item.compatibility,
        reasons:            item.reasons,
        verified:           !!p.user?.ageVerifiedAt,
        verificationBadges: getVerificationBadges(p.user?.verification),
        hasPhotos:          (p.photos?.length || 0) > 0,
        primaryPhoto,
        liked:              !!p.liked,
      }
    }))

    // `profiles` kept as the response key for backward compatibility with
    // ExploreScreen.jsx (which reads res.data.profiles and doesn't yet know
    // about cursor pagination) — nextCursor is additive, adopted by the
    // frontend whenever it grows a "load more" control.
    res.json({ profiles, nextCursor })
  } catch (err: any) {
    console.error('[DISCOVERY]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/discovery/:id/like — send connection request
//
// 5.1 audit finding (Sprint 5): this route used to have its OWN inline
// match-creation logic, completely separate from matchService.createLikeOrMatch
// - it never checked couple double-consent at all, always creating status
// ACTIVE on a mutual like. Since ExploreScreen.jsx (the only discovery UI)
// always calls this exact route regardless of whether the viewer's profile
// is INDIVIDUAL or COUPLE, /api/couples/like/:id's correct double-consent
// logic was effectively dead code from the frontend's perspective - every
// real like in production went through the buggy path. Now delegates to
// the same createLikeOrMatch used by couples.ts, so there is exactly ONE
// place that decides whether a match needs double consent.
router.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — was `user.findUnique(...).profile`, the direct
    // Profile.userId relation (the user's own individually-owned
    // profile). That silently ignores Active Profile Context: a
    // couple/group's non-creator member (no individually-owned Profile
    // at all) got 404 "Cria o teu perfil primeiro" even though they can
    // browse Discovery fine as their shared profile, and anyone who
    // switched their active context to a shared profile still liked as
    // their individual profile regardless. resolveMyProfileId (=
    // activeProfileContextService.resolveActiveProfileId) is the same
    // resolution GET / already uses for this exact reason (see the
    // comment above this router's GET / handler).
    const viewerProfileId = await resolveMyProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })
    // BETA.3 (Task 6) — centralized enforcement gate instead of just
    // checking the profile exists. See eligibilityService.ts's
    // forProfileContext for what this actually checks (account status +
    // genuine ownership/membership of viewerProfileId) — it's stricter in
    // shape but not in outcome for any legitimate caller, since
    // resolveMyProfileId above already only ever returns a profile this
    // user genuinely owns or is an ACCEPTED member of.
    const { forProfileContext } = await import('../lib/eligibilityService')
    const eligibility = await forProfileContext(viewerProfileId, req.userId!)
    if (!eligibility.canLike) return res.status(403).json({ error: 'Não podes realizar esta ação.', reasons: eligibility.reasons })
    const viewerProfile = await prisma.profile.findUnique({ where: { id: viewerProfileId } })
    if (!viewerProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const target = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true } } }
    })
    if (!target) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const { createLikeOrMatch } = await import('../lib/matchService')
    const result = await createLikeOrMatch(viewerProfile.id, target.id)

    switch (result.kind) {
      case 'ERROR':
        return res.status(400).json({ error: result.message })

      case 'LIKE_RECORDED':
        // Send connection request notification to target — matches the
        // pre-fix behavior for the one-sided case, just no longer bundled
        // with match-creation logic.
        notifyUser(target.user.id, 'connection_request',
          '🔔 Pedido de ligação',
          `${viewerProfile.displayName || 'Alguém'} quer ligar-se contigo. Vê o perfil e decide.`,
          { fromProfileId: viewerProfile.id, tab: 'matches' }
        ).catch(() => {})
        return res.json({ ok: true, matched: false, matchId: null })

      case 'MATCH_PENDING_COUPLE_APPROVAL':
        // MATCH_APPROVAL_REQUIRED's domain event handler (5.10) already
        // notifies the required approvers - nothing extra needed here.
        return res.json({ ok: true, matched: false, matchId: result.matchId, pendingCoupleApproval: true })

      case 'MATCH_CREATED':
      case 'ALREADY_MATCHED':
        // MATCH_ACTIVATED's domain event handler (5.10) already notified
        // both sides when the match was created/activated.
        return res.json({ ok: true, matched: true, matchId: result.matchId })

      default:
        return res.json({ ok: true, matched: false, matchId: null })
    }
  } catch (err: any) {
    console.error('[LIKE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/discovery/:id/pass
router.post('/:id/pass', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — same Active Profile Context bug class as /:id/like above.
    const viewerProfileId = await resolveMyProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    // BETA.3 (Task 6) — same forProfileContext enforcement gate as /:id/like.
    const { forProfileContext } = await import('../lib/eligibilityService')
    const eligibility = await forProfileContext(viewerProfileId, req.userId!)
    if (!eligibility.canLike) return res.status(403).json({ error: 'Não podes realizar esta ação.', reasons: eligibility.reasons })
    const { recordPass } = await import('../lib/matchService')
    await recordPass(viewerProfileId, req.params.id)
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

// POST /api/discovery/:id/block
router.post('/:id/block', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — same Active Profile Context bug class as /:id/like above.
    const viewerProfileId = await resolveMyProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    // 11.5.6 — dedup: only fire BLOCK signal on genuine transition into
    // BLOCK (matches LIKE/PASS pattern) — a repeat POST .../block (double
    // click, client retry) must not inflate blockRate, which feeds
    // directly into the guardrail comparison's recommendDisable decision.
    const priorAction = await prisma.profileAction.findUnique({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewerProfileId, targetProfileId: req.params.id } },
      select: { action: true }
    })
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewerProfileId, targetProfileId: req.params.id } },
      update: { action: 'BLOCK' },
      create: { actorProfileId: viewerProfileId, targetProfileId: req.params.id, action: 'BLOCK' }
    })
    if (priorAction?.action !== 'BLOCK') {
      const { recordSignal } = await import('../lib/recommendationSignalService')
      recordSignal(viewerProfileId, req.params.id, 'BLOCK').catch(() => {})
    }
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

// POST /api/discovery/:id/report
router.post('/:id/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reason, details } = req.body
    // Pre-existing bug: Report has no `reportedProfileId` column (schema
    // only has `reportedUserId` — see reports.ts's own /api/reports
    // route, which always took a userId, never a profileId). This
    // endpoint passed req.params.id (a Profile id from Discovery)
    // straight through as `reportedProfileId`, which never existed on
    // the Prisma model — a TS2769/TS2353 compile error that every
    // suite importing this route (directly or transitively) inherited.
    // It was masked until now by an unrelated compile error elsewhere
    // failing first. Fixed by resolving the target Profile to its
    // owning user via getActiveMembers (same helper used for Shared
    // Profile membership elsewhere) — for an Individual Profile this is
    // its one user; for a Shared Profile (COUPLE/GROUP) Report only has
    // room for a single reportedUserId, so we record the first active
    // member (consistent with there being no per-member report target
    // in the schema).
    const { getActiveMembers } = await import('../lib/profileMembershipService')
    const targetMembers = await getActiveMembers(req.params.id)
    const reportedUserId = targetMembers[0]?.userId
    const report = await prisma.report.create({
      data: { reporterUserId: req.userId!, reportedUserId, reason: reason || 'other', details }
    })
    notifyAdmins('new_report', '⚠️ Nova denúncia', `Denúncia: ${reason}`, { reportId: report.id, tab: 'reports' }).catch(()=>{})

    // BETA.3 fix — same Active Profile Context bug class as above.
    const viewerProfileId = await resolveMyProfileId(req.userId!)
    if (viewerProfileId) {
      const { recordSignal } = await import('../lib/recommendationSignalService')
      recordSignal(viewerProfileId, req.params.id, 'REPORT').catch(() => {})
    }
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router
