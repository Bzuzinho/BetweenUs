// 11.5/11.12 — RecommendationOrchestrator: the single call site
// discovery.ts uses. Nothing else in the codebase should call
// heuristicRecommendationRanker directly — this is where the two flags
// (shadow mode / enabled) and the cohort decision actually take effect.
//
// Contract with discoveryService.getCandidates(): this function receives
// ONLY the DiscoveryCandidateItem[] that function already produced, and
// can only REORDER that exact array + attach reasonCodes/microcopy to
// items already in it — never add, never drop. That is what makes the
// absolute rule hold at the one place a profile could otherwise sneak
// into a response.
import type { DiscoveryCandidateItem } from './discoveryService'
import { createHeuristicRanker } from './heuristicRecommendationRanker'
import type { PinnedFilters } from './recommendationDiversityService'
import { explainRecommendationReasons } from './recommendationExplanationService'
import { isShadowModeEnabled, isIntelligentRecommendationsEnabled, effectiveCohort } from './recommendationAbTestService'
import prisma from './prisma'

export interface ApplyRecommendationsResult {
  items: DiscoveryCandidateItem[]
  cohort: 'CONTROL' | 'RECOMMENDATION_V1'
  recommendationApplied: boolean
}

// Best-effort, fire-and-forget — a logging failure must never affect the
// response served to the client (same discipline as
// runModerationAssessment in reports.ts).
const logShadowRanking = async (
  viewerProfileId: string,
  current: DiscoveryCandidateItem[],
  recommended: Awaited<ReturnType<ReturnType<typeof createHeuristicRanker>['rank']>>,
  modelVersion: string
): Promise<void> => {
  try {
    const currentScoreByProfileId = new Map(current.map(c => [c.profile.id, c.betweenScore]))

    // BETA.1 — same OR-of-both-sides isTestData semantics as
    // recommendationSignalService.recordSignal: the whole batch shares one
    // viewer, so the viewer's isTestAccount is resolved once; each
    // candidate is checked individually (a real viewer browsing past a
    // handful of seeded test profiles should not have their genuine
    // shadow-ranking rows for the OTHER, real candidates marked as test
    // data too).
    const viewerProfile = await prisma.profile.findUnique({
      where: { id: viewerProfileId }, select: { user: { select: { isTestAccount: true } } }
    })
    const viewerIsTest = !!viewerProfile?.user?.isTestAccount
    const candidateIds = [...new Set(recommended.map(r => r.candidateProfileId))]
    const testCandidateProfiles = viewerIsTest ? [] : await prisma.profile.findMany({
      where: { id: { in: candidateIds }, user: { isTestAccount: true } },
      select: { id: true }
    })
    const testCandidateIds = new Set(testCandidateProfiles.map((p: { id: string }) => p.id))

    const rows = recommended.map(r => ({
      viewerProfileId,
      candidateProfileId: r.candidateProfileId,
      currentRank: r.currentRank,
      recommendationRank: r.recommendationRank,
      currentScore: currentScoreByProfileId.get(r.candidateProfileId) ?? 0,
      recommendationScore: r.recommendationScore,
      algorithmVersion: modelVersion,
      reasonCodes: r.reasonCodes,
      isExploration: r.isExploration,
      isTestData: viewerIsTest || testCandidateIds.has(r.candidateProfileId),
    }))
    if (rows.length === 0) return
    await (prisma as any).recommendationRankingLog.createMany({ data: rows })
  } catch (err: any) {
    console.error('[RECOMMENDATION SHADOW LOG]', err.message)
  }
}

export const applyRecommendations = async (
  viewerProfileId: string,
  items: DiscoveryCandidateItem[],
  pinnedFilters: PinnedFilters = {}
): Promise<ApplyRecommendationsResult> => {
  const shadow = isShadowModeEnabled()
  const enabled = isIntelligentRecommendationsEnabled()

  if (!shadow && !enabled) {
    return { items, cohort: 'CONTROL', recommendationApplied: false }
  }

  const cohort = effectiveCohort(viewerProfileId)

  // 11.5.5 — "falha do ranker não quebra discovery": everything from here
  // down is experimental (Layer 3) and sits on top of the already-valid
  // `items` Layers 1+2 produced. A bug anywhere in ranking/diversity/
  // exploration must degrade to "serve the current ranking untouched",
  // never bubble up as a 500 to the Discovery endpoint — this is the same
  // fail-open discipline logShadowRanking already applies to the logging
  // side, extended to cover the ranking computation itself.
  try {
    const ranker = createHeuristicRanker({ pinnedFilters })
    const ranked = await ranker.rank(viewerProfileId, items, { source: 'DISCOVERY_FEED' })

    // Shadow logging happens whenever either flag is on — once V1 is truly
    // serving a cohort, this table is also how 11.11's shadow-analysis
    // metrics keep being computed going forward, not just during the
    // observe-only period. Already independently fail-safe (try/catch
    // inside logShadowRanking + a .catch() here as a second layer).
    logShadowRanking(viewerProfileId, items, ranked, ranker.modelVersion).catch(() => {})

    // Shadow mode alone (not yet enabled): compute + log, but the response
    // is untouched — this is the entire point of shadow mode (11.5:
    // "Discovery continua a usar ranking atual").
    if (!enabled || cohort === 'CONTROL') {
      return { items, cohort, recommendationApplied: false }
    }

    // RECOMMENDATION_V1 cohort with the experiment enabled: actually
    // reorder. `ranked` only ever references candidateProfileId values that
    // came from `items` in the first place (see heuristicRecommendationRanker
    // — it maps eligibleCandidates 1:1, never invents an id), so this lookup
    // can never resolve to something outside the original eligible set.
    const byProfileId = new Map(items.map(i => [i.profile.id, i]))
    const reordered: DiscoveryCandidateItem[] = ranked
      .map(r => {
        const original = byProfileId.get(r.candidateProfileId)
        if (!original) return null // defensive; structurally unreachable
        return {
          ...original,
          betweenScore: original.betweenScore, // Between Score itself never changes — only order/reasons do
          reasons: explainRecommendationReasons(r.reasonCodes),
        }
      })
      .filter((x): x is DiscoveryCandidateItem => x !== null)

    return { items: reordered, cohort, recommendationApplied: true }
  } catch (err: any) {
    console.error('[RECOMMENDATION RANKER] falling back to current ranking:', err.message)
    return { items, cohort: 'CONTROL', recommendationApplied: false }
  }
}
