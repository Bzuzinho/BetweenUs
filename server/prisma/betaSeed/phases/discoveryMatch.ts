// BETA.1.15/1.16 — Like/Pass/Match scenarios, all created through the
// real matchService (never a raw prisma.match.create with a hand-picked
// status — see matchStateMachine.ts's comment on why that discipline
// matters). Discovery/Between Score validation itself (running the real
// pipeline against these pairs) lives in validateBetaSeed.ts, not here —
// this phase only builds the underlying data the validator later checks.
import prisma from '../../../src/lib/prisma'
import { createLikeOrMatch, recordPass, transition, getRequiredApproverUserIds } from '../../../src/lib/matchService'
import { isApprovalSatisfied } from '../../../src/lib/approvalPolicyService'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

const approveAsUser = async (matchId: string, userId: string): Promise<boolean> => {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return false
  await prisma.coupleMatchApproval.upsert({
    where: { matchId_userId: { matchId, userId } },
    update: { approvedAt: new Date(), rejectedAt: null },
    create: { matchId, userId, approvedAt: new Date() },
  })
  const approvals = await prisma.coupleMatchApproval.findMany({ where: { matchId, approvedAt: { not: null } } })
  const approvedUserIds = new Set<string>(approvals.map((a: any) => a.userId))
  const [oneSatisfied, twoSatisfied] = await Promise.all([
    isApprovalSatisfied(match.profileOneId, approvedUserIds),
    isApprovalSatisfied(match.profileTwoId, approvedUserIds),
  ])
  if (oneSatisfied && twoSatisfied) {
    await transition(matchId, 'ACTIVATE')
    return true
  }
  return false
}

export const seedLikePassMatchScenarios = async (individuals: ProfileMap, couples: ProfileMap): Promise<Record<string, string>> => {
  const matchIds: Record<string, string> = {}
  const pid = (m: ProfileMap, key: string) => m[key]?.profileId

  // 1. One-sided LIKE — Tiago likes Marta, no reciprocity.
  await createLikeOrMatch(pid(individuals, 'individual_tiago'), pid(individuals, 'individual_marta'))

  // 2. Reciprocal LIKE -> ACTIVE MATCH (individual x individual).
  await createLikeOrMatch(pid(individuals, 'individual_marta'), pid(individuals, 'individual_joana'))
  const r2 = await createLikeOrMatch(pid(individuals, 'individual_joana'), pid(individuals, 'individual_marta'))
  if (r2.kind === 'MATCH_CREATED') matchIds['match_individual_active'] = r2.matchId

  // 3. PASS.
  await recordPass(pid(individuals, 'individual_rui'), pid(individuals, 'individual_noa'))

  // 4. Couple match PENDING_COUPLE_APPROVAL — no approvals yet.
  await createLikeOrMatch(pid(couples, 'couple_1_third_match'), pid(individuals, 'individual_marta'))
  const r4 = await createLikeOrMatch(pid(individuals, 'individual_marta'), pid(couples, 'couple_1_third_match'))
  if (r4.kind === 'MATCH_PENDING_COUPLE_APPROVAL') matchIds['match_couple_pending_none'] = r4.matchId

  // 5. Couple match — one approval pending (1 of 2 members approved).
  await createLikeOrMatch(pid(couples, 'couple_4_travel'), pid(individuals, 'individual_catarina'))
  const r5 = await createLikeOrMatch(pid(individuals, 'individual_catarina'), pid(couples, 'couple_4_travel'))
  if (r5.kind === 'MATCH_PENDING_COUPLE_APPROVAL') {
    matchIds['match_couple_pending_partial'] = r5.matchId
    const members = couples['couple_4_travel']?.memberUserIds || []
    if (members[0]) await approveAsUser(r5.matchId, members[0])
  }

  // 6. Couple match — ALL approved -> ACTIVE.
  await createLikeOrMatch(pid(couples, 'couple_1_third_match'), pid(individuals, 'individual_joana'))
  const r6 = await createLikeOrMatch(pid(individuals, 'individual_joana'), pid(couples, 'couple_1_third_match'))
  if (r6.kind === 'MATCH_PENDING_COUPLE_APPROVAL') {
    matchIds['match_couple_active'] = r6.matchId
    const members = couples['couple_1_third_match']?.memberUserIds || []
    for (const uid of members) await approveAsUser(r6.matchId, uid)
  } else if (r6.kind === 'ALREADY_MATCHED') {
    matchIds['match_couple_active'] = r6.matchId
  }

  // 7. ENDED MATCH — Rui x Diogo, active then ended.
  await createLikeOrMatch(pid(individuals, 'individual_rui'), pid(individuals, 'individual_diogo'))
  const r7 = await createLikeOrMatch(pid(individuals, 'individual_diogo'), pid(individuals, 'individual_rui'))
  if (r7.kind === 'MATCH_CREATED' || r7.kind === 'ALREADY_MATCHED') {
    matchIds['match_ended'] = r7.matchId
    await transition(r7.matchId, 'END')
  }

  // 8. BLOCKED MATCH — Alex x Ines. Left ACTIVE here deliberately: the
  // actual blockProfile() call happens in rooms.ts, AFTER Room F is
  // created from this same match, so one block action simultaneously
  // produces the BLOCKED match (this scenario) AND the SAFETY_LOCKED room
  // (Room F, BETA.1.18) — exactly what blockService.ts's shared-room
  // policy is meant to demonstrate together, not two disconnected fakes.
  await createLikeOrMatch(pid(individuals, 'individual_alex'), pid(individuals, 'individual_ines'))
  const r8 = await createLikeOrMatch(pid(individuals, 'individual_ines'), pid(individuals, 'individual_alex'))
  if (r8.kind === 'MATCH_CREATED' || r8.kind === 'ALREADY_MATCHED') {
    matchIds['match_blocked'] = r8.matchId
  }

  // 9. PAUSED MATCH — Alex x Rui, active then paused.
  await createLikeOrMatch(pid(individuals, 'individual_alex'), pid(individuals, 'individual_rui'))
  const r9 = await createLikeOrMatch(pid(individuals, 'individual_rui'), pid(individuals, 'individual_alex'))
  if (r9.kind === 'MATCH_CREATED' || r9.kind === 'ALREADY_MATCHED') {
    matchIds['match_paused'] = r9.matchId
    await transition(r9.matchId, 'PAUSE')
  }

  console.log(`  Like/Pass/Match scenarios: ${Object.keys(matchIds).length} matches + 1 like + 1 pass`)
  return matchIds
}

// BETA.1.15 — hard exclusions, built as data only (the validator runs the
// real DiscoveryService/BetweenScoreService against these pairs). Tiago
// (singles_only) vs Couple 1 is already a structural hard-boundary
// conflict from the manifest data itself — nothing extra to seed here.
// Contact-block pair: Diogo blocks Noa's email hash (BlockedContactHash),
// exercised the same way contacts.ts's import route would populate it.
export const seedContactBlockPair = async (individuals: ProfileMap): Promise<void> => {
  const { hashContact } = await import('../../../src/lib/contactHashService')
  const diogoUserId = individuals['individual_diogo']?.userId
  const noaEmail = 'beta.noa@betweenus.test'
  if (!diogoUserId) return
  const { hash, keyVersion } = hashContact(noaEmail)
  await (prisma as any).blockedContactHash.upsert({
    where: { userId_contactHash: { userId: diogoUserId, contactHash: hash } },
    update: {},
    create: { userId: diogoUserId, contactHash: hash, type: 'email', keyVersion },
  })
  console.log('  Contact block pair: 1 (Diogo bloqueia contacto de Noa)')
}
