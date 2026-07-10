// 11.3 — MeaningfulConnectionService: a product QUALITY metric, explicitly
// not "successful relationship" (the spec is emphatic about this — it is a
// proxy for connection quality, nothing more). This is the PRIMARY metric
// the rest of Sprint 11 optimizes toward (11.12/11.13) — never session
// length, swipe count, or profiles-viewed. Those remain available as
// diagnostics elsewhere (e.g. RecommendationSignal counts) but are never
// treated as a North Star here.
//
// Definition (spec, verbatim): Match ACTIVE + conversa mútua (both sides
// sent >=1 message) + atividade em pelo menos 3 dias distintos + sem
// block + sem report.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'

export interface MeaningfulConnectionResult {
  matchId: string
  isMeaningful: boolean
  mutualConversation: boolean
  distinctActiveDays: number
  wasBlocked: boolean
  wasReported: boolean
}

const MIN_DISTINCT_DAYS = 3

// "sem block" — either profile blocking the other, at any point, taints
// the connection (block is definitionally the opposite of a meaningful
// connection). Checked via ProfileAction, the same table
// discoveryService/blockService already use — not a new signal.
const wasEverBlocked = async (profileOneId: string, profileTwoId: string): Promise<boolean> => {
  const count = await prisma.profileAction.count({
    where: {
      action: 'BLOCK',
      OR: [
        { actorProfileId: profileOneId, targetProfileId: profileTwoId },
        { actorProfileId: profileTwoId, targetProfileId: profileOneId },
      ]
    }
  })
  return count > 0
}

// "sem report" — a report from either user's account against the other,
// in either direction. Uses Report.reporterUserId/reportedUserId (user-
// level, since Report is anchored to User not Profile) — resolved from
// EVERY active member of each side, not a single profile.userId. A
// Shared Profile (COUPLE/GROUP) has userId=null post-FASE-C (see
// schema.prisma's Profile.userId comment) and can itself be a match
// participant (BETA.2 FASE E's COUPLE+COUPLE / GROUP+INDIVIDUAL
// scenarios) — passing a null userId straight into a required
// Report.reporterUserId filter throws a Prisma validation error
// ("Argument reporterUserId is missing"), caught live by the beta
// validator. Report is a report BY one person AGAINST another, so any
// member on either side counts.
const wasEverReported = async (userOneIds: string[], userTwoIds: string[]): Promise<boolean> => {
  if (userOneIds.length === 0 || userTwoIds.length === 0) return false
  const count = await prisma.report.count({
    where: {
      OR: [
        { reporterUserId: { in: userOneIds }, reportedUserId: { in: userTwoIds } },
        { reporterUserId: { in: userTwoIds }, reportedUserId: { in: userOneIds } },
      ]
    }
  })
  return count > 0
}

