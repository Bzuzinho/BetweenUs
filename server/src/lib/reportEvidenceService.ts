// 9.1/9.2 — ReportEvidence: restricted, immutable snapshots captured at
// report-submission time. Deliberately NOT a live reference to
// Message/RoomMessage/ProfilePhoto — the whole point of a snapshot is
// that moderation can still read it after the source row is soft-deleted
// (sender delete, TTL cleanup job, account changes), which a live FK
// join would silently lose. Each capture function only copies the
// restricted field subset documented on it — never a full row dump.
import prisma from './prisma'
import { logAdminAction } from '../middleware/admin'

export type EvidenceTypeValue = 'MESSAGE_SNAPSHOT' | 'PROFILE_SNAPSHOT' | 'MEDIA_REFERENCE' | 'ROOM_CONTEXT' | 'SYSTEM_EVENT'

// Types whose content is sensitive enough that VIEWING them (not just
// having the report exist) should be logged per 9.2's "registar acesso a
// evidência altamente sensível quando aplicável" — a bare SYSTEM_EVENT
// note doesn't carry the same sensitivity as an actual message body or a
// media reference, so it's excluded from the access log to avoid drowning
// the real signal in noise.
const HIGH_SENSITIVITY_TYPES: EvidenceTypeValue[] = ['MESSAGE_SNAPSHOT', 'MEDIA_REFERENCE', 'PROFILE_SNAPSHOT']

const addEvidence = async (reportId: string, type: EvidenceTypeValue, data: Record<string, any>) => {
  return (prisma as any).reportEvidence.create({ data: { reportId, type, data } })
}

// Restricted subset: messageId, body, senderUserId, sentAt, and whichever
// container (roomId for a Private Room message, conversationId for a
// regular match conversation) it came from. Explicitly nothing about the
// recipient, no read receipts, no unrelated conversation history.
export const captureMessageSnapshot = async (reportId: string, messageId: string, source: 'CONVERSATION' | 'ROOM') => {
  if (source === 'ROOM') {
    const msg = await (prisma as any).roomMessage.findUnique({ where: { id: messageId } })
    if (!msg) return null
    return addEvidence(reportId, 'MESSAGE_SNAPSHOT', {
      messageId: msg.id, body: msg.body, senderUserId: msg.senderUserId,
      sentAt: msg.createdAt, roomId: msg.roomId, messageType: msg.messageType
    })
  }
  const msg = await prisma.message.findUnique({ where: { id: messageId } })
  if (!msg) return null
  return addEvidence(reportId, 'MESSAGE_SNAPSHOT', {
    messageId: msg.id, body: msg.body, senderUserId: msg.senderUserId,
    sentAt: msg.createdAt, conversationId: msg.conversationId, messageType: msg.messageType
  })
}

// Restricted subset: nothing that isn't already visible in the normal
// product surface (displayName, type, city, status) — no NIF, no real
// name, no unrelated private interests. Mirrors the 9.9 minimization
// principle applied here to evidence capture generally.
export const captureProfileSnapshot = async (reportId: string, profileId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, displayName: true, type: true, city: true, status: true, createdAt: true }
  })
  if (!profile) return null
  return addEvidence(reportId, 'PROFILE_SNAPSHOT', { ...profile })
}

// Reference only — storagePath is a private R2 key already gated behind
// signed-URL access (mediaAccessService), never a public URL, and this
// does NOT copy image bytes.
export const captureMediaReference = async (reportId: string, photoId: string) => {
  const photo = await prisma.profilePhoto.findUnique({
    where: { id: photoId },
    select: { id: true, profileId: true, storagePath: true, visibilityLevel: true, moderationStatus: true, memberScope: true }
  })
  if (!photo) return null
  return addEvidence(reportId, 'MEDIA_REFERENCE', { ...photo })
}

// Snapshot of the room's state at report time (who was in it, what type,
// current status) — not the message history (that's MESSAGE_SNAPSHOT's job).
export const captureRoomContext = async (reportId: string, roomId: string) => {
  const room = await (prisma as any).privateRoom.findUnique({
    where: { id: roomId },
    include: { members: { where: { leftAt: null }, select: { userId: true, role: true, status: true } } }
  })
  if (!room) return null
  return addEvidence(reportId, 'ROOM_CONTEXT', {
    roomId: room.id, roomType: room.roomType, status: room.status,
    memberUserIds: room.members.map((m: any) => m.userId)
  })
}

// Catch-all for anything system-derived worth attaching that isn't a
// message/profile/media/room snapshot (e.g. "a ConsentCheck was revoked
// shortly before this report was filed").
export const captureSystemEvent = async (reportId: string, label: string, meta: Record<string, any> = {}) => {
  return addEvidence(reportId, 'SYSTEM_EVENT', { label, meta, capturedAt: new Date().toISOString() })
}

// 9.2 — the ONLY place evidence is read back out. Callers (routes) are
// responsible for the moderation.evidence.view permission check BEFORE
// calling this; this function's job is just the access log for
// high-sensitivity types, and to keep evidence out of any non-detail
// response shape (never called from a list/summary endpoint).
export const getReportEvidenceForModerator = async (reportId: string, moderatorUserId: string) => {
  const evidence = await (prisma as any).reportEvidence.findMany({ where: { reportId }, orderBy: { createdAt: 'asc' } })

  const sensitiveTypes = evidence.filter((e: any) => HIGH_SENSITIVITY_TYPES.includes(e.type))
  if (sensitiveTypes.length > 0) {
    await logAdminAction(moderatorUserId, 'VIEW_REPORT_EVIDENCE', 'report', reportId, {
      internalNote: `Accessed ${sensitiveTypes.length} high-sensitivity evidence item(s): ${sensitiveTypes.map((e: any) => e.type).join(', ')}`
    })
  }

  return evidence
}
