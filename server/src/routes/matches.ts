import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Helper: verify user belongs to match
const getUserProfileId = async (userId: string): Promise<string | null> => {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } })
  return profile?.id || null
}

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

    const formatted = matches.map(m => {
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
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

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
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

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

    res.status(201).json(message)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})


// POST /api/matches/accept/:fromProfileId — accept connection request
router.post('/accept/:fromProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const viewer = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true } })
    if (!viewer?.profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const fromProfile = await prisma.profile.findUnique({
      where: { id: req.params.fromProfileId },
      include: { user: { select: { id:true } } }
    })
    if (!fromProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Verify there's a like from them to us
    const theirLike = await prisma.profileAction.findFirst({
      where: { actorProfileId: fromProfile.id, targetProfileId: viewer.profile.id, action: 'LIKE' }
    })
    if (!theirLike) return res.status(400).json({ error: 'Sem pedido de ligação pendente.' })

    // Check if match already exists
    const existing = await prisma.match.findFirst({
      where: { OR: [
        { profileOneId: viewer.profile.id, profileTwoId: fromProfile.id },
        { profileOneId: fromProfile.id, profileTwoId: viewer.profile.id },
      ]}
    })
    if (existing) return res.json({ ok: true, matchId: existing.id, alreadyMatched: true })

    // Create match + conversation
    const match = await prisma.match.create({
      data: {
        profileOneId: fromProfile.id,
        profileTwoId: viewer.profile.id,
        status: 'ACTIVE',
        matchedAt: new Date(),
        conversation: { create: { type: 'ONE_TO_ONE' } }
      }
    })

    // Record our like too
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewer.profile.id, targetProfileId: fromProfile.id } },
      update: { action: 'LIKE' },
      create: { actorProfileId: viewer.profile.id, targetProfileId: fromProfile.id, action: 'LIKE' }
    })

    // Notify the requester
    const { notifyUser } = await import('../lib/notify')
    notifyUser(fromProfile.user.id, 'match',
      '💫 Ligação aceite!',
      `${viewer.profile.displayName || 'Alguém'} aceitou a tua ligação. Podem conversar agora.`,
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
    const viewer = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true } })
    if (!viewer?.profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Record pass action
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewer.profile.id, targetProfileId: req.params.fromProfileId } },
      update: { action: 'PASS' },
      create: { actorProfileId: viewer.profile.id, targetProfileId: req.params.fromProfileId, action: 'PASS' }
    })
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router

