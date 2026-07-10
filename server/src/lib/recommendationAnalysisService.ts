// 11.11/11.12/11.13 — RecommendationAnalysisService: shadow-mode analysis
// (rank correlation, click/like projection, top-10 comparison, Meaningful
// Connection Rate by cohort) and A/B guardrail metrics.
//
// 11.13 — NORTH STAR NOTE: Meaningful Connection Rate (meaningfulConnectionService.ts)
// is the PRIMARY metric everything here optimizes toward. session length,
// swipe count, and profiles-viewed are deliberately NOT computed by this
// service at all — not folded in as a secondary score, not exposed as a
// "growth" metric anywhere in this file. If a future engineer is tempted
// to add one here as a proxy for "engagement", re-read 11.13 first: those
// numbers are, at most, diagnostics reported alongside the real metrics,
// never a target to optimize.
import prisma from './prisma'
import { computeMeaningfulConnectionRate, type MeaningfulConnectionRate } from './meaningfulConnectionService'
import { assignCohort, type RecommendationCohort, EXPERIMENT_KEY } from './recommendationAbTestService'

// ── Sample-size guard (11.5.7) ──────────────────────────────────────────────
// Below this many data points, we do not let any metric here produce a
// confident-sounding claim (a correlation, a rate comparison, a disable
// recommendation). Configurable via env so ops can tune the bar without a
// code change, same pattern as SAFETY_ALERT_OVERDUE_HOURS elsewhere in this
// codebase. Deliberately ONE shared threshold across correlation/like-rate/
// guardrails/MCR-by-cohort rather than four separate knobs — keeps the
// admin UI's "is this reliable yet?" question answerable with one number.
export const RECOMMENDATION_MIN_SAMPLE_SIZE = Number(process.env.RECOMMENDATION_MIN_SAMPLE_SIZE || 30)

export const isSampleSufficient = (n: number): boolean => n >= RECOMMENDATION_MIN_SAMPLE_SIZE

// ── Rank correlation (11.11) ────────────────────────────────────────────────
// Spearman rank correlation between currentRank and recommendationRank
// across logged pairs — a value near +1 means the ranker mostly agrees
// with the current order (low-risk change), near 0 means it reorders
// substantially, negative would mean it's systematically inverting the
// current order (a red flag worth investigating before ever enabling V1).
const spearman = (pairs: Array<{ a: number; b: number }>): number | null => {
  const n = pairs.length
  if (n < 2) return null
  const dSquaredSum = pairs.reduce((sum, p) => sum + Math.pow(p.a - p.b, 2), 0)
  return 1 - (6 * dSquaredSum) / (n * (n * n - 1))
}

export interface RankCorrelationResult {
  correlation: number | null
  sampleSize: number
  dataSufficient: boolean
}

export const computeRankCorrelation = async (
  algorithmVersion: string, since: Date, includeTestData = false
): Promise<RankCorrelationResult> => {
  const rows = await (prisma as any).recommendationRankingLog.findMany({
    where: { algorithmVersion, createdAt: { gte: since }, ...(includeTestData ? {} : { isTestData: false }) },
    select: { currentRank: true, recommendationRank: true }
  })
  const sampleSize = rows.length
  return {
    correlation: spearman(rows.map((r: any) => ({ a: r.currentRank, b: r.recommendationRank }))),
    sampleSize,
    dataSufficient: isSampleSufficient(sampleSize),
  }
}

// ── Click/like projection (11.11) ───────────────────────────────────────────
// A simple, honest lift metric: among logged (viewer, candidate) pairs,
// what fraction of the candidates the CURRENT ranking put in its top 10
// were later liked by that viewer, vs. what fraction of the candidates
// the RECOMMENDATION ranking put in its top 10 were liked? This is a
// projection (correlational, not causal — shadow mode never changes what
// the viewer actually saw), useful only as a directional signal before
// ever running the real A/B test.
export const estimateTopNLikeRate = async (algorithmVersion: string, since: Date, topN = 10, includeTestData = false) => {
  const rows = await (prisma as any).recommendationRankingLog.findMany({
    where: { algorithmVersion, createdAt: { gte: since }, ...(includeTestData ? {} : { isTestData: false }) },
    select: { viewerProfileId: true, candidateProfileId: true, currentRank: true, recommendationRank: true }
  })
  if (rows.length === 0) return { currentTopNLikeRate: null, recommendationTopNLikeRate: null, sampleSize: 0, dataSufficient: false }

  const currentTopN = rows.filter((r: any) => r.currentRank <= topN)
  const recommendationTopN = rows.filter((r: any) => r.recommendationRank <= topN)

  const likeRateFor = async (subset: any[]) => {
    if (subset.length === 0) return null
    const likes = await prisma.profileAction.findMany({
      where: {
        action: 'LIKE',
        OR: subset.map(r => ({ actorProfileId: r.viewerProfileId, targetProfileId: r.candidateProfileId }))
      },
      select: { actorProfileId: true, targetProfileId: true }
    })
    const likedSet = new Set(likes.map((l: any) => `${l.actorProfileId}:${l.targetProfileId}`))
    const likedCount = subset.filter(r => likedSet.has(`${r.viewerProfileId}:${r.candidateProfileId}`)).length
    return likedCount / subset.length
  }

  const [currentTopNLikeRate, recommendationTopNLikeRate] = await Promise.all([
    likeRateFor(currentTopN), likeRateFor(recommendationTopN)
  ])

  return { currentTopNLikeRate, recommendationTopNLikeRate, sampleSize: rows.length, dataSufficient: isSampleSufficient(rows.length) }
}

