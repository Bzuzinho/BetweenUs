// 4.7 — BoundaryCompatibilityService
//
// Replaces the blanket "any hard boundary disagreement excludes" rule
// (discovery.ts's old hasHardBoundaryConflict) with logic that depends on
// what KIND of boundary it is, per BoundaryRuleType:
//
//   MUTUAL_ALIGNMENT — a real two-way conflict: A says NO to something B
//     says YES to (either direction). Example: "no_couples" — if a single
//     person says NO and a couple says YES, neither side's preference can
//     be honored, so they must not be shown to each other at all.
//
//   REQUIRE_TARGET_ACCEPTANCE — A wanting something only matters if B
//     hasn't actively rejected it. B being neutral (MAYBE, or never
//     answered) is NOT a block — only an explicit B=NO is. This is for
//     boundaries where one side is asking for something specific from the
//     other, but silence isn't refusal.
//
//   PERSONAL_PREFERENCE — never excludes anyone. This is the case the spec
//     warns about explicitly: something like "show my face before match"
//     describes the profile's OWN visibility choice, not a claim about
//     what the other person must accept. Only ever shows up as
//     commonYes/softDifferences, never hardConflicts.
//
// Only boundaries with isHardBoundary=true are eligible to produce a
// hardConflict at all, regardless of ruleType — ruleType only refines HOW
// a hard boundary conflicts, it doesn't turn a soft boundary into a hard
// one.
export type BoundaryPreference = 'YES' | 'MAYBE' | 'NO'
export type BoundaryRuleType = 'MUTUAL_ALIGNMENT' | 'REQUIRE_TARGET_ACCEPTANCE' | 'PERSONAL_PREFERENCE'

export interface ProfileBoundaryInput {
  slug: string
  preference: BoundaryPreference
  isHardBoundary: boolean
  ruleType: BoundaryRuleType
}

export interface BoundaryCompatibilityResult {
  compatible: boolean       // false only if hardConflicts is non-empty
  hardConflicts: string[]
  softDifferences: string[]
  commonYes: string[]
  score: number             // 0-100 heuristic, not yet product-tuned
}

const isConflict = (a: ProfileBoundaryInput, b: ProfileBoundaryInput): boolean => {
  if (!a.isHardBoundary) return false
  switch (a.ruleType) {
    case 'PERSONAL_PREFERENCE':
      return false
    case 'REQUIRE_TARGET_ACCEPTANCE':
      return a.preference === 'YES' && b.preference === 'NO'
    case 'MUTUAL_ALIGNMENT':
    default:
      return (a.preference === 'NO' && b.preference === 'YES') || (a.preference === 'YES' && b.preference === 'NO')
  }
}

export const evaluateBoundaryCompatibility = (
  a: ProfileBoundaryInput[],
  b: ProfileBoundaryInput[]
): BoundaryCompatibilityResult => {
  const bBySlug = new Map(b.map(x => [x.slug, x]))
  const hardConflicts = new Set<string>()
  const softDifferences = new Set<string>()
  const commonYes = new Set<string>()

  for (const ai of a) {
    const bi = bBySlug.get(ai.slug)
    if (!bi) continue

    if (ai.preference === 'YES' && bi.preference === 'YES') {
      commonYes.add(ai.slug)
      continue
    }

    if (isConflict(ai, bi) || isConflict(bi, ai)) {
      hardConflicts.add(ai.slug)
    } else if (ai.preference !== bi.preference) {
      softDifferences.add(ai.slug)
    }
  }

  const score = Math.max(0, Math.min(100,
    commonYes.size * 15 - softDifferences.size * 5 - hardConflicts.size * 100
  ))

  return {
    compatible: hardConflicts.size === 0,
    hardConflicts: [...hardConflicts],
    softDifferences: [...softDifferences],
    commonYes: [...commonYes],
    score
  }
}
