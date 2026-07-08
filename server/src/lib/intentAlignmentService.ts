// 8.8/8.10 — Shared Intentions (IntentAlignment) versioning. Deliberately
// mirrors the shape already established by roomRuleService.ts's
// RoomRuleSet (DRAFT -> WAITING_APPROVAL -> ACTIVE/SUPERSEDED) and
// ProfileAgreement's version bumping — same "never edit the active
// version in place, propose a new version, require everyone to
// re-approve" philosophy, applied to a different, unrelated concept. Per
// 8.11, keep this fully separate from RoomRuleSet/ConsentCheck — a room
// can have an ACTIVE RoomRuleSet, several ConsentChecks, and an ACTIVE
// IntentAlignment all at once, and they never share a table or a status
// value.
import prisma from './prisma'
import { isValidIntentField } from './intentAlignmentFields'
import { notifyUser } from './notify'

const activeMemberUserIds = async (roomId: string): Promise<string[]> => {
  const members = await (prisma as any).privateRoomMember.findMany({
    where: { privateRoomId: roomId, leftAt: null, status: 'ACCEPTED' },
    select: { userId: true }
  })
  return members.map((m: any) => m.userId)
}

export interface AlignmentItemInput {
  key: string
  value: string
  label?: string
}

export const getCurrentAlignment = async (roomId: string) => {
  return (prisma as any).intentAlignment.findFirst({
    where: { privateRoomId: roomId, status: 'ACTIVE' },
    include: { items: true, approvals: true },
    orderBy: { version: 'desc' }
  })
}

export const getPendingAlignment = async (roomId: string) => {
  return (prisma as any).intentAlignment.findFirst({
    where: { privateRoomId: roomId, status: { in: ['DRAFT', 'WAITING_APPROVAL'] } },
    include: { items: true, approvals: true },
    orderBy: { version: 'desc' }
  })
}

const buildState = async (alignment: any, roomId: string) => {
  const required = await activeMemberUserIds(roomId)
  const approvedIds = new Set(
    (alignment.approvals || []).filter((a: any) => a.approvedAt && !a.declinedAt && !a.revokedAt).map((a: any) => a.userId)
  )
  return {
    alignment, requiredCount: required.length, approvedCount: approvedIds.size,
    allApproved: required.length > 0 && required.every(uid => approvedIds.has(uid))
  }
}

interface ProposeResult { alignment?: any; error?: 'INVALID_ITEMS' | 'PENDING_EXISTS' | 'NOT_MEMBER' }

// Proposes a new version. The proposer is auto-approved (they authored
// it). If the room only has one active member (edge case) this activates
// immediately; otherwise it waits for the rest via approveAlignment.
export const proposeAlignment = async (roomId: string, userId: string, items: AlignmentItemInput[]): Promise<ProposeResult> => {
  const required = await activeMemberUserIds(roomId)
  if (!required.includes(userId)) return { error: 'NOT_MEMBER' }

  const invalid = items.some(i => !isValidIntentField(i.key, i.value))
  if (invalid || items.length === 0) return { error: 'INVALID_ITEMS' }

  const pending = await getPendingAlignment(roomId)
  if (pending) return { error: 'PENDING_EXISTS' }

  const current = await getCurrentAlignment(roomId)
  const nextVersion = (current?.version || 0) + 1

  const created = await (prisma as any).intentAlignment.create({
    data: {
      privateRoomId: roomId, version: nextVersion, status: 'WAITING_APPROVAL', createdByUserId: userId,
      items: { create: items.map(i => ({ key: i.key, value: i.value, label: i.label })) },
      approvals: { create: [{ userId, approvedAt: new Date() }] }
    },
    include: { items: true, approvals: true }
  })

  const others = required.filter(uid => uid !== userId)
  await Promise.all(others.map(uid => notifyUser(
    uid, 'intent_alignment_proposed', '🧭 Nova proposta de Intenções Partilhadas',
    'Alguém propôs uma atualização às Intenções Partilhadas desta sala.',
    { roomId, tab: 'rooms' }
  )))

  return finalizeIfComplete(created, roomId)
}

