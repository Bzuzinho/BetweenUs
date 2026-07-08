// Discovery validation follow-up — CandidateConstraintService.
//
// Root cause this file fixes: no_couples/singles_only/couples_only/
// verified_only were modeled as MUTUAL_ALIGNMENT boundaries, which only
// ever compare two profiles' answers on the SAME slug
// (boundaryCompatibilityService.ts's `bBySlug.get(ai.slug)`). A COUPLE
// profile has no reason to ever hold a `no_couples` ProfileBoundary row
// about itself, so a viewer's `no_couples=YES` never found anything to
// conflict against and silently never excluded anyone — confirmed via
// the beta seed validator (individual_leonor/individual_tiago both
// leaked COUPLE candidates into their Discovery feed).
//
// These four boundaries are not mutual preferences at all — they are the
// viewer expressing a constraint on the CANDIDATE's own structural
// properties (Profile.type, verification status), independent of
// whatever the candidate itself answered on any boundary. This file is
// the ONLY place that logic lives. It is:
//   - a HARD ELIGIBILITY gate, evaluated in discoveryService.ts BEFORE
//     BetweenScoreService is ever called for the pair — never a score
//     input, positive or negative (Between Score keeps meaning "how good
//     is the match", not "is this pair even allowed to see each other").
//   - evaluated bidirectionally by the caller (once with source=viewer,
//     target=candidate; once with source=candidate, target=viewer),
//     exactly like evaluateIntentionCompatibility/
//     evaluateBoundaryCompatibility already are — so a singles_only=YES
//     individual is invisible to a couple's Discovery feed too, not just
//     the other way around.
//   - deliberately NOT a generic field/operator/values rules engine —
//     four explicit, structured cases only, per the instruction not to
//     over-build this hotfix.
export type BoundaryConstraintTypeValue =
  | 'EXCLUDE_COUPLES' | 'COUPLES_ONLY' | 'INDIVIDUALS_ONLY' | 'VERIFIED_ONLY'

export interface ConstraintBoundaryInput {
  slug: string
  preference: 'YES' | 'MAYBE' | 'NO'
  ruleType: string
  constraintType?: BoundaryConstraintTypeValue | null
}

export interface CandidateStructuralProps {
  profileType: 'INDIVIDUAL' | 'COUPLE' | 'GROUP'
  isVerified: boolean
}

export interface ConstraintConflict {
  code: BoundaryConstraintTypeValue
  source: 'BOUNDARY'
  boundarySlug: string
}

export interface CandidateConstraintResult {
  compatible: boolean
  conflicts: ConstraintConflict[]
}

// Each entry returns true when `target` VIOLATES the constraint (i.e.
// must be excluded). Documented explicitly rather than assumed — GROUP is
// never silently folded into COUPLE or INDIVIDUAL:
//   - EXCLUDE_COUPLES  (no_couples):    only COUPLE is excluded. GROUP passes.
//   - COUPLES_ONLY     (couples_only):  anything that isn't COUPLE is excluded — this
//                                       DOES exclude GROUP, a deliberate literal reading
//                                       of "apenas casais", flagged for product review.
//   - INDIVIDUALS_ONLY (singles_only):  anything that isn't INDIVIDUAL is excluded — this
//                                       DOES exclude GROUP, same reasoning as above.
//   - VERIFIED_ONLY:                    candidate.isVerified must be true. Profile type
//                                       is irrelevant to this one.
const VIOLATES: Record<BoundaryConstraintTypeValue, (target: CandidateStructuralProps) => boolean> = {
  EXCLUDE_COUPLES:  (target) => target.profileType === 'COUPLE',
  COUPLES_ONLY:     (target) => target.profileType !== 'COUPLE',
  INDIVIDUALS_ONLY: (target) => target.profileType !== 'INDIVIDUAL',
  VERIFIED_ONLY:    (target) => !target.isVerified,
}

// One-directional: `sourceBoundaries` are the profile whose preferences
// are being enforced, `target` is the OTHER profile's structural
// properties. Callers must invoke this twice (both directions) for a
// real mutual hard-exclusion — see discoveryService.ts.
export const evaluateCandidateConstraints = (
  sourceBoundaries: ConstraintBoundaryInput[],
  target: CandidateStructuralProps
): CandidateConstraintResult => {
  const conflicts: ConstraintConflict[] = []
  for (const b of sourceBoundaries) {
    if (b.ruleType !== 'CANDIDATE_CONSTRAINT') continue
    if (b.preference !== 'YES') continue // MAYBE/NO on a candidate constraint never excludes — only an explicit YES asserts the filter
    if (!b.constraintType) continue // malformed catalog row (should never happen once catalog.ts validates this) — fail open, never crash Discovery over bad admin data
    if (VIOLATES[b.constraintType](target)) {
      conflicts.push({ code: b.constraintType, source: 'BOUNDARY', boundarySlug: b.slug })
    }
  }
  return { compatible: conflicts.length === 0, conflicts }
}
