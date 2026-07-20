// BETA.1.18/1.19 — Private Rooms (A-F), Room Rules and chat messages.
// Rooms are created ONLY via privateRoomService.createFromMatch (never a
// raw prisma.privateRoom.create — see that service's header comment on
// why membership/roomType must be derived, not hand-picked) and moved
// through state via roomRuleService/canTransitionRoom exactly as the real
// routes do.
import prisma from '../../../src/lib/prisma'
import { createFromMatch } from '../../../src/lib/privateRoomService'
import { acceptRuleSet } from '../../../src/lib/roomRuleService'
import { canTransitionRoom, type RoomEvent } from '../../../src/lib/privateRoomStateMachine'
import { blockProfile } from '../../../src/lib/blockService'
import { createLikeOrMatch, transition } from '../../../src/lib/matchService'
import { isApprovalSatisfied } from '../../../src/lib/approvalPolicyService'
import { withTemporaryPremium } from '../withTemporaryPremium'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

const transitionRoom = async (roomId: string, event: RoomEvent) => {
  const room = await (prisma as any).privateRoom.findUnique({ where: { id: roomId } })
  if (!room) return
  const check = canTransitionRoom(room.status, event)
  if (!check.allowed) { console.warn(`  [WARN] room transition ${event} inválida a partir de ${room.status}: ${check.reason}`); return }
  await (prisma as any).privateRoom.update({
    where: { id: roomId },
    data: { status: check.toState, ...(event === 'CLOSE' ? { closedAt: new Date() } : {}), ...(event === 'SAFETY_LOCK' ? { safetyLockedAt: new Date() } : {}) },
  })
}

