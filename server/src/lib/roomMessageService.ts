// 7.8 — shared message create/delete logic, used by BOTH the HTTP route
// (POST /api/rooms/:id/messages) and the Socket.IO message:send handler,
// so the two surfaces can never drift out of sync on validation or TTL
// computation. senderUserId is always a parameter supplied by the CALLER
// from an already-authenticated source (req.userId from requireAuth, or
// socket.data.userId from the socket auth handshake) — never accepted
// from the message payload itself.
import prisma from './prisma'
import { canSendMessage } from './roomAuthorizationService'

const TTL_MS: Record<string, number | null> = {
  NONE: null, ONE_HOUR: 60 * 60 * 1000, ONE_DAY: 24 * 60 * 60 * 1000, SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000
}
const VALID_TYPES = ['TEXT', 'IMAGE', 'CONSENT_REQUEST', 'PHOTO_UNLOCK_REQUEST']

export interface SendMessageInput {
  body?: string
  messageType?: string
  mediaId?: string
  ttl?: string
}

export interface SendMessageResult {
  ok: boolean
  error?: string
  code?: 'VALIDATION' | 'FORBIDDEN'
  message?: any
}

export const sendRoomMessage = async (roomId: string, senderUserId: string, input: SendMessageInput): Promise<SendMessageResult> => {
  const messageType = VALID_TYPES.includes(input.messageType || '') ? input.messageType! : 'TEXT'
  if (messageType === 'TEXT' && !input.body?.trim()) return { ok: false, error: 'Mensagem vazia.', code: 'VALIDATION' }
  if (messageType === 'IMAGE' && !input.mediaId) return { ok: false, error: 'IMAGE requer mediaId.', code: 'VALIDATION' }

  const auth = await canSendMessage(roomId, senderUserId)
  if (!auth.ok) return { ok: false, error: auth.reason, code: 'FORBIDDEN' }

  const room = await (prisma as any).privateRoom.findUnique({ where: { id: roomId }, select: { defaultMessageTtl: true } })
  const effectiveTtl = input.ttl || room?.defaultMessageTtl
  const ttlMs = effectiveTtl ? TTL_MS[effectiveTtl] : null
  const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null

  const message = await (prisma as any).roomMessage.create({
    data: {
      roomId, senderUserId,
      body: input.body?.trim() || null,
      messageType,
      mediaId: input.mediaId || null,
      expiresAt,
    },
    include: { sender: { select: { id: true, profile: { select: { displayName: true } } } } }
  })
  const { notifyRoomMessageRecipients } = await import('./roomMessageNotificationService')
  void notifyRoomMessageRecipients(roomId, senderUserId, message)
  return { ok: true, message }
}

export interface DeleteMessageResult {
  ok: boolean
  error?: string
}

export const deleteRoomMessage = async (roomId: string, messageId: string, requestingUserId: string): Promise<DeleteMessageResult> => {
  const message = await (prisma as any).roomMessage.findUnique({ where: { id: messageId } })
  if (!message || message.roomId !== roomId) return { ok: false, error: 'Mensagem não encontrada.' }

  if (message.senderUserId !== requestingUserId) {
    const { canModerateContent } = await import('./roomAuthorizationService')
    const modAuth = await canModerateContent(roomId, requestingUserId)
    if (!modAuth.ok) return { ok: false, error: modAuth.reason }
  } else {
    const { resolveRoomMembership } = await import('./roomAuthorizationService')
    const auth = await resolveRoomMembership(roomId, requestingUserId)
    if (!auth.ok) return { ok: false, error: auth.reason }
  }

  await (prisma as any).roomMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } })
  return { ok: true }
}