// ── Current top-10 vs recommended top-10 (11.11) ────────────────────────────
export const compareTopN = async (viewerProfileId: string, algorithmVersion: string, n = 10) => {
  const rows = await (prisma as any).recommendationRankingLog.findMany({
    where: { viewerProfileId, algorithmVersion },
    orderBy: { createdAt: 'desc' },
    take: 200, // bounded — most recent shadow computation for this viewer
  })
  const currentTop = [...rows].sort((a: any, b: any) => a.currentRank - b.currentRank).slice(0, n).map((r: any) => r.candidateProfileId)
  const recommendationTop = [...rows].sort((a: any, b: any) => a.recommendationRank - b.recommendationRank).slice(0, n).map((r: any) => r.candidateProfileId)
  return { currentTop, recommendationTop }
}

// ── Meaningful Connection Rate by ranking cohort (11.11/11.12) ─────────────
// Cohort here reuses the SAME deterministic assignCohort as the live A/B
// split (11.12) — this is deliberate: shadow-mode analysis should measure
// "what would happen to the actual cohorts" before those cohorts ever see
// a different ranking, not some other ad-hoc grouping.
export interface MeaningfulConnectionRateWithSample extends MeaningfulConnectionRate {
  dataSufficient: boolean
}

export const computeMeaningfulConnectionRateByCohort = async (
  since: Date,
  experimentKey: string = EXPERIMENT_KEY,
  includeTestData = false
): Promise<Record<RecommendationCohort, MeaningfulConnectionRateWithSample>> => {
  const matches = await prisma.match.findMany({
    where: {
      createdAt: { gte: since },
      ...(includeTestData ? {} : {
        profileOne: { user: { isTestAccount: false } },
        profileTwo: { user: { isTestAccount: false } },
      }),
    },
    select: { id: true, profileOneId: true }
  })

  const byCohort: Record<RecommendationCohort, string[]> = { CONTROL: [], RECOMMENDATION_V1: [] }
  for (const m of matches) {
    const cohort = assignCohort(m.profileOneId, experimentKey)
    byCohort[cohort].push(m.id)
  }

  const [control, v1] = await Promise.all([
    computeMeaningfulConnectionRate(byCohort.CONTROL),
    computeMeaningfulConnectionRate(byCohort.RECOMMENDATION_V1),
  ])
  return {
    CONTROL: { ...control, dataSufficient: isSampleSufficient(control.totalCount) },
    RECOMMENDATION_V1: { ...v1, dataSufficient: isSampleSufficient(v1.totalCount) },
  }
}

// ── A/B guardrails (11.12) ──────────────────────────────────────────────────
// "Métricas guardrail: block rate, report rate, Safe Exit rate, match
// abandonment." Computed per cohort so an admin can see whether
// RECOMMENDATION_V1 is measurably worse than CONTROL on safety, not just
// better on engagement. This function only COMPUTES and RECOMMENDS — it
// never flips INTELLIGENT_RECOMMENDATIONS_ENABLED itself; a human admin
// reads `recommendation` and acts on it via the flag (the actual kill
// switch), per the spec's "se guardrails piorarem: desativar teste" being
// an operating procedure, not an automated action this sprint builds.
export interface GuardrailMetrics {
  cohort: RecommendationCohort
  profileCount: number
  blockRate: number | null
  reportRate: number | null
  safeExitRate: number | null
  matchAbandonmentRate: number | null
}

const rateOrNull = (count: number, denom: number): number | null => (denom > 0 ? count / denom : null)