const seedMessages = async (roomId: string, senderUserId: string, otherUserId: string) => {
  const lines: Array<{ senderUserId: string; body: string; messageType: string; readAt?: Date | null; deletedAt?: Date | null; expiresAt?: Date | null }> = [
    { senderUserId, body: 'Olá! Gostámos do vosso perfil.', messageType: 'TEXT', readAt: new Date() },
    { senderUserId: otherUserId, body: 'Obrigado! Preferimos conversar com calma primeiro.', messageType: 'TEXT', readAt: new Date() },
    { senderUserId, body: 'Antes de avançarmos, podemos alinhar os nossos limites?', messageType: 'TEXT', readAt: null },
    { senderUserId: otherUserId, body: 'Mensagem que já foi apagada pelo remetente.', messageType: 'TEXT', deletedAt: new Date() },
    { senderUserId, body: 'Esta mensagem expira em breve.', messageType: 'TEXT', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    { senderUserId: otherUserId, body: 'Esta mensagem já expirou.', messageType: 'TEXT', expiresAt: new Date(Date.now() - 60 * 60 * 1000) },
  ]
  for (const line of lines) {
    const existing = await (prisma as any).roomMessage.findFirst({ where: { roomId, senderUserId: line.senderUserId, body: line.body } })
    if (existing) continue
    await (prisma as any).roomMessage.create({
      data: { roomId, senderUserId: line.senderUserId, body: line.body, messageType: line.messageType as any, readAt: line.readAt ?? null, deletedAt: line.deletedAt ?? null, expiresAt: line.expiresAt ?? null },
    })
  }
}

export const seedPrivateRooms = async (
  individuals: ProfileMap, couples: ProfileMap, matchIds: Record<string, string>,
  group?: { profileId: string; memberUserIds: string[] } | null
): Promise<Record<string, string>> => {
  const roomIds: Record<string, string> = {}

  if (matchIds.match_individual_active) {
    const r = await createFromMatch(matchIds.match_individual_active)
    if (r.ok && r.room) {
      roomIds.room_a_individual_active = r.room.id
      const marta = individuals['individual_marta']?.userId
      const joana = individuals['individual_joana']?.userId
      if (marta) await acceptRuleSet(r.room.id, marta)
      if (joana) await acceptRuleSet(r.room.id, joana)
      if (marta && joana) await seedMessages(r.room.id, marta, joana)
    }
  }

  if (matchIds.match_couple_active) {
    const r = await createFromMatch(matchIds.match_couple_active)
    if (r.ok && r.room) {
      roomIds.room_b_couple_single_waiting = r.room.id
      const joana = individuals['individual_joana']?.userId
      if (joana) await acceptRuleSet(r.room.id, joana)
    }
  }

  // ROOM C — couple x couple; temporarily bypass only the commercial
  // connection threshold while retaining all safety and approval logic.
  const c1 = couples['couple_1_third_match']
  const c2 = couples['couple_2_conflict']
  if (c1 && c2) {
    await withTemporaryPremium([...(c1.memberUserIds || []), ...(c2.memberUserIds || [])], async () => {
      await createLikeOrMatch(c1.profileId, c2.profileId)
      const reciprocal = await createLikeOrMatch(c2.profileId, c1.profileId)
      const matchId = reciprocal.kind === 'MATCH_PENDING_COUPLE_APPROVAL' || reciprocal.kind === 'ALREADY_MATCHED' ? reciprocal.matchId : null
      if (!matchId) return

      const match = await prisma.match.findUnique({ where: { id: matchId } })
      if (match && match.status !== 'ACTIVE') {
        for (const uid of [...(c1.memberUserIds || []), ...(c2.memberUserIds || [])]) {
          await prisma.coupleMatchApproval.upsert({
            where: { matchId_userId: { matchId, userId: uid } },
            update: { approvedAt: new Date() }, create: { matchId, userId: uid, approvedAt: new Date() },
          })
        }
        const approvedIds = new Set([...(c1.memberUserIds || []), ...(c2.memberUserIds || [])])
        const [oneSat, twoSat] = await Promise.all([
          isApprovalSatisfied(match.profileOneId, approvedIds), isApprovalSatisfied(match.profileTwoId, approvedIds),
        ])
        if (oneSat && twoSat) await transition(matchId, 'ACTIVATE')
      }
      const r = await createFromMatch(matchId)
      if (r.ok && r.room) {
        roomIds.room_c_couple_couple_active = r.room.id
        for (const uid of [...(c1.memberUserIds || []), ...(c2.memberUserIds || [])]) {
          await acceptRuleSet(r.room.id, uid)
        }
      }
    })
  }

  if (matchIds.match_paused) {
    const r = await createFromMatch(matchIds.match_paused)
    if (r.ok && r.room) {
      const alex = individuals['individual_alex']?.userId
      const rui = individuals['individual_rui']?.userId
      if (alex) await acceptRuleSet(r.room.id, alex)
      if (rui) await acceptRuleSet(r.room.id, rui)
      await transitionRoom(r.room.id, 'PAUSE')
      roomIds.room_d_paused = r.room.id
    }
  }

  if (matchIds.match_ended) {
    const r = await createFromMatch(matchIds.match_ended)
    if (r.ok && r.room) {
      const rui = individuals['individual_rui']?.userId
      const diogo = individuals['individual_diogo']?.userId
      if (rui) await acceptRuleSet(r.room.id, rui)
      if (diogo) await acceptRuleSet(r.room.id, diogo)
      await transitionRoom(r.room.id, 'CLOSE')
      roomIds.room_e_closed = r.room.id
    }
  }

  if (matchIds.match_blocked) {
    const r = await createFromMatch(matchIds.match_blocked)
    if (r.ok && r.room) {
      const alex = individuals['individual_alex']?.userId
      const ines = individuals['individual_ines']?.userId
      if (alex) await acceptRuleSet(r.room.id, alex)
      if (ines) await acceptRuleSet(r.room.id, ines)
      roomIds.room_f_safety_locked = r.room.id
      await blockProfile(individuals['individual_alex']?.profileId!, individuals['individual_ines']?.profileId!)
    }
  }

  if (matchIds.match_group_individual_active && group) {
    const r = await createFromMatch(matchIds.match_group_individual_active)
    if (r.ok && r.room) {
      roomIds.room_g_group_individual_active = r.room.id
      const miguel = individuals['individual_miguel']?.userId
      for (const uid of group.memberUserIds) await acceptRuleSet(r.room.id, uid)
      if (miguel) await acceptRuleSet(r.room.id, miguel)
      if (miguel && group.memberUserIds[0]) await seedMessages(r.room.id, group.memberUserIds[0], miguel)
    }
  }

  console.log(`  Private Rooms: ${Object.keys(roomIds).length}`)
  return roomIds
}