const finalizeIfComplete = async (alignment: any, roomId: string): Promise<ProposeResult> => {
  const state = await buildState(alignment, roomId)
  if (!state.allApproved) return { alignment }

  const [activated] = await (prisma as any).$transaction([
    (prisma as any).intentAlignment.update({
      where: { id: alignment.id },
      data: { status: 'ACTIVE', activatedAt: new Date() },
      include: { items: true, approvals: true }
    }),
    (prisma as any).intentAlignment.updateMany({
      where: { privateRoomId: roomId, status: 'ACTIVE', id: { not: alignment.id } },
      data: { status: 'ARCHIVED', archivedAt: new Date() }
    })
  ])

  const required = await activeMemberUserIds(roomId)
  await Promise.all(required.map(uid => notifyUser(
    uid, 'intent_alignment_activated', '🧭 Intenções Partilhadas atualizadas',
    'Todos concordaram — as Intenções Partilhadas desta sala foram atualizadas.',
    { roomId, tab: 'rooms' }
  )))

  return { alignment: activated }
}

interface ApproveResult { alignment?: any; error?: 'NOT_FOUND' | 'NOT_PENDING' | 'NOT_MEMBER' }

export const approveAlignment = async (alignmentId: string, userId: string): Promise<ApproveResult> => {
  const alignment = await (prisma as any).intentAlignment.findUnique({ where: { id: alignmentId }, include: { items: true, approvals: true } })
  if (!alignment) return { error: 'NOT_FOUND' }
  if (alignment.status !== 'WAITING_APPROVAL' && alignment.status !== 'DRAFT') return { error: 'NOT_PENDING' }

  const required = await activeMemberUserIds(alignment.privateRoomId)
  if (!required.includes(userId)) return { error: 'NOT_MEMBER' }

  await (prisma as any).intentAlignmentApproval.upsert({
    where: { alignmentId_userId: { alignmentId, userId } },
    update: { approvedAt: new Date(), declinedAt: null, revokedAt: null },
    create: { alignmentId, userId, approvedAt: new Date() }
  })

  const refreshed = await (prisma as any).intentAlignment.findUnique({ where: { id: alignmentId }, include: { items: true, approvals: true } })
  const result = await finalizeIfComplete(refreshed, alignment.privateRoomId)
  return { alignment: result.alignment }
}

interface DeclineResult { alignment?: any; error?: 'NOT_FOUND' | 'NOT_PENDING' | 'NOT_MEMBER' }

// 8.10/8.12 — one explicit decline archives the proposal immediately
// WITHOUT it ever reaching ACTIVE. The previous ACTIVE alignment (if any)
// is left completely untouched — it stays the current one.
export const declineAlignment = async (alignmentId: string, userId: string): Promise<DeclineResult> => {
  const alignment = await (prisma as any).intentAlignment.findUnique({ where: { id: alignmentId } })
  if (!alignment) return { error: 'NOT_FOUND' }
  if (alignment.status !== 'WAITING_APPROVAL' && alignment.status !== 'DRAFT') return { error: 'NOT_PENDING' }

  const required = await activeMemberUserIds(alignment.privateRoomId)
  if (!required.includes(userId)) return { error: 'NOT_MEMBER' }

  await (prisma as any).intentAlignmentApproval.upsert({
    where: { alignmentId_userId: { alignmentId, userId } },
    update: { declinedAt: new Date(), approvedAt: null },
    create: { alignmentId, userId, declinedAt: new Date() }
  })

  const archived = await (prisma as any).intentAlignment.update({
    where: { id: alignmentId },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
    include: { items: true, approvals: true }
  })

  const others = required.filter(uid => uid !== userId)
  await Promise.all(others.map(uid => notifyUser(
    uid, 'intent_alignment_declined', '🧭 Proposta recusada',
    'Alguém não concordou com a proposta de Intenções Partilhadas — a versão anterior mantém-se.',
    { roomId: alignment.privateRoomId, tab: 'rooms' }
  )))

  return { alignment: archived }
}

export const getAlignmentState = async (alignmentId: string) => {
  const alignment = await (prisma as any).intentAlignment.findUnique({ where: { id: alignmentId }, include: { items: true, approvals: true } })
  if (!alignment) return null
  return buildState(alignment, alignment.privateRoomId)
}
