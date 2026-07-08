// 7.9 — PrivateRoomService.createFromMatch(): the single place a
// match-derived Private Room gets created, replacing the inline block
// that lived in domainEvents.ts's MATCH_ACTIVATED handler since Sprint 6.
// Room type is derived from the actual profile types on both sides of the
// match (not guessed from member count), and membership is populated
// directly from ProfileMembershipService.getActiveMembers for both
// profiles — the room's participant list is always exactly the match's
// real active members, never manually curated.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'
import { DEFAULT_ROOM_RULES, proposeRuleSet } from './roomRuleService'

// PrivateRoomType is a new enum (7.2) that the sandbox's generated Prisma
// Client predates (no network access to regenerate it here) — same
// stale-client workaround used throughout this project since Sprint 3
// (see contactHashService.ts). Kept as a plain string union rather than
// importing the not-yet-regenerated type.
type PrivateRoomTypeValue = 'INDIVIDUAL_PAIR' | 'COUPLE_SINGLE' | 'COUPLE_COUPLE' | 'POLY_GROUP' | 'CUSTOM'

const inferRoomType = (typeOne: string, typeTwo: string): PrivateRoomTypeValue => {
  if (typeOne === 'INDIVIDUAL' && typeTwo === 'INDIVIDUAL') return 'INDIVIDUAL_PAIR'
  if (typeOne === 'COUPLE' && typeTwo === 'COUPLE') return 'COUPLE_COUPLE'
  if ((typeOne === 'COUPLE' && typeTwo === 'INDIVIDUAL') || (typeOne === 'INDIVIDUAL' && typeTwo === 'COUPLE')) return 'COUPLE_SINGLE'
  // GROUP or any future composition — no clean label yet, don't guess.
  return 'CUSTOM'
}

export interface CreateFromMatchResult {
  ok: boolean
  error?: string
  room?: any
  created: boolean // false if a room for this match already existed (idempotent)
}

export const createFromMatch = async (matchId: string): Promise<CreateFromMatchResult> => {
  const existing = await (prisma as any).privateRoom.findUnique({ where: { matchId } })
  if (existing) return { ok: true, room: existing, created: false }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      profileOne: { select: { id: true, type: true, displayName: true } },
      profileTwo: { select: { id: true, type: true, displayName: true } },
    }
  })
  if (!match) return { ok: false, error: 'Match não encontrado.', created: false }

  const [oneMembers, twoMembers] = await Promise.all([
    getActiveMembers(match.profileOneId), getActiveMembers(match.profileTwoId)
  ])
  const allUserIds = [...new Set([...oneMembers.map(m => m.userId), ...twoMembers.map(m => m.userId)])]
  if (allUserIds.length < 2) return { ok: false, error: 'Match não tem membros suficientes para uma sala.', created: false }

  const roomType = inferRoomType(match.profileOne.type, match.profileTwo.type)
  const title = `${match.profileOne.displayName} & ${match.profileTwo.displayName}`

  const room = await (prisma as any).privateRoom.create({
    data: {
      matchId, title, roomType, status: 'DRAFT',
      // Match-derived rooms deliberately assign no OWNER — see
      // roomAuthorizationService.ts's comment on canManageRoom for why:
      // membership here mirrors the match's own ProfileMembers, it isn't
      // something any one participant unilaterally controls.
      members: { create: allUserIds.map(userId => ({ userId, role: 'MEMBER', status: 'ACCEPTED', joinedAt: new Date() })) }
    }
  })

  // Immediately seed v1 rules and move the room into WAITING_CONSENT — a
  // match-derived room is never silently ACTIVE with zero agreed rules.
  await proposeRuleSet(room.id, allUserIds[0], DEFAULT_ROOM_RULES)

  const refreshed = await (prisma as any).privateRoom.findUnique({ where: { id: room.id } })
  return { ok: true, room: refreshed, created: true }
}
