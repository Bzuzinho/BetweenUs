// 7.5 — RoomAuthorizationService: the single place every Private Room
// action (HTTP route AND Socket.IO handler) checks permission through.
//
// Before this, rooms.ts re-implemented "am I a member of this room" as a
// raw prisma.privateRoomMember.findFirst(...) at the top of every route,
// and Socket.IO's room:join/leave had NO check at all (confirmed in the
// Sprint 7 audit — any authenticated-or-not socket could join any room by
// guessing its id). Centralizing here means both surfaces enforce exactly
// the same rules, and there is one place to harden instead of N.
import prisma from './prisma'
import { roomAcceptsNewMessages, type RoomState } from './privateRoomStateMachine'

export interface RoomAuthResult {
  ok: boolean
  reason?: string
  member?: { id: string; role: string; status: string }
  room?: { id: string; status: RoomState; matchId: string | null }
}

// Full chain per the spec: user authenticated (caller's job — this
// service always requires a userId already resolved by requireAuth or the
// socket auth handshake, see 7.8), active User, active ProfileMember when
// the room is tied to a match (a couple that later loses a member should
// lose room access even if their PrivateRoomMember row is untouched),
// PrivateRoomMember exists with leftAt null and status ACCEPTED.
export const resolveRoomMembership = async (roomId: string, userId: string): Promise<RoomAuthResult> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } })
  if (!user) return { ok: false, reason: 'Utilizador não encontrado.' }
  if (user.status !== 'ACTIVE') return { ok: false, reason: 'Conta não está ativa.' }

  const room = await (prisma as any).privateRoom.findUnique({
    where: { id: roomId }, select: { id: true, status: true, matchId: true }
  })
  if (!room) return { ok: false, reason: 'Sala não encontrada.' }

  const member = await (prisma as any).privateRoomMember.findFirst({
    where: { privateRoomId: roomId, userId, leftAt: null, status: 'ACCEPTED' },
    select: { id: true, role: true, status: true }
  })
  if (!member) return { ok: false, reason: 'Sem acesso a esta sala.' }

  // For a match-derived room, also require the user to still be an active
  // member of one of the two matched profiles — PrivateRoomMember alone
  // can go stale if profile membership changes after the room was created
  // (e.g. a couple removes a partner; see profileMembershipService.removeMember).
  if (room.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: room.matchId }, select: { profileOneId: true, profileTwoId: true }
    })
    if (match) {
      const { isActiveMember } = await import('./profileMembershipService')
      const stillActive = await isActiveMember(match.profileOneId, userId) || await isActiveMember(match.profileTwoId, userId)
      if (!stillActive) return { ok: false, reason: 'Já não pertences a nenhum dos perfis ligados a esta sala.' }
    }
  }

  return { ok: true, member, room }
}

export const canSendMessage = async (roomId: string, userId: string): Promise<RoomAuthResult> => {
  const result = await resolveRoomMembership(roomId, userId)
  if (!result.ok) return result
  if (!roomAcceptsNewMessages(result.room!.status)) {
    return { ...result, ok: false, reason: `A sala não aceita novas mensagens neste estado (${result.room!.status}).` }
  }
  return result
}

// Content moderation (deleting/removing someone else's message) is
// deliberately NEVER granted to a normal OWNER — only MODERATOR_SYSTEM,
// per the explicit spec requirement. A member can still delete their OWN
// message (checked separately at the call site via senderUserId, not
// through this permission).
export const canModerateContent = async (roomId: string, userId: string): Promise<RoomAuthResult> => {
  const result = await resolveRoomMembership(roomId, userId)
  if (!result.ok) return result
  if (result.member!.role !== 'MODERATOR_SYSTEM') {
    return { ...result, ok: false, reason: 'Apenas moderação de sistema pode remover conteúdo de outros membros.' }
  }
  return result
}

// Inviting new members / editing room metadata (title, description) is
// reserved for OWNER — and only standalone rooms (POST /rooms) ever have
// an OWNER; match-derived rooms (7.9) intentionally assign none, since
// their membership mirrors the match's ProfileMembers automatically and
// isn't meant to be manually invited into.
export const canManageRoom = async (roomId: string, userId: string): Promise<RoomAuthResult> => {
  const result = await resolveRoomMembership(roomId, userId)
  if (!result.ok) return result
  if (result.member!.role !== 'OWNER') {
    return { ...result, ok: false, reason: 'Apenas o criador da sala pode geri-la.' }
  }
  return result
}

// Proposing/accepting rule set changes is open to any accepted member —
// consistent with Sprint 6's Modo Acordo philosophy (shared control, not
// owner-dictated), and acceptance itself is what actually gates the
// change, not who proposed it.
export const canManageRules = async (roomId: string, userId: string): Promise<RoomAuthResult> =>
  resolveRoomMembership(roomId, userId)
