// 4.6 — IntentionCompatibilityService
//
// Documents and centralizes the compatibility matrix the spec asked for,
// instead of leaving intention matching implicit inside discovery.ts's
// scoring function (which only ever checked boundaries, never intentions
// directly, before this).
//
// Compatibility works at three levels:
//   1. Direct match — both profiles marked YES on the exact same slug
//      (e.g. both selected "casual_encounter").
//   2. Complementary match — one profile's YES has a complementarySlug
//      (set in the Intention catalog) that the other profile also marked
//      YES. This is what makes a couple's "seek_third" and an
//      individual's "seek_couple" register as a real match even though
//      they're different slugs — they're the same interaction seen from
//      each side.
//   3. Conflict — either profile explicitly said NO to something the
//      other is actively seeking. This covers both the direct case (A: NO
//      casual_encounter, B: YES casual_encounter) and the complementary
//      case, which is the spec's own example: a couple YES on seek_third,
//      an individual explicit NO on seek_couple -> incompatible, even
//      though the slugs differ.
//
// Always compares by slug/id, never by label/name — labels are admin-
// editable copy and must never carry matching logic.
export type IntentionPreference = 'YES' | 'MAYBE' | 'NO'

export interface ProfileIntentionInput {
  slug: string
  preference: IntentionPreference
  complementarySlug?: string | null
}

export interface IntentionCompatibilityResult {
  compatible: boolean
  score: number // 0-100, heuristic — see inline weighting, not yet product-tuned
  matches: string[]   // slugs (from A's perspective) that matched, directly or complementarily
  conflicts: string[] // slugs (from A's perspective) that hard-conflict
}

export const evaluateIntentionCompatibility = (
  a: ProfileIntentionInput[],
  b: ProfileIntentionInput[]
): IntentionCompatibilityResult => {
  const bBySlug = new Map(b.map(i => [i.slug, i]))
  const matches = new Set<string>()
  const conflicts = new Set<string>()

  for (const ai of a) {
    const direct = bBySlug.get(ai.slug)
    const complementary = ai.complementarySlug ? bBySlug.get(ai.complementarySlug) : undefined

    if (ai.preference === 'YES') {
      if (direct?.preference === 'YES') matches.add(ai.slug)
      if (complementary?.preference === 'YES') matches.add(ai.slug)
      // Spec example: couple YES seek_third, individual explicit NO
      // seek_couple -> conflict, even though the slugs differ.
      if (complementary?.preference === 'NO') conflicts.add(ai.slug)
      if (direct?.preference === 'NO') conflicts.add(ai.slug) // shouldn't normally coexist with the match branch above, kept for symmetry
    }

    if (ai.preference === 'NO' && direct?.preference === 'YES') {
      conflicts.add(ai.slug)
    }
  }

  const score = Math.max(0, Math.min(100, matches.size * 25 - conflicts.size * 50))

  return {
    compatible: conflicts.size === 0,
    score,
    matches: [...matches],
    conflicts: [...conflicts]
  }
}
