// 11.5/11.12 — feature flags + stable cohort assignment for the
// Intelligent Recommendations experiment.
//
// Both flags default OFF — this is a brand-new, unlaunched surface (same
// precedent as PRIVATE_EVENTS_ENABLED, Sprint 10), and per the spec
// "Não ativar Recommendation V1 para 100% dos utilizadores" applies with
// even more force to shadow mode, which should be a deliberate opt-in per
// environment, not implicit.
//
//  INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE — Discovery keeps serving the
//    CURRENT ranking to every user; the ranker runs in parallel purely for
//    logging/comparison (11.5). No user-visible effect either way.
//
//  INTELLIGENT_RECOMMENDATIONS_ENABLED — the actual A/B test (11.12): once
//    on, a viewer's COHORT decides what they see. CONTROL always gets the
//    current ranking (identical to the flag being off). RECOMMENDATION_V1
//    gets the ranker's order. This is the one flag an admin flips off as
//    the "kill switch" (11.14) if guardrails regress — flipping it off
//    reverts every viewer to CONTROL-equivalent behavior immediately,
//    with no cohort-specific state to unwind.
export const isShadowModeEnabled = (): boolean =>
  process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE === 'true'

export const isIntelligentRecommendationsEnabled = (): boolean =>
  process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED === 'true'

export type RecommendationCohort = 'CONTROL' | 'RECOMMENDATION_V1'

export const EXPERIMENT_KEY = 'INTELLIGENT_RECOMMENDATIONS_V1'

// Same small stable-hash approach as recommendationExplorationService's
// seededFraction, duplicated (not imported) deliberately: exploration's
// seed rotates daily by design, cohort assignment must NOT rotate at all
// ("assignment estável por user/profile") — sharing one function with two
// different stability requirements invites a future edit to one breaking
// the other.
const seededFraction = (seed: string): number => {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  // Murmur3-style finalizer (fmix32). The plain polynomial rolling hash
  // above has weak avalanche behavior for inputs sharing a long common
  // prefix and differing only in a short numeric suffix — exactly the
  // shape of `${EXPERIMENT_KEY}:profile-0`, `${EXPERIMENT_KEY}:profile-1`,
  // etc. Confirmed empirically (first real npm test run this sprint,
  // after the jest.config.js setupFiles fix let tests execute at all):
  // without this step, 1000 sequential profileIds skewed ~91%/9% instead
  // of ~50/50, and 500 sequential profileIds landed 100% in one cohort.
  // Real profile IDs are random UUIDs (schema.prisma's Profile.id
  // @default(uuid())), so this almost certainly never biased a live
  // cohort — but the function should be robust regardless of input
  // shape, not rely on callers happening to pass high-entropy IDs. This
  // finisher spreads bits fully without changing the stability guarantee
  // (same input still always produces the same output).
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// 50/50 split, stable for the lifetime of (experimentKey, profileId) — the
// same profileId always maps to the same cohort as long as neither input
// changes, with no DB row required to remember it (11.14's "stable cohort
// assignment" test asserts exactly this: same input, same output, every
// time, including across process restarts).
export const assignCohort = (profileId: string, experimentKey: string = EXPERIMENT_KEY): RecommendationCohort =>
  seededFraction(`${experimentKey}:${profileId}`) < 0.5 ? 'CONTROL' : 'RECOMMENDATION_V1'

// The effective cohort a request should be treated as, folding in BOTH
// flags: if the experiment isn't enabled at all, everyone behaves as
// CONTROL regardless of their hash bucket — this is the kill switch's
// actual mechanism, not a separate code path.
export const effectiveCohort = (profileId: string): RecommendationCohort =>
  isIntelligentRecommendationsEnabled() ? assignCohort(profileId) : 'CONTROL'
