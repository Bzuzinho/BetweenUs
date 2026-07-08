// 11.4 — RecommendationRanker: LAYER 3 of the ranking architecture.
//
// ABSOLUTE RULE, enforced structurally here (not just documented): `rank()`
// accepts `DiscoveryCandidateItem[]` — the EXACT type discoveryService.ts's
// getCandidates() already returns, imported directly rather than
// redeclared. There is no constructor for a "candidate" anywhere in this
// file or its implementations; the only way to obtain a value of this type
// is to have already run the full Layer 1 (eligibility) + Layer 2 (Between
// Score) pipeline. A ranker CANNOT introduce a profile the eligibility
// pipeline excluded, because it is never handed anything the pipeline
// didn't already produce — this is a type-level guarantee, not a runtime
// check that could be bypassed by a future caller forgetting to validate.
import type { DiscoveryCandidateItem } from './discoveryService'

export type RecommendationReasonCode =
  | 'HIGH_COMPATIBILITY'
  | 'SIMILAR_INTENTIONS'
  | 'BOUNDARY_ALIGNMENT'
  | 'SIMILAR_DISCRETION'
  | 'TRAVEL_OVERLAP'
  | 'NEW_COMPATIBLE_PROFILE'

export interface RecommendationContext {
  // Only one source exists today (the main discovery feed) — kept as a
  // string union rather than a bare boolean/omitted field so a future
  // second surface (e.g. a "recommended for you" carousel) has an obvious
  // place to plug in without changing the interface shape again.
  source: 'DISCOVERY_FEED'
  requestedAt?: Date
}

export interface RankedRecommendation {
  candidateProfileId: string
  recommendationScore: number
  reasonCodes: RecommendationReasonCode[]
  modelVersion: string
  isExploration: boolean
  // Both ranks are 1-based and always populated, so callers (shadow
  // logging, 11.5) never have to re-derive "where was this candidate
  // before" — currentRank is the position this exact profile already had
  // in the `eligibleCandidates` array the ranker was given.
  currentRank: number
  recommendationRank: number
}

export interface RecommendationRanker {
  readonly modelVersion: string
  rank(
    viewerProfileId: string,
    eligibleCandidates: DiscoveryCandidateItem[],
    context: RecommendationContext
  ): Promise<RankedRecommendation[]>
}
