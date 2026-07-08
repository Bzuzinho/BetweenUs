// 11.4/11.7/11.8/11.9 — HeuristicRecommendationRanker: the first
// RecommendationRanker implementation. Explicitly heuristic, no external
// ML — "não introduzir ML externo sem necessidade" (11.4) and no external
// call of any kind (11.6 — privacy: everything below runs against data
// already loaded from Postgres, nothing leaves the process).
//
// recommendationScore = betweenScore (Layer 2, the dominant term, 0-100)
//                      + signalAdjustment (bounded, damped — see
//                        recommendationSignalService.getAggregatedSignalQuality)
//                      + freshnessBonus (decaying, 0-5)
//                      + verificationBonus (0 or 3)
// then: diversity re-rank (11.9) -> exploration assignment (11.8).
//
// Cold start (11.7) is NOT a separate code path — a candidate with zero
// signals naturally gets signalAdjustment=0 from the same damped-average
// formula every candidate uses, so the ranking order for a signal-less
// candidate falls back to betweenScore -> freshness -> verification
// exactly as 11.7 specifies, without a branch that could drift out of
// sync with the "normal" path.
import type { DiscoveryCandidateItem } from './discoveryService'
import type { BetweenScoreReasonCode } from './betweenScoreService'
import type { RecommendationRanker, RecommendationContext, RankedRecommendation, RecommendationReasonCode } from './recommendationRanker'
import { getAggregatedSignalQuality } from './recommendationSignalService'
import { buildClusterKey, diversify, type PinnedFilters } from './recommendationDiversityService'
import { assignExploration } from './recommendationExplorationService'

export const HEURISTIC_MODEL_VERSION = 'RECOMMENDATION_HEURISTIC_V1'

const FRESHNESS_WINDOW_DAYS = 30
const FRESHNESS_MAX_BONUS = 5
const VERIFICATION_BONUS = 3
const HIGH_COMPATIBILITY_THRESHOLD = 80
const NEW_PROFILE_WINDOW_DAYS = 14
const NEW_PROFILE_MIN_SCORE = 60

const freshnessBonus = (createdAt: Date, now: Date): number => {
  const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays >= FRESHNESS_WINDOW_DAYS) return 0
  return FRESHNESS_MAX_BONUS * (1 - ageDays / FRESHNESS_WINDOW_DAYS)
}

const isVerified = (profile: any): boolean => profile.user?.verification?.status === 'APPROVED'

// BetweenScoreReasonCode -> RecommendationReasonCode. Three renamed 1:1,
// two derived from score/recency instead of BetweenScoreService at all.
const deriveReasonCodes = (
  betweenScore: number,
  betweenScoreReasonCodes: BetweenScoreReasonCode[],
  createdAt: Date,
  now: Date
): RecommendationReasonCode[] => {
  const codes: RecommendationReasonCode[] = []
  if (betweenScore >= HIGH_COMPATIBILITY_THRESHOLD) codes.push('HIGH_COMPATIBILITY')
  if (betweenScoreReasonCodes.includes('INTENTIONS_ALIGNED')) codes.push('SIMILAR_INTENTIONS')
  if (betweenScoreReasonCodes.includes('BOUNDARIES_ALIGNED')) codes.push('BOUNDARY_ALIGNMENT')
  if (betweenScoreReasonCodes.includes('SIMILAR_DISCRETION')) codes.push('SIMILAR_DISCRETION')
  if (betweenScoreReasonCodes.includes('TRAVEL_OVERLAP')) codes.push('TRAVEL_OVERLAP')

  const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays <= NEW_PROFILE_WINDOW_DAYS && betweenScore >= NEW_PROFILE_MIN_SCORE) codes.push('NEW_COMPATIBLE_PROFILE')

  return codes
}

export const createHeuristicRanker = (opts: { pinnedFilters?: PinnedFilters } = {}): RecommendationRanker => ({
  modelVersion: HEURISTIC_MODEL_VERSION,

  async rank(
    viewerProfileId: string,
    eligibleCandidates: DiscoveryCandidateItem[],
    context: RecommendationContext
  ): Promise<RankedRecommendation[]> {
    const now = context.requestedAt ?? new Date()

    // Base scores + signal adjustment, in original (Layer 1+2) order —
    // currentRank captured here, before anything is reordered.
    const withScores = await Promise.all(eligibleCandidates.map(async (item, index) => {
      const quality = await getAggregatedSignalQuality(item.profile.id)
      const score =
        item.betweenScore +
        quality.score +
        freshnessBonus(item.profile.createdAt, now) +
        (isVerified(item.profile) ? VERIFICATION_BONUS : 0)

      return {
        candidateProfileId: item.profile.id as string,
        score,
        currentRank: index + 1,
        clusterKey: buildClusterKey(item.profile, opts.pinnedFilters),
        reasonCodes: deriveReasonCodes(item.betweenScore, item.reasonCodes, item.profile.createdAt, now),
      }
    }))

    // Sort by adjusted score, stable tiebreak on original currentRank so
    // two equal scores don't reorder arbitrarily between requests.
    const sorted = [...withScores].sort((a, b) => b.score - a.score || a.currentRank - b.currentRank)

    // 11.9 — diversity re-rank (reorders only, never drops/adds).
    const diversified = diversify(sorted, { maxConsecutiveSameCluster: 2, lookahead: 5 })

    // 11.8 — exploration assignment (bounded nudge, reorders only).
    const explored = assignExploration(diversified, viewerProfileId, { now })
    const final = [...explored].sort((a, b) => b.score - a.score || a.currentRank - b.currentRank)

    return final.map((item, index) => ({
      candidateProfileId: item.candidateProfileId,
      recommendationScore: Math.round(item.score * 100) / 100,
      reasonCodes: item.reasonCodes,
      modelVersion: HEURISTIC_MODEL_VERSION,
      isExploration: item.isExploration,
      currentRank: item.currentRank,
      recommendationRank: index + 1,
    }))
  }
})
