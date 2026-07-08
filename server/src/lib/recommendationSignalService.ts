// 11.1/11.2/11.7 — RecommendationSignalService: capture + aggregation of
// behavioral signals. This is the ONLY place RecommendationSignal rows are
// written — every route that fires a signal (discovery like/pass/block,
// reports.ts, matchService, rooms.ts leave, photos.ts access grant,
// matches.ts message send) calls one of the narrow `record*` functions
// below, never prisma.recommendationSignal.create directly, so the
// metadata shape stays enforced in one place (11.1: "não registar body de
// mensagens").
import prisma from './prisma'
import { getWeightFor } from './recommendationSignalWeightConfigService'

export type RecommendationSignalTypeValue =
  | 'PROFILE_VIEW' | 'LIKE' | 'MAYBE' | 'PASS' | 'MATCH'
  | 'CONVERSATION_STARTED' | 'SUSTAINED_CONVERSATION' | 'PHOTO_ACCESS_GRANTED'
  | 'SAFE_EXIT' | 'BLOCK' | 'REPORT'

// Narrow, whitelisted metadata shapes only — a caller cannot pass an
// arbitrary object (no message body, no photo bytes, no boundary/interest
// selections). Every field here is a small count/id, nothing else.
interface SignalMetadata {
  distinctDayCount?: number
  conversationId?: string
  roomId?: string
  photoId?: string
}

export const recordSignal = async (
  actorProfileId: string,
  targetProfileId: string,
  signalType: RecommendationSignalTypeValue,
  metadata?: SignalMetadata
): Promise<void> => {
  if (actorProfileId === targetProfileId) return // never signal about oneself
  try {
    const weight = await getWeightFor(signalType)
    await (prisma as any).recommendationSignal.create({
      data: { actorProfileId, targetProfileId, signalType, weight, metadata: metadata || undefined }
    })
  } catch (err: any) {
    // Best-effort by design — a failed signal write must never break the
    // action that triggered it (a like/message/report always succeeds on
    // its own merits regardless of this side channel).
    console.error('[RECOMMENDATION SIGNAL]', err.message)
  }
}

// 11.5.6 — deduplication policy for high-frequency, low-intent signals.
// "GET /profiles/:id chamado 5 vezes pelo frontend não deve necessariamente
// criar 5 PROFILE_VIEW relevantes" — policy: at most one PROFILE_VIEW
// signal per (actor, target) pair per calendar day (UTC). Implemented as a
// createdAt range check rather than a metadata-JSON-path match (simpler,
// works identically across DB backends, and this signal never needs
// per-view metadata beyond identifying "did this pair already view today").
const startOfUtcDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

export const recordProfileViewSignal = async (actorProfileId: string, targetProfileId: string): Promise<void> => {
  if (actorProfileId === targetProfileId) return
  try {
    const todayStart = startOfUtcDay(new Date())
    const already = await (prisma as any).recommendationSignal.findFirst({
      where: {
        actorProfileId, targetProfileId, signalType: 'PROFILE_VIEW',
        createdAt: { gte: todayStart }
      },
      select: { id: true }
    })
    if (already) return
    await recordSignal(actorProfileId, targetProfileId, 'PROFILE_VIEW')
  } catch (err: any) {
    console.error('[RECOMMENDATION SIGNAL] PROFILE_VIEW dedup check failed:', err.message)
  }
}

// 11.1 — SUSTAINED_CONVERSATION is computed from metadata, never inferred
// from message content: "conversation on at least 3 distinct days".
// Idempotent per conversation — only ever recorded once per conversation
// per direction (checked via metadata.conversationId before writing), so
// a conversation crossing its 4th, 5th, ... distinct day does not keep
// re-firing the signal.
const SUSTAINED_CONVERSATION_MIN_DAYS = 3

export const evaluateSustainedConversation = async (conversationId: string): Promise<void> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { match: true, messages: { select: { createdAt: true }, where: { deletedAt: null } } }
  })
  if (!conversation?.match) return

  const distinctDays = new Set(conversation.messages.map((m: any) => m.createdAt.toISOString().slice(0, 10)))
  if (distinctDays.size < SUSTAINED_CONVERSATION_MIN_DAYS) return

  const already = await (prisma as any).recommendationSignal.findFirst({
    where: {
      signalType: 'SUSTAINED_CONVERSATION',
      metadata: { path: ['conversationId'], equals: conversationId }
    }
  })
  if (already) return

  const { profileOneId, profileTwoId } = conversation.match
  await Promise.all([
    recordSignal(profileOneId, profileTwoId, 'SUSTAINED_CONVERSATION', { conversationId, distinctDayCount: distinctDays.size }),
    recordSignal(profileTwoId, profileOneId, 'SUSTAINED_CONVERSATION', { conversationId, distinctDayCount: distinctDays.size }),
  ])
}

