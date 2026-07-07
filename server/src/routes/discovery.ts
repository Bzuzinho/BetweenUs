import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyUser, notifyAdmins } from '../lib/notify'
import { signMediaUrl } from '../lib/mediaAccessService'
import { getVerificationBadges } from '../lib/verificationBadges'

const router = Router()

// GET /api/discovery — the DiscoveryService pipeline (5.2), cursor-paginated (5.4)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const viewerProfile = await prisma.profile.findUnique({ where: { userId: req.userId! }, select: { id: true } })
    if (!viewerProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const typeFilter = ['INDIVIDUAL', 'COUPLE', 'GROUP'].includes(String(req.query.type))
      ? String(req.query.type) as 'INDIVIDUAL' | 'COUPLE' | 'GROUP' : undefined
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

    const { getCandidates } = await import('../lib/discoveryService')
    const { items, nextCursor } = await getCandidates(viewerProfile.id, { type: typeFilter }, cursor, limit)

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
    const viewer = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true } })
    if (!viewer?.profile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const target = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true } } }
    })
    if (!target) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const { createLikeOrMatch } = await import('../lib/matchService')
    const result = await createLikeOrMatch(viewer.profile.id, target.id)

    switch (result.kind) {
      case 'ERROR':
        return res.status(400).json({ error: result.message })

      case 'LIKE_RECORDED':
        // Send connection request notification to target — matches the
        // pre-fix behavior for the one-sided case, just no longer bundled
        // with match-creation logic.
        notifyUser(target.user.id, 'connection_request',
          '🔔 Pedido de ligação',
          `${viewer.profile.displayName || 'Alguém'} quer ligar-se contigo. Vê o perfil e decide.`,
          { fromProfileId: viewer.profile.id, tab: 'matches' }
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
    const viewer = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true } })
    if (!viewer?.profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const { recordPass } = await import('../lib/matchService')
    await recordPass(viewer.profile.id, req.params.id)
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

// POST /api/discovery/:id/block
router.post('/:id/block', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const viewer = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true } })
    if (!viewer?.profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewer.profile.id, targetProfileId: req.params.id } },
      update: { action: 'BLOCK' },
      create: { actorProfileId: viewer.profile.id, targetProfileId: req.params.id, action: 'BLOCK' }
    })
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

// POST /api/discovery/:id/report
router.post('/:id/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reason, details } = req.body
    const report = await prisma.report.create({
      data: { reporterUserId: req.userId!, reportedProfileId: req.params.id, reason: reason || 'other', details }
    })
    notifyAdmins('new_report', '⚠️ Nova denúncia', `Denúncia: ${reason}`, { reportId: report.id, tab: 'reports' }).catch(()=>{})
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router
