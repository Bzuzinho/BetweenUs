import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId } from '../lib/profileMembershipService'

const router = Router()

// 6.6 — was Profile.userId-only (broke for a couple/group's non-creator
// members, the same bug class fixed across photos.ts/travel.ts/agreements.ts
// this sprint). Matters here specifically because it silently hid ACTIVE
// matches — including newly-unlocked Private Rooms — from a couple's
// second partner.
const getUserProfileId = resolveMyProfileId

const verifyMatchMembership = async (matchId: string, profileId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ profileOneId: profileId }, { profileTwoId: profileId }]
    }
  })
  return !!match
}

// GET /api/matches — only my matches
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getUserProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ profileOneId: profileId }, { profileTwoId: profileId }],
        status: 'ACTIVE'
      },
      include: {
        profileOne: {
          select: { id:true, displayName:true, city:true, type:true,
            photos: { where: { moderationStatus: 'APPROVED', isPrimary: true }, take: 1 } }
        },
        profileTwo: {
          select: { id:true, displayName:true, city:true, type:true,
            photos: { where: { moderationStatus: 'APPROVED', isPrimary: true }, take: 1 } }
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' }, take: 1,
              select: { body:true, createdAt:true, readAt:true, senderUserId:true }
            }
          }
        }
      },
      orderBy: { matchedAt: 'desc' }
    })

    interface MatchListRow {
      id: string
      matchedAt: Date
      profileOneId: string
      profileTwoId: string
      profileOne: { id: string; displayName: string; city: string | null; type: string; photos: any[] }
      profileTwo: { id: string; displayName: string; city: string | null; type: string; photos: any[] }
      conversation: { id: string; messages: { body: string; createdAt: Date; readAt: Date | null; senderUserId: string }[] } | null
    }
    const formatted = (matches as MatchListRow[]).map((m: MatchListRow) => {
      const isOne = m.profileOneId === profileId
      const other = isOne ? m.profileTwo : m.profileOne
      const lastMsg = m.conversation?.messages[0]
      const unread = lastMsg && !lastMsg.readAt && lastMsg.senderUserId !== req.userId ? 1 : 0
      return {
        id: m.id, matchedAt: m.matchedAt,
        conversationId: m.conversation?.id,
        profile: other,
        lastMessage: lastMsg ? { body: lastMsg.body, createdAt: lastMsg.createdAt, isOwn: lastMsg.senderUserId === req.userId } : null,
        unread
      }
    })

    res.json({ matches: formatted })
  } catch (err: any) {
    console.error('[MATCHES]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/matches/:id/messages — A.3: validate membership
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getUserProfileId(req.userId!)
    // BETA.2 fix — uniform 403 for "no access to this conversation",
    // whether the caller has no profile at all or simply isn't a member;
    // see consent.ts's identical fix for the full rationale.
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    // A.3: verify user belongs to this match
    const isMember = await verifyMatchMembership(req.params.id, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { conversation: { include: { messages: {
        orderBy: { createdAt: 'asc' },
        where: { deletedAt: null, removedByAdmin: false },
        include: { sender: { select: { id: true,
          profile: { select: { displayName: true } } } } }
      }}}}
    })

    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })

    // Mark messages as read
    await prisma.message.updateMany({
      where: { conversationId: match.conversation?.id, senderUserId: { not: req.userId! }, readAt: null },
      data: { readAt: new Date() }
    })

    res.json({ messages: match.conversation?.messages || [] })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/matches/:id/messages — A.3: validate membership
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Mensagem vazia.' })

    const profileId = await getUserProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    // A.3: verify user belongs to this match
    const isMember = await verifyMatchMembership(req.params.id, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    const match = await prisma.match.findUnique({
      where: { id: req.params.id }, include: { conversation: true }
    })
    if (!match?.conversation) return res.status(404).json({ error: 'Conversa não encontrada.' })
    if (match.status === 'BLOCKED') return res.status(403).json({ error: 'Esta conversa foi bloqueada.' })

    const message = await prisma.message.create({
      data: {
        conversationId: match.conversation.id,
        senderUserId: req.userId!,
        body: body.trim(),
        messageType: 'TEXT'
      }
    })

    // 11.1 — both check their own condition and no-op if already fired/not
    // yet met; safe to call on every message without extra state here.
    const conversationId = match.conversation.id
    import('../lib/recommendationSignalService').then(({ evaluateConversationStarted, evaluateSustainedConversation }) => {
      evaluateConversationStarted(conversationId).catch(() => {})
      evaluateSustainedConversation(conversationId).catch(() => {})
    }).catch(() => {})

    res.status(201).json(message)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})


// POST /api/matches/accept/:fromProfileId — accept connection request
router.post('/accept/:fromProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — was `user.findUnique(...).profile`, the direct
    // Profile.userId relation, same Active Profile Context bug class
    // fixed across discovery.ts this same sprint (6.6's header comment
    // above already fixed this for GET /, but these two POST routes were
    // missed). getUserProfileId === resolveMyProfileId.
    const viewerProfileId = await getUserProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const viewerProfile = await prisma.profile.findUnique({ where: { id: viewerProfileId } })
    if (!viewerProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const fromProfile = await prisma.profile.findUnique({
      where: { id: req.params.fromProfileId },
      include: { user: { select: { id:true } } }
    })
    if (!fromProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Verify there's a like from them to us
    const theirLike = await prisma.profileAction.findFirst({
      where: { actorProfileId: fromProfile.id, targetProfileId: viewerProfile.id, action: 'LIKE' }
    })
    if (!theirLike) return res.status(400).json({ error: 'Sem pedido de ligação pendente.' })

    // Check if match already exists
    const existing = await prisma.match.findFirst({
      where: { OR: [
        { profileOneId: viewerProfile.id, profileTwoId: fromProfile.id },
        { profileOneId: fromProfile.id, profileTwoId: viewerProfile.id },
      ]}
    })
    if (existing) return res.json({ ok: true, matchId: existing.id, alreadyMatched: true })

    // Create match + conversation
    const match = await prisma.match.create({
      data: {
        profileOneId: fromProfile.id,
        profileTwoId: viewerProfile.id,
        status: 'ACTIVE',
        matchedAt: new Date(),
        conversation: { create: { type: 'ONE_TO_ONE' } }
      }
    })

    // Record our like too
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewerProfile.id, targetProfileId: fromProfile.id } },
      update: { action: 'LIKE' },
      create: { actorProfileId: viewerProfile.id, targetProfileId: fromProfile.id, action: 'LIKE' }
    })

    // Notify the requester
    const { notifyUser } = await import('../lib/notify')
    notifyUser(fromProfile.user.id, 'match',
      '💫 Ligação aceite!',
      `${viewerProfile.displayName || 'Alguém'} aceitou a tua ligação. Podem conversar agora.`,
      { matchId: match.id, tab: 'matches' }
    ).catch(() => {})

    res.json({ ok: true, matchId: match.id })
  } catch (err: any) {
    console.error('[ACCEPT REQUEST]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/matches/reject/:fromProfileId — reject connection request
router.post('/reject/:fromProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — same Active Profile Context bug class as accept above.
    const viewerProfileId = await getUserProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Record pass action
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewerProfileId, targetProfileId: req.params.fromProfileId } },
      update: { action: 'PASS' },
      create: { actorProfileId: viewerProfileId, targetProfileId: req.params.fromProfileId, action: 'PASS' }
    })
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router

