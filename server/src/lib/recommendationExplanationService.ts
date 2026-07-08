// 11.10 — RecommendationExplanationService: reason codes -> neutral
// microcopy, same fixed-allow-list discipline as
// compatibilityExplanationService.ts (5.7). Explicitly never phrased as
// "AI thinks..." — the spec calls this out by name. Every phrase here
// describes an objective compatibility signal, never a claim about the
// system's confidence or intent.
import type { RecommendationReasonCode } from './recommendationRanker'

const REASON_COPY: Record<RecommendationReasonCode, string> = {
  HIGH_COMPATIBILITY:    'Strong overall compatibility',
  SIMILAR_INTENTIONS:    'Strong compatibility in intentions',
  BOUNDARY_ALIGNMENT:    'Strong compatibility in boundaries',
  SIMILAR_DISCRETION:    'Similar level of discretion',
  TRAVEL_OVERLAP:        'Travel plans overlap',
  NEW_COMPATIBLE_PROFILE:'New profile that matches what you are looking for',
}

export const explainRecommendationReasons = (reasonCodes: RecommendationReasonCode[]): string[] =>
  reasonCodes.map(code => REASON_COPY[code]).filter(Boolean)
