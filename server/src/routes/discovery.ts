import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyUser, notifyAdmins } from '../lib/notify'

const router = Router()

// ─── Between Score calculator ─────────────────────────────────────────────────
const calcScore = (viewer: any, target: any): number => {
  let score = 0

  // Intentions overlap (30%)
  const vIntents = new Set(viewer.intentions?.map((i: any) => i.intention?.slug))
  const tIntents = new Set(target.intentions?.map((i: any) => i.intention?.slug))
  const overlap  = [...vIntents].filter(i => tIntents.has(i)).length
  if (overlap > 0) score += Math.min(30, overlap * 10)

  // No hard boundary conflict (25%)
  const vNos = new Set(viewer.boundaries?.filter((b: any) => b.preference === 'no').map((b: any) => b.boundary?.slug))
  const tYes = new Set(target.boundaries?.filter((b: any) => b.preference === 'yes').map((b: any) => b.boundary?.slug))
  const conflicts = [...tYes].filter(s => vNos.has(s)).length
  if (conflicts === 0) score += 25

  // Relationship status compatible (15%)
  const compatMap: Record<string, string[]> = {
    SINGLE:      ['SINGLE','COUPLE_CURIOUS','COUPLE_LIBERAL','OPEN','POLYAMOROUS'],
    OPEN:        ['SINGLE','OPEN','POLYAMOROUS','COUPLE_CURIOUS'],
    POLYAMOROUS: ['SINGLE','OPEN','POLYAMOROUS'],
    COUPLE_CURIOUS: ['SINGLE','OPEN'],
    COUPLE_LIBERAL: ['SINGLE','COUPLE_LIBERAL','OPEN'],
  }
  const vStatus = viewer.relationshipStatus || 'SINGLE'
  const tStatus = target.relationshipStatus || 'SINGLE'
  if ((compatMap[vStatus] || []).includes(tStatus)) score += 15

  // Photos exist (10%)
  if (target.photos?.length > 0) score += 10

  // Verified (10%)
  if (target.user?.ageVerifiedAt) score += 10

  // Discretion compatible (5%)
  if (!viewer.discretionLevel || !target.discretionLevel ||
      viewer.discretionLevel === target.discretionLevel) score += 5

  // City match bonus (5%)
  if (viewer.city && target.city && viewer.city.toLowerCase() === target.city.toLowerCase()) score += 5

  return Math.min(100, score)
}

