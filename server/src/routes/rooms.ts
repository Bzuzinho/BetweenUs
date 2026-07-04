import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const ROOM_TYPES = ['TRIO', 'COUPLE_PLUS_ONE', 'COUPLE_PLUS_COUPLE', 'SWING_GROUP', 'POLYAMORY', 'CUSTOM'] as const
const MAX_MEMBERS = { TRIO:3, COUPLE_PLUS_ONE:3, COUPLE_PLUS_COUPLE:4, SWING_GROUP:6, POLYAMORY:8, CUSTOM:12 }

// ─── GET /api/rooms — list rooms I'm a member of ─────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const memberships = await prisma.privateRoomMember.findMany({
    where: { userId: req.userId!, leftAt: null },
    include: {
      privateRoom: {
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: { id:true, profile:{ select:{ displayName:true, photos:{ where:{ isPrimary:true }, take:1 } } } } } }
          },
          _count: { select: { members: { where:{ leftAt:null } } } }
        }
      }
    },
    orderBy: { joinedAt: 'desc' }
  })
  res.json({ rooms: memberships.map(m => m.privateRoom) })
})

// ─── POST /api/rooms — create a private room ─────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      title:       z.string().min(2).max(60),
      roomType:    z.enum(ROOM_TYPES).default('CUSTOM'),
      description: z.string().max(300).optional(),
      inviteUserIds: z.array(z.string().uuid()).max(11).optional(),
    })
    const data = schema.parse(req.body)
    const maxMembers = MAX_MEMBERS[data.roomType]

    const room = await prisma.privateRoom.create({
      data: {
        title: data.title,
        status: 'ACTIVE',
        matchId: undefined as any, // standalone room, not tied to a match
        members: {
          create: [{
            userId: req.userId!,
            role: 'owner',
            joinedAt: new Date(),
          }]
        }
      },
      include: { members: true }
    })

    // Auto-invite specified users
    if (data.inviteUserIds?.length) {
      const invites = data.inviteUserIds
        .filter(id => id !== req.userId)
        .slice(0, maxMembers - 1)
        .map(userId => ({
          privateRoomId: room.id,
          userId,
          role: 'invited',
          joinedAt: new Date(),
        }))
      if (invites.length) {
        await prisma.privateRoomMember.createMany({ data: invites, skipDuplicates: true })
      }
    }

    const full = await prisma.privateRoom.findUnique({
      where: { id: room.id },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id:true, profile:{ select:{ displayName:true } } } } }
        }
      }
    })
    res.status(201).json(full)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[ROOM CREATE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── GET /api/rooms/:id — room detail + messages ──────────────────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const membership = await prisma.privateRoomMember.findFirst({
    where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
  })
  if (!membership) return res.status(403).json({ error: 'Sem acesso a esta sala.' })

  const room = await prisma.privateRoom.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        where: { leftAt: null },
        include: {
          user: { select: { id:true, profile:{ select:{ id:true, displayName:true,
            photos:{ where:{ isPrimary:true, moderationStatus:'APPROVED' }, take:1 } } } } }
        }
      }
    }
  })
  if (!room || room.status === 'CLOSED') return res.status(404).json({ error: 'Sala não encontrada.' })
  res.json(room)
})

// ─── GET /api/rooms/:id/messages ─────────────────────────────────────────────
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const membership = await prisma.privateRoomMember.findFirst({
    where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
  })
  if (!membership) return res.status(403).json({ error: 'Sem acesso a esta sala.' })

  const cursor = req.query.cursor as string | undefined
  const limit  = Math.min(Number(req.query.limit || 30), 100)

  // Find the conversation linked to this private room (or create one)
  let conversation = await (prisma as any).roomConversation?.findFirst({
    where: { privateRoomId: req.params.id }
  }).catch(() => null)

  // Fallback: get messages stored with privateRoomId directly if schema supports it
  const messages = await prisma.message.findMany({
    where: {
      conversation: { privateRoom: { id: req.params.id } },
      deletedAt: null,
      ...(cursor && { createdAt: { lt: new Date(cursor) } })
    },
    include: {
      sender: { select: { id:true, profile:{ select:{ displayName:true, photos:{ where:{ isPrimary:true }, take:1 } } } } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  }).catch(() => [])

  res.json({ messages: messages.reverse() })
})

// ─── POST /api/rooms/:id/messages ────────────────────────────────────────────
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'Mensagem vazia.' })

  const membership = await prisma.privateRoomMember.findFirst({
    where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
  })
  if (!membership) return res.status(403).json({ error: 'Sem acesso a esta sala.' })

  // Find or create conversation for this room
  const room = await prisma.privateRoom.findUnique({
    where: { id: req.params.id },
    include: { match: { include: { conversation: true } } }
  })
  if (!room) return res.status(404).json({ error: 'Sala não encontrada.' })

  let conversationId = room.match?.conversation?.id

  // If no match-linked conversation, create a standalone one
  if (!conversationId) {
    const conv = await prisma.conversation.create({
      data: { type: 'PRIVATE_ROOM', matchId: room.matchId }
    })
    conversationId = conv.id
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderUserId: req.userId!,
      body: body.trim(),
      messageType: 'TEXT',
    },
    include: {
      sender: { select: { id:true, profile:{ select:{ displayName:true } } } }
    }
  })

  // Emit to all room members via Socket.io
  const { io } = await import('../index')
  io.to(`room:${req.params.id}`).emit('room_message', message)

  res.status(201).json(message)
})

// ─── POST /api/rooms/:id/invite ───────────────────────────────────────────────
router.post('/:id/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId obrigatório.' })

  // Only owner can invite
  const membership = await prisma.privateRoomMember.findFirst({
    where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
  })
  if (!membership || membership.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o criador pode convidar.' })
  }

  // Check member count
  const count = await prisma.privateRoomMember.count({
    where: { privateRoomId: req.params.id, leftAt: null }
  })
  if (count >= 12) return res.status(400).json({ error: 'Sala com o número máximo de membros.' })

  await prisma.privateRoomMember.upsert({
    where: { privateRoomId_userId: { privateRoomId: req.params.id, userId } },
    update: { leftAt: null, role: 'member', joinedAt: new Date() },
    create: { privateRoomId: req.params.id, userId, role: 'invited', joinedAt: new Date() }
  })

  res.json({ ok: true })
})

// ─── POST /api/rooms/:id/accept ───────────────────────────────────────────────
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.privateRoomMember.updateMany({
    where: { privateRoomId: req.params.id, userId: req.userId!, role: 'invited' },
    data: { role: 'member', joinedAt: new Date() }
  })
  res.json({ ok: true })
})

// ─── DELETE /api/rooms/:id/leave ─────────────────────────────────────────────
router.delete('/:id/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.privateRoomMember.updateMany({
    where: { privateRoomId: req.params.id, userId: req.userId! },
    data: { leftAt: new Date() }
  })
  res.json({ ok: true })
})

// ─── PUT /api/rooms/:id — update room (owner only) ───────────────────────────
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const membership = await prisma.privateRoomMember.findFirst({
    where: { privateRoomId: req.params.id, userId: req.userId!, role: 'owner', leftAt: null }
  })
  if (!membership) return res.status(403).json({ error: 'Apenas o criador pode editar a sala.' })

  const { title, status } = req.body
  await prisma.privateRoom.update({
    where: { id: req.params.id },
    data: { ...(title && { title }), ...(status && { status }) }
  })
  res.json({ ok: true })
})

export default router
