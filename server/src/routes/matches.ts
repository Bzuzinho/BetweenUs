import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/matches — listar matches do utilizador
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { profileOneId: myProfile.id },
          { profileTwoId: myProfile.id }
        ],
        status: 'ACTIVE'
      },
      include: {
        profileOne: {
          select: { id:true, displayName:true, city:true, type:true,
            photos: { where:{ moderationStatus:'APPROVED', isPrimary:true }, take:1 } }
        },
        profileTwo: {
          select: { id:true, displayName:true, city:true, type:true,
            photos: { where:{ moderationStatus:'APPROVED', isPrimary:true }, take:1 } }
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt:'desc' },
              take: 1,
              select: { body:true, createdAt:true, readAt:true, senderUserId:true }
            }
          }
        }
      },
      orderBy: { matchedAt: 'desc' }
    })

    // Formatar para o frontend — mostrar o outro perfil, não o próprio
    const formatted = matches.map(m => {
      const isOne = m.profileOneId === myProfile.id
      const other = isOne ? m.profileTwo : m.profileOne
      const lastMsg = m.conversation?.messages[0]
      const unread = lastMsg && !lastMsg.readAt &&
        lastMsg.senderUserId !== req.userId ? 1 : 0

      return {
        id: m.id,
        matchedAt: m.matchedAt,
        conversationId: m.conversation?.id,
        profile: other,
        lastMessage: lastMsg ? {
          body: lastMsg.body,
          createdAt: lastMsg.createdAt,
          isOwn: lastMsg.senderUserId === req.userId
        } : null,
        unread
      }
    })

    res.json({ matches: formatted })
  } catch (err: any) {
    console.error('[MATCHES ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao carregar matches.' })
  }
})

// GET /api/matches/:id/messages — mensagens de uma conversa
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { conversation: { include: { messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id:true, profile: {
          select: { displayName:true }
        }}}}
      }}}}
    })

    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })

    // Marcar mensagens como lidas
    await prisma.message.updateMany({
      where: {
        conversationId: match.conversation?.id,
        senderUserId: { not: req.userId! },
        readAt: null
      },
      data: { readAt: new Date() }
    })

    res.json({ messages: match.conversation?.messages || [] })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar mensagens.' })
  }
})

// POST /api/matches/:id/messages — enviar mensagem
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Mensagem vazia.' })

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { conversation: true }
    })
    if (!match?.conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada.' })
    }

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
    res.status(500).json({ error: 'Erro ao enviar mensagem.' })
  }
})

export default router
