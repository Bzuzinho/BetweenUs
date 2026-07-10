// 9.4 — ReportPriorityService: extracted from what used to be an inline
// PRIORITY_MAP literal in reports.ts (T7). Kept as a rule engine — an
// ordered list of small, independently-testable rules, each contributing
// a candidate priority; the report's final priority is the max of every
// rule that applies. Explicitly NOT AI-based (per spec: "Não depender
// inicialmente de IA. Rule engine primeiro.") — ModerationAssessment
// (9.8) is a separate, optional signal layered on top later, never a
// replacement for this.
export type ReportReasonValue =
  | 'FAKE_PROFILE' | 'HARASSMENT' | 'OFFENSIVE_CONTENT' | 'MINOR' | 'NON_CONSENSUAL_IMAGE'
  | 'SPAM' | 'THREAT' | 'COERCION' | 'REVENGE_PORN' | 'DOXXING'
  | 'PROSTITUTION_OR_ESCORT' | 'PAID_SEXUAL_SERVICES' | 'SCAM' | 'OTHER'

export const PRIORITY_TIER = { MAXIMUM: 10, HIGH: 8, ELEVATED: 7, MODERATE: 5, LOW: 3, MINIMAL: 1, NONE: 0 } as const

// Máxima prioridade per the spec's explicit list. DOXXING moved here from
// its previous HIGH-only mapping — the spec is explicit that it belongs
// alongside MINOR/THREAT/NON_CONSENSUAL_IMAGE/REVENGE_PORN, not one tier
// below them.
const MAXIMUM_REASONS: ReportReasonValue[] = ['MINOR', 'THREAT', 'NON_CONSENSUAL_IMAGE', 'REVENGE_PORN', 'DOXXING']
// COERCION: alta (high), per spec — explicitly called out on its own,
// kept distinct from the maximum tier above.
const HIGH_REASONS: ReportReasonValue[] = ['COERCION', 'HARASSMENT']
const ELEVATED_REASONS: ReportReasonValue[] = ['PROSTITUTION_OR_ESCORT', 'PAID_SEXUAL_SERVICES']
const MODERATE_REASONS: ReportReasonValue[] = ['FAKE_PROFILE', 'SCAM']
const LOW_REASONS: ReportReasonValue[] = ['OFFENSIVE_CONTENT']
// SPAM (and anything else with no explicit rule, e.g. OTHER) intentionally
// has no dedicated tier — it falls through to the PRIORITY_TIER.NONE
// default below. Not a safety signal on its own.

const reasonBaseRule = (reason: ReportReasonValue): number => {
  if (MAXIMUM_REASONS.includes(reason)) return PRIORITY_TIER.MAXIMUM
  if (HIGH_REASONS.includes(reason)) return PRIORITY_TIER.HIGH
  if (ELEVATED_REASONS.includes(reason)) return PRIORITY_TIER.ELEVATED
  if (MODERATE_REASONS.includes(reason)) return PRIORITY_TIER.MODERATE
  if (LOW_REASONS.includes(reason)) return PRIORITY_TIER.LOW
  return PRIORITY_TIER.NONE
}

// Reincidence: someone already sitting on ≥2 open reports gets bumped to
// at least HIGH, regardless of how mild any single new report's reason is
// — a pattern is itself a signal the rule engine should weigh.
const RECIDIVISM_THRESHOLD = 2
const recidivismRule = (openReportCount: number): number =>
  openReportCount >= RECIDIVISM_THRESHOLD ? PRIORITY_TIER.HIGH : PRIORITY_TIER.NONE

export interface PriorityInput {
  reason: ReportReasonValue
  openReportCountForTarget?: number
}

export interface PriorityResult {
  priority: number
  tier: 'MAXIMUM' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW' | 'MINIMAL' | 'NONE'
  appliedRules: string[]
}

const tierNameFor = (priority: number): PriorityResult['tier'] => {
  if (priority >= PRIORITY_TIER.MAXIMUM) return 'MAXIMUM'
  if (priority >= PRIORITY_TIER.HIGH) return 'HIGH'
  if (priority >= PRIORITY_TIER.ELEVATED) return 'ELEVATED'
  if (priority >= PRIORITY_TIER.MODERATE) return 'MODERATE'
  if (priority >= PRIORITY_TIER.LOW) return 'LOW'
  if (priority >= PRIORITY_TIER.MINIMAL) return 'MINIMAL'
  return 'NONE'
}

export const computeReportPriority = (input: PriorityInput): PriorityResult => {
  const appliedRules: string[] = []
  let priority = reasonBaseRule(input.reason)
  appliedRules.push(`reason:${input.reason}=${priority}`)

  if (input.openReportCountForTarget !== undefined) {
    const bump = recidivismRule(input.openReportCountForTarget)
    if (bump > 0) appliedRules.push(`recidivism:${input.openReportCountForTarget}_open=${bump}`)
    priority = Math.max(priority, bump)
  }

  return { priority, tier: tierNameFor(priority), appliedRules }
}
