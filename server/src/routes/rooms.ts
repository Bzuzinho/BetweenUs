import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyAdmins } from '../lib/notify'
import { signMediaUrl } from '../lib/mediaAccessService'

const router = Router()

const ROOM_TYPES = ['TRIO','COUPLE_PLUS_ONE','COUPLE_PLUS_COUPLE','SWING_GROUP','POLYAMORY','CUSTOM'] as const
const MAX_MEMBERS: Record<string,number> = {
  TRIO:3, COUPLE_PLUS_ONE:3, COUPLE_PLUS_COUPLE:4, SWING_GROUP:6, POLYAMORY:8, CUSTOM:12
}

const roomSelect = {
  id:true, title:true, roomType:true, description:true, status:true, createdAt:true,
  members: {
    where: { leftAt: null },
    include: {
      user: { select: { id:true, profile:{ select:{
        displayName:true,
        photos:{ where:{ isPrimary:true, moderationStatus:'APPROVED' }, take:1 }
      }}}}
    }
  }
}

// 3.1: member thumbnails now store an R2 key (private uploads) rather than a
// public URL. Room members are an existing trust boundary (you're already in
// a private room together), so this signs whatever primary photo is present
// rather than re-deriving match/approval state per member.
const signRoomPhotos = async (room: any) => {
  if (!room?.members) return room
  const members = await Promise.all(room.members.map(async (m: any) => {
    const photo = m.user?.profile?.photos?.[0]
    if (!photo) return m
    const signed = await signMediaUrl(photo.storagePath)
    return { ...m, user: { ...m.user, profile: { ...m.user.profile, photos: [{ ...photo, storagePath: signed }] } } }
  }))
  return { ...room, members }
}

// GET /api/rooms
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.privateRoomMember.findMany({
      where: { userId: req.userId!, leftAt: null },
      include: { privateRoom: { select: roomSelect } },
      orderBy: { joinedAt: 'desc' }
    })
    res.json({ rooms: await Promise.all(memberships.map(m => signRoomPhotos(m.privateRoom))) })
  } catch (err: any) {
    console.error('[ROOMS GET]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms — create standalone private room
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      title:       z.string().min(2).max(60),
      roomType:    z.enum(ROOM_TYPES).default('CUSTOM'),
      description: z.string().max(300).optional(),
      inviteUserIds: z.array(z.string().uuid()).max(11).optional(),
    }).parse(req.body)

    const room = await prisma.privateRoom.create({
      data: {
        title:    data.title,
        roomType: data.roomType,
        description: data.description,
        status:   'ACTIVE',
        // matchId intentionally omitted — standalone room
        members: { create: [{ userId: req.userId!, role: 'owner', joinedAt: new Date() }] }
      },
      select: roomSelect
    })

    // Auto-invite others
    if (data.inviteUserIds?.length) {
      const max = MAX_MEMBERS[data.roomType] ?? 12
      const toInvite = data.inviteUserIds.filter(id => id !== req.userId).slice(0, max - 1)
      if (toInvite.length) {
        await prisma.privateRoomMember.createMany({
          data: toInvite.map(userId => ({
            privateRoomId: room.id, userId, role: 'invited', joinedAt: new Date()
          })),
          skipDuplicates: true
        })
      }
    }

    res.status(201).json(await signRoomPhotos(room))
  } catch (err: any) {
    console.error('[ROOMS CREATE]', err.message)
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro ao criar sala: ' + err.message })
  }
})

// GET /api/rooms/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.privateRoomMember.findFirst({
      where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
    })
    if (!member) return res.status(403).json({ error: 'Sem acesso a esta sala.' })

    const room = await prisma.privateRoom.findUnique({ where: { id: req.params.id }, select: roomSelect })
    if (!room || room.status === 'CLOSED') return res.status(404).json({ error: 'Sala não encontrada.' })
    res.json(await signRoomPhotos(room))
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/rooms/:id/messages
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.privateRoomMember.findFirst({
      where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
    })
    if (!member) return res.status(403).json({ error: 'Sem acesso a esta sala.' })

    const cursor = req.query.cursor as string | undefined
    const limit  = Math.min(Number(req.query.limit || 50), 100)

    const messages = await (prisma as any).roomMessage.findMany({
      where: {
        roomId: req.params.id,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
      },
      include: {
        sender: { select: { id:true, profile:{ select:{
          displayName:true,
          photos:{ where:{ isPrimary:true }, take:1 }
        }}}}
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    res.json({ messages: messages.reverse() })
  } catch (err: any) {
    console.error('[ROOMS MESSAGES]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms/:id/messages
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Mensagem vazia.' })

    const member = await prisma.privateRoomMember.findFirst({
      where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null }
    })
    if (!member) return res.status(403).json({ error: 'Sem acesso a esta sala.' })

    const room = await prisma.privateRoom.findUnique({ where: { id: req.params.id } })
    if (!room || room.status !== 'ACTIVE') return res.status(404).json({ error: 'Sala não encontrada.' })

    const message = await (prisma as any).roomMessage.create({
      data: { roomId: req.params.id, senderUserId: req.userId!, body: body.trim() },
      include: { sender: { select: { id:true, profile:{ select:{ displayName:true } } } } }
    })

    // Emit to room members via Socket.io
    try {
      const { io } = await import('../index')
      io.to(`room:${req.params.id}`).emit('room_message', message)
    } catch {}

    res.status(201).json(message)
  } catch (err: any) {
    console.error('[ROOMS POST MSG]', err.message)
    res.status(500).json({ error: 'Erro ao enviar mensagem.' })
  }
})

// POST /api/rooms/:id/invite
router.post('/:id/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId obrigatório.' })

    const member = await prisma.privateRoomMember.findFirst({
      where: { privateRoomId: req.params.id, userId: req.userId!, role: 'owner', leftAt: null }
    })
    if (!member) return res.status(403).json({ error: 'Apenas o criador pode convidar.' })

    const count = await prisma.privateRoomMember.count({ where: { privateRoomId: req.params.id, leftAt: null } })
    const room  = await prisma.privateRoom.findUnique({ where: { id: req.params.id } })
    const max   = MAX_MEMBERS[(room as any)?.roomType ?? 'CUSTOM'] ?? 12
    if (count >= max) return res.status(400).json({ error: 'Sala com o número máximo de membros.' })

    await prisma.privateRoomMember.upsert({
      where: { privateRoomId_userId: { privateRoomId: req.params.id, userId } },
      update: { leftAt: null, role: 'invited', joinedAt: new Date() },
      create: { privateRoomId: req.params.id, userId, role: 'invited', joinedAt: new Date() }
    })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms/:id/accept
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.privateRoomMember.updateMany({
    where: { privateRoomId: req.params.id, userId: req.userId!, role: 'invited' },
    data: { role: 'member', joinedAt: new Date() }
  })
  res.json({ ok: true })
})

// DELETE /api/rooms/:id/leave
router.delete('/:id/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.privateRoomMember.updateMany({
    where: { privateRoomId: req.params.id, userId: req.userId! },
    data: { leftAt: new Date() }
  })
  res.json({ ok: true })
})

// PUT /api/rooms/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const member = await prisma.privateRoomMember.findFirst({
    where: { privateRoomId: req.params.id, userId: req.userId!, role: 'owner', leftAt: null }
  })
  if (!member) return res.status(403).json({ error: 'Apenas o criador pode editar.' })
  const { title, status } = req.body
  await prisma.privateRoom.update({
    where: { id: req.params.id },
    data: { ...(title && { title }), ...(status && { status }) }
  })
  res.json({ ok: true })
})

export default router