// GET /api/discovery — all profiles ordered by score
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { profile: {
        include: {
          intentions: { include: { intention: true } },
          boundaries: { include: { boundary: true } },
        }
      }}
    })
    if (!user?.profile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const viewerProfile = user.profile

    // Get all blocked/passed/liked profiles by viewer
    const myActions = await prisma.profileAction.findMany({
      where: { actorProfileId: viewerProfile.id },
      select: { targetProfileId: true, action: true }
    })
    const excludeIds = new Set([
      viewerProfile.id,
      ...myActions.filter(a => ['BLOCK','PASS'].includes(a.action)).map(a => a.targetProfileId)
    ])

    // Get existing matches (already connected)
    const myMatches = await prisma.match.findMany({
      where: {
        OR: [{ profileOneId: viewerProfile.id }, { profileTwoId: viewerProfile.id }],
        status: { in: ['PENDING','ACTIVE'] }
      },
      select: { profileOneId: true, profileTwoId: true }
    })
    myMatches.forEach(m => {
      excludeIds.add(m.profileOneId === viewerProfile.id ? m.profileTwoId : m.profileOneId)
    })

    // Sprint 4: read the type filter the frontend already sends — was being silently ignored
    const typeFilter = ['INDIVIDUAL', 'COUPLE', 'GROUP'].includes(String(req.query.type))
      ? String(req.query.type) : undefined

    // Get all active profiles excluding admin roles
    const profiles = await prisma.profile.findMany({
      where: {
        id: { notIn: [...excludeIds] },
        status: 'APPROVED',
        user: { status: 'ACTIVE', adminRole: null },
        ...(typeFilter && { type: typeFilter as any }),
      },
      include: {
        user: { select: { id:true, ageVerifiedAt:true } },
        photos: { where: { moderationStatus: 'APPROVED' }, take: 3 },
        intentions: { include: { intention: true } },
        boundaries: { include: { boundary: true } },
        privacySettings: true,
      },
      take: 100,
    })

    // Calculate scores and sort
    const scored = profiles.map(p => ({
      ...p,
      score: calcScore(viewerProfile, p)
    })).sort((a, b) => b.score - a.score)

    // Mark which ones viewer has liked (pending connection)
    const likedIds = new Set(myActions.filter(a => a.action === 'LIKE').map(a => a.targetProfileId))

    const result = scored.map(p => ({
      id:                 p.id,
      displayName:        p.displayName,
      city:               p.city,
      country:            p.country,
      bio:                p.bio,
      type:               p.type,
      relationshipStatus: p.relationshipStatus,
      discretionLevel:    p.discretionLevel,
      score:              p.score,
      verified:           !!p.user?.ageVerifiedAt,
      hasPhotos:          p.photos.length > 0,
      primaryPhoto:       p.photos.find(ph => ph.isPrimary)?.blurredPath || p.photos[0]?.blurredPath || null,
      liked:              likedIds.has(p.id),
    }))

    res.json({ profiles: result })
  } catch (err: any) {
    console.error('[DISCOVERY]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/discovery/:id/like — send connection request
router.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const viewer = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { profile: true }
    })
    if (!viewer?.profile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const target = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id:true } }, privacySettings: true }
    })
    if (!target) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Record like action
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewer.profile.id, targetProfileId: target.id } },
      update: { action: 'LIKE' },
      create: { actorProfileId: viewer.profile.id, targetProfileId: target.id, action: 'LIKE' }
    })

    // Check if target already liked viewer → auto-match
    const theirLike = await prisma.profileAction.findFirst({
      where: { actorProfileId: target.id, targetProfileId: viewer.profile.id, action: 'LIKE' }
    })

    let matched = false
    let matchId: string | null = null

    if (theirLike) {
      // Mutual like → create match
      const existing = await prisma.match.findFirst({
        where: { OR: [
          { profileOneId: viewer.profile.id, profileTwoId: target.id },
          { profileOneId: target.id, profileTwoId: viewer.profile.id },
        ]}
      })

      if (!existing) {
        const match = await prisma.match.create({
          data: {
            profileOneId: viewer.profile.id,
            profileTwoId: target.id,
            status: 'ACTIVE',
            matchedAt: new Date(),
            conversation: { create: { type: 'ONE_TO_ONE' } }
          }
        })
        matchId = match.id
        matched = true

        // Notify both users of match
        notifyUser(target.user.id, 'match',
          '💫 Novo match!',
          `Tens um novo match com ${viewer.profile.displayName || 'alguém'}.`,
          { matchId: match.id, tab: 'matches' }
        ).catch(() => {})

        notifyUser(req.userId!, 'match',
          '💫 Match confirmado!',
          `O teu pedido de ligação foi aceite. Agora podem conversar.`,
          { matchId: match.id, tab: 'matches' }
        ).catch(() => {})
      } else {
        matched = true
        matchId = existing.id
      }
    } else {
      // Send connection request notification to target
      notifyUser(target.user.id, 'connection_request',
        '🔔 Pedido de ligação',
        `${viewer.profile.displayName || 'Alguém'} quer ligar-se contigo. Vê o perfil e decide.`,
        { fromProfileId: viewer.profile.id, tab: 'matches' }
      ).catch(() => {})
    }

    res.json({ ok: true, matched, matchId })
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
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewer.profile.id, targetProfileId: req.params.id } },
      update: { action: 'PASS' },
      create: { actorProfileId: viewer.profile.id, targetProfileId: req.params.id, action: 'PASS' }
    })
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