export const evaluateMeaningfulConnection = async (matchId: string): Promise<MeaningfulConnectionResult | null> => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      profileOne: { select: { id: true, userId: true } },
      profileTwo: { select: { id: true, userId: true } },
      conversation: { include: { messages: { where: { deletedAt: null }, select: { senderUserId: true, createdAt: true } } } }
    }
  })
  if (!match) return null

  // BETA.2 (FASE E hotfix #2) — resolve EVERY active member on each side,
  // not just profile.userId (null for a Shared Profile post-FASE-C, and a
  // Shared Profile can itself be a match participant since FASE E's
  // COUPLE+COUPLE / GROUP+INDIVIDUAL scenarios). Mirrors the same
  // getActiveMembers pattern already used by discoveryService/blockService
  // /consentPhasePolicy for exactly this reason.
  const [profileOneMemberIds, profileTwoMemberIds] = await Promise.all([
    getActiveMembers(match.profileOneId).then(ms => ms.map((m: any) => m.userId)),
    getActiveMembers(match.profileTwoId).then(ms => ms.map((m: any) => m.userId)),
  ])

  const base: Omit<MeaningfulConnectionResult, 'isMeaningful'> = {
    matchId,
    mutualConversation: false,
    distinctActiveDays: 0,
    wasBlocked: false,
    wasReported: false,
  }

  if (match.status !== 'ACTIVE' || !match.conversation) {
    return { ...base, isMeaningful: false }
  }

  const messages = match.conversation.messages
  const senderUserIds = new Set(messages.map((m: any) => m.senderUserId))
  // "both sides sent >=1 message" — ANY active member of each side, not
  // just a single userId (same Shared Profile reasoning as above: any
  // couple/group member can send from that shared context).
  const mutualConversation =
    profileOneMemberIds.some((id: string) => senderUserIds.has(id)) &&
    profileTwoMemberIds.some((id: string) => senderUserIds.has(id))
  const distinctActiveDays = new Set(messages.map((m: any) => m.createdAt.toISOString().slice(0, 10))).size

  const [wasBlocked, wasReported] = await Promise.all([
    wasEverBlocked(match.profileOneId, match.profileTwoId),
    wasEverReported(profileOneMemberIds, profileTwoMemberIds),
  ])

  const isMeaningful = mutualConversation && distinctActiveDays >= MIN_DISTINCT_DAYS && !wasBlocked && !wasReported

  return { matchId, isMeaningful, mutualConversation, distinctActiveDays, wasBlocked, wasReported }
}

export interface MeaningfulConnectionRate {
  meaningfulCount: number
  totalCount: number
  rate: number | null // null when totalCount is 0 — do not report a rate of 0% for "no data"
}

// Rate over a set of matches. `matchIds` lets callers scope this to a
// cohort (11.12) or a specific viewer's matches, without this service
// needing to know anything about experiments/cohorts itself.
export const computeMeaningfulConnectionRate = async (matchIds: string[]): Promise<MeaningfulConnectionRate> => {
  if (matchIds.length === 0) return { meaningfulCount: 0, totalCount: 0, rate: null }

  const results = await Promise.all(matchIds.map(evaluateMeaningfulConnection))
  const valid = results.filter((r): r is MeaningfulConnectionResult => r !== null)
  const meaningfulCount = valid.filter(r => r.isMeaningful).length

  return { meaningfulCount, totalCount: valid.length, rate: valid.length > 0 ? meaningfulCount / valid.length : null }
}

// Convenience: every match a profile is part of, ACTIVE or not (ACTIVE
// filtering happens inside evaluateMeaningfulConnection so a PENDING/
// ENDED/BLOCKED match correctly evaluates as not-meaningful rather than
// being silently skipped and inflating the rate).
export const computeMeaningfulConnectionRateForProfile = async (profileId: string): Promise<MeaningfulConnectionRate> => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ profileOneId: profileId }, { profileTwoId: profileId }] },
    select: { id: true }
  })
  return computeMeaningfulConnectionRate(matches.map((m: any) => m.id))
}

// BETA.1 — includeTestData defaults to false: a match where EITHER
// participant's owning User has isTestAccount=true is excluded from this
// real-metric read by default (Match itself has no isTestData column —
// unlike RecommendationSignal/RecommendationRankingLog, which are
// high-volume enough to warrant a denormalized flag written at capture
// time — so this filters live via the profile->user relation instead).
// Only the SUPER_ADMIN-gated admin route below passes includeTestData:true.
export const computeMeaningfulConnectionRateSince = async (
  since: Date,
  options: { includeTestData?: boolean } = {}
): Promise<MeaningfulConnectionRate> => {
  const matches = await prisma.match.findMany({
    where: {
      createdAt: { gte: since },
      ...(options.includeTestData ? {} : {
        profileOne: { user: { isTestAccount: false } },
        profileTwo: { user: { isTestAccount: false } },
      }),
    },
    select: { id: true }
  })
  return computeMeaningfulConnectionRate(matches.map((m: any) => m.id))
}
