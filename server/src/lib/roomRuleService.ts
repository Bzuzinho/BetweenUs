// 7.4 — RoomRuleSet/RoomRule/RoomRuleApproval: versioned, room-wide rules
// that every active member must consent to, replacing the old flat
// `PrivateRoom.rules: String[]` (no version, no per-member acceptance,
// anyone could silently edit it with zero consequence).
//
// Flow: propose a new version (DRAFT) -> room moves to WAITING_CONSENT ->
// new messages blocked (privateRoomStateMachine.roomAcceptsNewMessages) ->
// every currently active member accepts -> version becomes ACTIVE, any
// prior ACTIVE version is SUPERSEDED, room moves to ACTIVE. A member can
// revoke their acceptance at any time ("Consent can be updated anytime",
// 7.10) which pulls an ACTIVE room back into WAITING_CONSENT until
// everyone reaffirms.
import prisma from './prisma'
import { canTransitionRoom } from './privateRoomStateMachine'

export interface RuleInput {
  ruleType: string
  label: string
  value?: string | null
  sortOrder?: number
}

// A reasonable, non-explicit starter set — deliberately generic (mirrors
// how the private-interest and agreement-question catalogs were seeded:
// enough to be useful, not a finished taxonomy the product owner should
// actually curate).
export const DEFAULT_ROOM_RULES: RuleInput[] = [
  { ruleType: 'CONSENT', label: 'O consentimento pode ser atualizado a qualquer momento por qualquer membro.', sortOrder: 0 },
  { ruleType: 'PRIVACY', label: 'Não partilhar conteúdo desta sala fora dela sem autorização explícita.', sortOrder: 1 },
  { ruleType: 'COMMUNICATION', label: 'Respeito mútuo em todas as mensagens.', sortOrder: 2 },
  { ruleType: 'MEETING', label: 'Definir um local seguro e público antes de qualquer encontro presencial.', sortOrder: 3 },
]

const activeMemberUserIds = async (roomId: string): Promise<string[]> => {
  const members = await (prisma as any).privateRoomMember.findMany({
    where: { privateRoomId: roomId, leftAt: null, status: 'ACCEPTED' },
    select: { userId: true }
  })
  return members.map((m: any) => m.userId)
}

// The rule set members currently see as "the rules" — the latest version
// that isn't SUPERSEDED (a pending DRAFT under consideration if one
// exists, otherwise whatever is ACTIVE).
export const getCurrentRuleSet = async (roomId: string) => {
  return (prisma as any).roomRuleSet.findFirst({
    where: { roomId, status: { in: ['DRAFT', 'ACTIVE'] } },
    orderBy: { version: 'desc' },
    include: { rules: { orderBy: { sortOrder: 'asc' } }, approvals: true }
  })
}

export interface RuleServiceResult {
  ok: boolean
  error?: string
  ruleSetId?: string
  roomStatus?: string
}

// Creates version 1 at room creation time, or a new version when an
// existing member proposes a material change. Immediately moves the room
// into WAITING_CONSENT via the state machine — a proposed rule set is
// never silently "just there", it always requires the room to formally
// wait for everyone's consent, blocking new messages in the meantime.
export const proposeRuleSet = async (
  roomId: string, createdByUserId: string, rules: RuleInput[]
): Promise<RuleServiceResult> => {
  const room = await (prisma as any).privateRoom.findUnique({ where: { id: roomId } })
  if (!room) return { ok: false, error: 'Sala não encontrada.' }

  const check = canTransitionRoom(room.status, 'REQUEST_CONSENT')
  if (!check.allowed) return { ok: false, error: check.reason }

  const latest = await (prisma as any).roomRuleSet.findFirst({ where: { roomId }, orderBy: { version: 'desc' } })
  const nextVersion = (latest?.version || 0) + 1

  const ruleSet = await (prisma as any).roomRuleSet.create({
    data: {
      roomId, version: nextVersion, status: 'DRAFT', createdByUserId,
      rules: { create: rules.map((r, i) => ({ ruleType: r.ruleType, label: r.label, value: r.value || null, sortOrder: r.sortOrder ?? i })) }
    }
  })

  await (prisma as any).privateRoom.update({ where: { id: roomId }, data: { status: check.toState } })
  return { ok: true, ruleSetId: ruleSet.id, roomStatus: check.toState! }
}