// CONVERSATION_STARTED — fired once, the first time a SECOND distinct
// sender posts in a conversation (i.e. it became a real back-and-forth,
// not just one side sending into silence). Cheap to check: at most one
// query, no stored "already fired" flag needed beyond counting distinct
// senders so far.
export const evaluateConversationStarted = async (conversationId: string): Promise<void> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { match: true, messages: { select: { senderUserId: true }, where: { deletedAt: null } } }
  })
  if (!conversation?.match) return

  const distinctSenders = new Set(conversation.messages.map((m: any) => m.senderUserId))
  if (distinctSenders.size !== 2) return // fires exactly once, the message that completes the pair

  const already = await (prisma as any).recommendationSignal.findFirst({
    where: {
      signalType: 'CONVERSATION_STARTED',
      metadata: { path: ['conversationId'], equals: conversationId }
    }
  })
  if (already) return

  const { profileOneId, profileTwoId } = conversation.match
  await Promise.all([
    recordSignal(profileOneId, profileTwoId, 'CONVERSATION_STARTED', { conversationId }),
    recordSignal(profileTwoId, profileOneId, 'CONVERSATION_STARTED', { conversationId }),
  ])
}

// ─── Aggregation (11.7 — "não usar popularidade pura") ─────────────────────
// GLOBAL_AGGREGATE_TYPES deliberately excludes PASS and PROFILE_VIEW:
//  - PASS: a passed profile is ALREADY excluded from that specific
//    viewer's future discovery pool (discoveryService's excludeIds) —
//    that's a hard, per-viewer exclusion, not a ranking signal. Folding
//    PASS into a candidate's GLOBAL aggregate would mean one popular
//    profile's many incidental passes (people just not interested for
//    reasons unrelated to quality) drag down how they rank for everyone
//    else — exactly the "não punir globalmente por um único PASS" the
//    spec warns against, generalized to "at all".
//  - PROFILE_VIEW: highest-volume, lowest-intent signal by construction.
//    Including it in the global aggregate would let raw view COUNT
//    dominate — i.e. reintroduce popularity-by-exposure, the opposite of
//    11.7's instruction. It is still recorded (useful for future
//    diagnostics) but never aggregated here.
const GLOBAL_AGGREGATE_TYPES: RecommendationSignalTypeValue[] = [
  'LIKE', 'MAYBE', 'MATCH', 'CONVERSATION_STARTED', 'SUSTAINED_CONVERSATION',
  'PHOTO_ACCESS_GRANTED', 'SAFE_EXIT', 'BLOCK', 'REPORT',
]

// Bayesian shrinkage toward a neutral prior (0) — PRIOR_COUNT virtual
// neutral samples mean a profile with few real signals stays close to 0
// (cold start, 11.7) and a profile with a single strongly negative signal
// (e.g. one REPORT, weight -15) is damped to roughly -15/(1+PRIOR_COUNT)
// rather than swinging the full -15, while a profile with a consistent
// pattern across many signals converges toward its true average. This is
// the mechanism, not just PASS-exclusion, that satisfies "não punir um
// perfil globalmente por um único [signal]" for every signal type.
const PRIOR_COUNT = 5

export interface SignalQuality {
  score: number       // shrunk average weight, roughly in [-15, 15] in practice
  sampleCount: number // count of GLOBAL_AGGREGATE_TYPES signals received
  isColdStart: boolean
}

export const getAggregatedSignalQuality = async (profileId: string): Promise<SignalQuality> => {
  const rows = await (prisma as any).recommendationSignal.findMany({
    where: { targetProfileId: profileId, signalType: { in: GLOBAL_AGGREGATE_TYPES } },
    select: { weight: true }
  })
  const sampleCount = rows.length
  if (sampleCount === 0) return { score: 0, sampleCount: 0, isColdStart: true }

  const sum = rows.reduce((s: number, r: any) => s + r.weight, 0)
  const shrunk = sum / (sampleCount + PRIOR_COUNT)
  return { score: shrunk, sampleCount, isColdStart: false }
}

// Pair-level history — used for "have I already interacted with this
// exact candidate" context, never for a candidate's global standing.
// PASS/BLOCK pairs never reach here in practice (already excluded from
// the eligible pool by discoveryService before the ranker runs), so this
// mainly surfaces prior LIKE/MAYBE/PROFILE_VIEW from the current viewer.
export const getPairSignalHistory = async (
  actorProfileId: string,
  targetProfileId: string
): Promise<{ signalType: RecommendationSignalTypeValue; createdAt: Date }[]> =>
  (prisma as any).recommendationSignal.findMany({
    where: { actorProfileId, targetProfileId },
    select: { signalType: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

// 11.6/11.14 — GDPR sweep: RecommendationSignal has no FK/cascade (see
// schema.prisma header comment), so hardDeleteJob.ts calls this explicitly
// before deleting a User, mirroring how it already handles RoomMessage
// (also no-cascade).
export const deleteAllSignalsForProfile = async (profileId: string): Promise<number> => {
  const result = await (prisma as any).recommendationSignal.deleteMany({
    where: { OR: [{ actorProfileId: profileId }, { targetProfileId: profileId }] }
  })
  return result.count
}
