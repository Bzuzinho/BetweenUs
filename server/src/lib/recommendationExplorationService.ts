// 11.8 — RecommendationExplorationService: 10-15% exploration candidates.
// "Exploration candidate: continua elegível" — by construction, since this
// only ever operates on the same already-eligible, already-scored list
// every other Sprint 11 piece uses; nothing here can add a new candidate.
// "Nunca usar exploration para ultrapassar hard boundary" — hard boundary
// conflicts are excluded at Layer 1 before this file ever runs, so there
// is no hard-boundary-conflicted candidate to ultrapassar in the first
// place; the bounded nudge below additionally ensures exploration can
// never leapfrog a much-better-scoring candidate either, which is the
// softer version of the same principle applied to score, not just
// eligibility.
//
// Deterministic, not fully random: seeded by (viewerProfileId + calendar
// day), so the same viewer sees a STABLE exploration set across requests
// within the same day (no flicker reshuffling the feed every reload) while
// still rotating day to day. This also makes shadow-mode logs (11.5)
// reproducible for analysis.
export interface ExplorableItem {
  candidateProfileId: string
  score: number
}

// Small string hash -> deterministic 0..1 float. Not cryptographic, not
// meant to be — just needs to be a stable, well-distributed function of
// its inputs.
const seededFraction = (seed: string): number => {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  // Normalize the 32-bit signed int into [0, 1).
  return (h >>> 0) / 4294967296
}

const dayKey = (now: Date): string => now.toISOString().slice(0, 10)

export interface ExplorationResult<T extends ExplorableItem> {
  items: (T & { isExploration: boolean })[]
}

export const assignExploration = <T extends ExplorableItem>(
  ranked: T[],
  viewerProfileId: string,
  opts: { ratio?: number; excludeTopFraction?: number; maxNudge?: number; now?: Date } = {}
): (T & { isExploration: boolean })[] => {
  const ratio = opts.ratio ?? 0.12 // within the spec's 10-15% band
  const excludeTopFraction = opts.excludeTopFraction ?? 0.3 // never touch the clear top matches
  const maxNudge = opts.maxNudge ?? 5
  const now = opts.now ?? new Date()

  if (ranked.length === 0) return []

  const eligibleStart = Math.ceil(ranked.length * excludeTopFraction)
  const explorationPoolSize = ranked.length - eligibleStart
  const targetCount = Math.round(ranked.length * ratio)

  const flagged = new Set<string>()
  if (explorationPoolSize > 0 && targetCount > 0) {
    // Deterministic selection: rank the eligible-for-exploration slice by
    // its seeded fraction and take the smallest `targetCount` — stable for
    // a given (viewer, day), different across viewers and across days.
    const pool = ranked.slice(eligibleStart).map(item => ({
      id: item.candidateProfileId,
      rand: seededFraction(`${viewerProfileId}:${dayKey(now)}:${item.candidateProfileId}`),
    }))
    pool.sort((a, b) => a.rand - b.rand)
    pool.slice(0, Math.min(targetCount, pool.length)).forEach(p => flagged.add(p.id))
  }

  return ranked.map((item, index) => {
    const isExploration = flagged.has(item.candidateProfileId)
    if (!isExploration) return { ...item, isExploration: false }

    // Bounded nudge: at most maxNudge, and at most half the gap to the
    // immediately-higher-scored candidate, so exploration can nudge
    // forward within its neighborhood but can never leapfrog a
    // meaningfully better match.
    const higher = ranked[index - 1]
    const gapCap = higher ? Math.max(0, (higher.score - item.score) / 2) : maxNudge
    const nudge = Math.min(maxNudge, gapCap)

    return { ...item, score: item.score + nudge, isExploration: true }
  })
}