// Records one member's acceptance of the current pending rule set. Once
// every currently active member has accepted, the rule set becomes ACTIVE
// (superseding whatever was ACTIVE before) and the room itself activates.
export const acceptRuleSet = async (roomId: string, userId: string): Promise<RuleServiceResult> => {
  const ruleSet = await getCurrentRuleSet(roomId)
  if (!ruleSet) return { ok: false, error: 'Não há regras para aceitar nesta sala.' }
  if (ruleSet.status === 'ACTIVE') {
    // Nothing pending — accepting an already-ACTIVE set is a no-op success
    // (idempotent), not an error, so a client retry never surprises the user.
    return { ok: true, ruleSetId: ruleSet.id, roomStatus: 'ACTIVE' }
  }

  await (prisma as any).roomRuleApproval.upsert({
    where: { ruleSetId_userId: { ruleSetId: ruleSet.id, userId } },
    update: { acceptedAt: new Date(), revokedAt: null },
    create: { ruleSetId: ruleSet.id, userId, acceptedAt: new Date() }
  })

  const required = await activeMemberUserIds(roomId)
  const approvals = await (prisma as any).roomRuleApproval.findMany({
    where: { ruleSetId: ruleSet.id, acceptedAt: { not: null }, revokedAt: null }
  })
  const approvedIds = new Set(approvals.map((a: any) => a.userId))
  const allAccepted = required.length > 0 && required.every(uid => approvedIds.has(uid))

  if (!allAccepted) return { ok: true, ruleSetId: ruleSet.id, roomStatus: 'WAITING_CONSENT' }

  const room = await (prisma as any).privateRoom.findUnique({ where: { id: roomId } })
  const check = canTransitionRoom(room.status, 'ACTIVATE')
  if (!check.allowed) return { ok: false, error: check.reason }

  const wasAlreadyActive = room.status === 'ACTIVE'

  await prisma.$transaction([
    (prisma as any).roomRuleSet.updateMany({ where: { roomId, status: 'ACTIVE' }, data: { status: 'SUPERSEDED' } }),
    (prisma as any).roomRuleSet.update({ where: { id: ruleSet.id }, data: { status: 'ACTIVE', activatedAt: new Date() } }),
    (prisma as any).privateRoom.update({ where: { id: roomId }, data: { status: check.toState } }),
  ])

  // BETA.2 (FASE D) — the room-ready notification was missing entirely:
  // MATCH_ACTIVATED (domainEvents.ts) sends "sala desbloqueada" the moment
  // the room is CREATED (still WAITING_CONSENT — rules not accepted yet),
  // but nothing told members when the room actually became ACTIVE (chat
  // genuinely open). Only fires on a real DRAFT/WAITING_CONSENT -> ACTIVE
  // transition, not on the already-ACTIVE no-op path above (idempotent
  // re-accept shouldn't re-notify).
  if (!wasAlreadyActive) {
    const { notifyUser } = await import('./notify')
    await Promise.all(required.map(uid => notifyUser(
      uid, 'private_room', '✅ Sala pronta para conversar',
      'Todos aceitaram as regras da sala — já podem trocar mensagens.',
      { roomId, tab: 'rooms' }
    ).catch(() => {})))
  }

  return { ok: true, ruleSetId: ruleSet.id, roomStatus: check.toState! }
}

// "Consent can be updated anytime" — a member can revoke their acceptance
// even after the room is fully ACTIVE, which pulls the room back into
// WAITING_CONSENT (new messages block again) until everyone reaffirms.
export const revokeRuleAcceptance = async (roomId: string, userId: string): Promise<RuleServiceResult> => {
  const ruleSet = await (prisma as any).roomRuleSet.findFirst({ where: { roomId, status: 'ACTIVE' } })
  if (!ruleSet) return { ok: false, error: 'Não há um conjunto de regras ativo para revogar.' }

  const approval = await (prisma as any).roomRuleApproval.findUnique({
    where: { ruleSetId_userId: { ruleSetId: ruleSet.id, userId } }
  })
  if (!approval || !approval.acceptedAt) return { ok: false, error: 'Ainda não tinhas aceite estas regras.' }

  await (prisma as any).roomRuleApproval.update({ where: { id: approval.id }, data: { revokedAt: new Date() } })

  const room = await (prisma as any).privateRoom.findUnique({ where: { id: roomId } })
  const check = canTransitionRoom(room.status, 'REQUEST_CONSENT')
  if (check.allowed) {
    await (prisma as any).privateRoom.update({ where: { id: roomId }, data: { status: check.toState } })
  }
  return { ok: true, ruleSetId: ruleSet.id, roomStatus: check.allowed ? check.toState! : room.status }
}

// Aggregate-only consent state for the pinned UI section (7.10) — how many
// of how many active members have accepted, never who specifically hasn't
// (matches the same privacy-by-default pattern used throughout Sprint 6's
// Modo Acordo).
export const getConsentState = async (roomId: string) => {
  const ruleSet = await getCurrentRuleSet(roomId)
  if (!ruleSet) return null
  const required = await activeMemberUserIds(roomId)
  const approved = (ruleSet.approvals || []).filter((a: any) => a.acceptedAt && !a.revokedAt).length
  return {
    ruleSetId: ruleSet.id, version: ruleSet.version, status: ruleSet.status,
    rules: ruleSet.rules, requiredCount: required.length, approvedCount: approved,
    allApproved: required.length > 0 && approved >= required.length,
  }
}