const computeGuardrailsForCohort = async (
  cohort: RecommendationCohort, since: Date, experimentKey: string, includeTestData = false
): Promise<GuardrailMetrics> => {
  // Bounded scan of recently-active profiles, then filtered in-memory by
  // deterministic cohort assignment — acceptable at this sprint's scale;
  // flagged as a follow-up to move server-side if the active profile
  // count grows large enough for this to matter (same "revisit if it
  // becomes the bottleneck" spirit as discoveryService's POOL_CAP note).
  const activeProfiles = await prisma.profile.findMany({
    where: {
      status: 'APPROVED', updatedAt: { gte: since },
      ...(includeTestData ? {} : { user: { isTestAccount: false } }),
    },
    select: { id: true }
  })
  const cohortProfileIds = activeProfiles.map((p: any) => p.id).filter((id: string) => assignCohort(id, experimentKey) === cohort)
  const profileCount = cohortProfileIds.length
  if (profileCount === 0) {
    return { cohort, profileCount: 0, blockRate: null, reportRate: null, safeExitRate: null, matchAbandonmentRate: null }
  }

  const signalTestFilter = includeTestData ? {} : { isTestData: false }
  const [blockSignals, reportSignals, safeExitSignals, totalMatches, abandonedMatches] = await Promise.all([
    (prisma as any).recommendationSignal.count({ where: { signalType: 'BLOCK', actorProfileId: { in: cohortProfileIds }, createdAt: { gte: since }, ...signalTestFilter } }),
    (prisma as any).recommendationSignal.count({ where: { signalType: 'REPORT', actorProfileId: { in: cohortProfileIds }, createdAt: { gte: since }, ...signalTestFilter } }),
    (prisma as any).recommendationSignal.count({ where: { signalType: 'SAFE_EXIT', actorProfileId: { in: cohortProfileIds }, createdAt: { gte: since }, ...signalTestFilter } }),
    prisma.match.count({ where: { OR: [{ profileOneId: { in: cohortProfileIds } }, { profileTwoId: { in: cohortProfileIds } }], createdAt: { gte: since } } }),
    // Pre-existing bug: 'REJECTED' was never a valid MatchStatus value
    // (schema.prisma's enum: PENDING, PENDING_COUPLE_APPROVAL, ACTIVE,
    // PAUSED, ENDED, BLOCKED). matchStateMachine.ts's REJECT event
    // transitions PENDING_COUPLE_APPROVAL -> ENDED (a distinct
    // MATCH_REJECTED domain event fires for notification copy, but the
    // DB status itself is just ENDED, same as any other abandoned
    // match) -- so a rejected match is already fully captured by
    // status: 'ENDED' alone. Masked until now by other compile errors
    // failing these same 22 suites first.
    prisma.match.count({ where: { OR: [{ profileOneId: { in: cohortProfileIds } }, { profileTwoId: { in: cohortProfileIds } }], createdAt: { gte: since }, status: 'ENDED' } }),
  ])

  return {
    cohort,
    profileCount,
    blockRate: rateOrNull(blockSignals, profileCount),
    reportRate: rateOrNull(reportSignals, profileCount),
    safeExitRate: rateOrNull(safeExitSignals, profileCount),
    matchAbandonmentRate: rateOrNull(abandonedMatches, totalMatches),
  }
}

export interface GuardrailComparison {
  control: GuardrailMetrics
  recommendationV1: GuardrailMetrics
  // 11.5.7 — sample-size guard: both cohorts must clear
  // RECOMMENDATION_MIN_SAMPLE_SIZE before this comparison is treated as
  // reliable. Below that, we still COMPUTE concerns (useful as an early
  // diagnostic in logs/dashboards) but recommendDisable is forced false —
  // "evitar decisões baseadas em 3 ou 4 eventos" is a hard rule, not a
  // suggestion, so it lives here rather than trusting every caller to
  // remember to check dataSufficient before acting on recommendDisable.
  dataSufficient: boolean
  reason: 'INSUFFICIENT_SAMPLE' | null
  sample: { control: number; recommendation: number }
  // true when any V1 guardrail is meaningfully worse (>20% relative
  // increase) than its CONTROL counterpart AND both cohorts have enough
  // data to trust that comparison — a recommendation to disable the test
  // via INTELLIGENT_RECOMMENDATIONS_ENABLED, not an automatic action.
  recommendDisable: boolean
  concerns: string[]
}

const REGRESSION_THRESHOLD = 1.2 // 20% relative increase

export const computeGuardrailComparison = async (
  since: Date, experimentKey: string = EXPERIMENT_KEY, includeTestData = false
): Promise<GuardrailComparison> => {
  const [control, recommendationV1] = await Promise.all([
    computeGuardrailsForCohort('CONTROL', since, experimentKey, includeTestData),
    computeGuardrailsForCohort('RECOMMENDATION_V1', since, experimentKey, includeTestData),
  ])

  const dataSufficient = isSampleSufficient(control.profileCount) && isSampleSufficient(recommendationV1.profileCount)

  const concerns: string[] = []
  const checks: Array<[keyof GuardrailMetrics, string]> = [
    ['blockRate', 'Taxa de bloqueios'], ['reportRate', 'Taxa de denúncias'],
    ['safeExitRate', 'Taxa de Safe Exit'], ['matchAbandonmentRate', 'Taxa de abandono de match'],
  ]
  for (const [key, label] of checks) {
    const c = control[key] as number | null
    const v = recommendationV1[key] as number | null
    if (c != null && v != null && c > 0 && v > c * REGRESSION_THRESHOLD) {
      concerns.push(`${label} subiu mais de 20% no cohort RECOMMENDATION_V1 (${(v * 100).toFixed(1)}% vs ${(c * 100).toFixed(1)}%).`)
    }
  }

  return {
    control, recommendationV1,
    dataSufficient,
    reason: dataSufficient ? null : 'INSUFFICIENT_SAMPLE',
    sample: { control: control.profileCount, recommendation: recommendationV1.profileCount },
    recommendDisable: dataSufficient && concerns.length > 0,
    concerns,
  }
}
