// 11.9 — RecommendationDiversityService: a light re-ranking pass that
// avoids stacking 20 near-identical profiles back to back. This ONLY
// reorders an already-fully-eligible, already-scored list — it never
// removes a candidate and never introduces one, so it cannot violate the
// absolute eligibility rule (there's nothing here that could).
//
// "Apenas quando compatível com filtros do utilizador. Não impor
// diversidade que contradiga intenção explícita." — implemented by never
// including a dimension the viewer already explicitly filtered on in the
// cluster key: if the viewer filtered discovery to COUPLE profiles only,
// every candidate already shares that dimension, so it's excluded from
// the key rather than uselessly "diversifying" a constant.
export interface ClusterableProfile {
  id: string
  type?: string | null
  relationshipStatus?: string | null
  city?: string | null
  intentions?: Array<{ intention?: { slug?: string | null } | null }> | null
}

export interface PinnedFilters {
  type?: boolean // true when the viewer explicitly filtered by profile type
}

export const buildClusterKey = (profile: ClusterableProfile, pinned: PinnedFilters = {}): string => {
  const parts: string[] = []
  if (!pinned.type) parts.push(`type:${profile.type || '?'}`)
  parts.push(`rel:${profile.relationshipStatus || '?'}`)
  parts.push(`city:${(profile.city || '?').toLowerCase()}`)
  const primaryIntention = profile.intentions?.[0]?.intention?.slug
  parts.push(`intent:${primaryIntention || '?'}`)
  return parts.join('|')
}

export interface DiversifiableItem {
  clusterKey: string
}

// Greedy bounded-lookahead re-interleave: walks the already-sorted list;
// whenever placing the next item would extend a same-cluster streak past
// `maxConsecutiveSameCluster`, it looks ahead (bounded by `lookahead`) for
// the nearest item from a DIFFERENT cluster and pulls it forward instead.
// If no such item exists within the window, it places the original item
// anyway — this is a soft nudge, never a hard constraint that could force
// a worse-ranked, off-topic candidate above a strong match just to tick a
// diversity box.
export const diversify = <T extends DiversifiableItem>(
  ranked: T[],
  opts: { maxConsecutiveSameCluster?: number; lookahead?: number } = {}
): T[] => {
  const maxConsecutive = opts.maxConsecutiveSameCluster ?? 2
  const lookahead = opts.lookahead ?? 5
  if (ranked.length <= maxConsecutive) return ranked

  const remaining = [...ranked]
  const result: T[] = []
  let streakKey: string | null = null
  let streakLen = 0

  while (remaining.length > 0) {
    const head = remaining[0]
    const wouldExtendStreak = head.clusterKey === streakKey && streakLen >= maxConsecutive

    if (!wouldExtendStreak) {
      result.push(remaining.shift()!)
    } else {
      const swapIndex = remaining.slice(1, 1 + lookahead).findIndex(item => item.clusterKey !== streakKey)
      if (swapIndex === -1) {
        // No relief within the window — place the original item rather
        // than reaching arbitrarily far and disrupting the score order.
        result.push(remaining.shift()!)
      } else {
        const [swapped] = remaining.splice(swapIndex + 1, 1)
        result.push(swapped)
      }
    }

    const last = result[result.length - 1]
    if (last.clusterKey === streakKey) streakLen++
    else { streakKey = last.clusterKey; streakLen = 1 }
  }

  return result
}
