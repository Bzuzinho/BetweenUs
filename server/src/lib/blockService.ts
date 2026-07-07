// 9.3 — BlockService: the single, centralized place blocking happens.
// Before this, blocking logic was split between privacy.ts's route (the
// ProfileAction upsert + match transition) and domainEvents.ts's
// MATCH_BLOCKED handler (photo access revoke) — both stay, but this file
// is now the one thing routes call, and it adds the two pieces that were
// missing entirely: a block-time guard reused by createLikeOrMatch, and
// shared Private Room handling.
//
// Room policy (spec 9.3 explicitly asks for this to be a defined,
// documented policy rather than an unexamined default):
//   - A room where blocking would leave 2 or fewer active members is
//     effectively just "the two of them" — SAFETY_LOCK the whole room
//     (via PrivateRoomStateMachine, same mechanism 7.3 already built for
//     exactly this and never wired up). Mirrors what already happens to a
//     1:1 Match on block.
//   - A room with 3+ active members (couple-couple, poly group) is NOT
//     collapsed for everyone over one severed relationship inside it —
//     only the blocking user leaves that room (their own
//     PrivateRoomMember row gets leftAt set), the same mechanism Safe
//     Exit's "leave room" already uses. The blocked party is never
//     force-removed by someone else's block action; the room keeps
//     working for whoever's left.
// The target is never notified, in either case.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'
import { canTransitionRoom } from './privateRoomStateMachine'

export interface BlockResult {
  ok: true
  matchesEnded: number
  roomsSafetyLocked: string[]
  roomsLeft: string[]
}

// 9.3 — reused by createLikeOrMatch (matchService.ts) so a like/match
// cannot be forced through a direct API call between two profiles where a
// block exists in either direction, even though discovery already
// excludes them from ever seeing each other organically (5.3).
export const isBlockedEitherWay = async (profileAId: string, profileBId: string): Promise<boolean> => {
  const block = await prisma.profileAction.findFirst({
    where: {
      action: 'BLOCK',
      OR: [
        { actorProfileId: profileAId, targetProfileId: profileBId },
        { actorProfileId: profileBId, targetProfileId: profileAId },
      ]
    },
    select: { id: true }
  })
  return !!block
}

const handleSharedRooms = async (actorUserIds: string[], targetUserIds: string[]): Promise<{ safetyLocked: string[]; left: string[] }> => {
  const [actorRoomIds, targetRoomIds] = await Promise.all([
    (prisma as any).privateRoomMember.findMany({ where: { userId: { in: actorUserIds }, leftAt: null }, select: { privateRoomId: true } }),
    (prisma as any).privateRoomMember.findMany({ where: { userId: { in: targetUserIds }, leftAt: null }, select: { privateRoomId: true } }),
  ])
  const targetRoomIdSet = new Set<string>(targetRoomIds.map((r: any) => r.privateRoomId as string))
  const sharedRoomIds: string[] = [...new Set<string>(
    actorRoomIds.map((r: any) => r.privateRoomId as string).filter((id: string) => targetRoomIdSet.has(id))
  )]

  const safetyLocked: string[] = []
  const left: string[] = []

  for (const roomId of sharedRoomIds) {
    const room = await (prisma as any).privateRoom.findUnique({
      where: { id: roomId },
      include: { members: { where: { leftAt: null, status: 'ACCEPTED' } } }
    })
    if (!room || room.status === 'CLOSED') continue

    if (room.members.length <= 2) {
      const check = canTransitionRoom(room.status, 'SAFETY_LOCK')
      if (check.allowed) {
        await (prisma as any).privateRoom.update({
          where: { id: roomId },
          data: { status: check.toState, safetyLockedAt: new Date() }
        })
        safetyLocked.push(roomId)
      }
    } else {
      await (prisma as any).privateRoomMember.updateMany({
        where: { privateRoomId: roomId, userId: { in: actorUserIds }, leftAt: null },
        data: { leftAt: new Date() }
      })
      left.push(roomId)
      // If that emptied the room down to nobody (shouldn't normally
      // happen given the >2 branch, but stay consistent with the Safe
      // Exit leave-route's own safety check), close it rather than leave
      // a zero-member room lingering ACTIVE.
      const remaining = await (prisma as any).privateRoomMember.count({ where: { privateRoomId: roomId, leftAt: null, status: 'ACCEPTED' } })
      if (remaining === 0) {
        const closeCheck = canTransitionRoom(room.status, 'CLOSE')
        if (closeCheck.allowed) {
          await (prisma as any).privateRoom.update({ where: { id: roomId }, data: { status: closeCheck.toState, closedAt: new Date() } })
        }
      }
    }
  }

  return { safetyLocked, left }
}

export const blockProfile = async (actorProfileId: string, targetProfileId: string): Promise<BlockResult> => {
  await prisma.profileAction.upsert({
    where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
    update: { action: 'BLOCK' },
    create: { actorProfileId, targetProfileId, action: 'BLOCK' }
  })

  // End any active/pending match. BLOCK is valid from every non-terminal
  // matchStateMachine state; MATCH_BLOCKED's domain event handler
  // revokes standing PhotoAccessRequest grants between the two sides.
  const affectedMatches = await prisma.match.findMany({
    where: {
      OR: [
        { profileOneId: actorProfileId, profileTwoId: targetProfileId },
        { profileOneId: targetProfileId, profileTwoId: actorProfileId }
      ]
    },
    select: { id: true }
  })
  if (affectedMatches.length > 0) {
    const { transition } = await import('./matchService')
    await Promise.all(affectedMatches.map((m: any) => transition(m.id, 'BLOCK').catch(() => {})))
  }

  const [actorMembers, targetMembers] = await Promise.all([
    getActiveMembers(actorProfileId),
    getActiveMembers(targetProfileId),
  ])
  const { safetyLocked, left } = await handleSharedRooms(
    actorMembers.map(m => m.userId),
    targetMembers.map(m => m.userId)
  )

  // Deliberately no notifyUser call anywhere in this function or its
  // helpers — the target must never learn they were blocked (spec 9.3).
  return { ok: true, matchesEnded: affectedMatches.length, roomsSafetyLocked: safetyLocked, roomsLeft: left }
}
