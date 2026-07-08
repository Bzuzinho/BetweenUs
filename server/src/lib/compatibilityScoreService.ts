// 5.5/5.8 — CompatibilityScoreService: the persisted cache in front of
// BetweenScoreService. Directional by design (source->target is its own
// row from target->source) - see the CompatibilityScore model comment in
// schema.prisma for why these can legitimately differ.
import prisma from './prisma'
import { calculateBetweenScore, type BetweenScoreProfileInput, type BetweenScoreResult } from './betweenScoreService'
import { ALGORITHM_VERSION, getActiveWeights } from './betweenScoreConfigService'

// How long a cached score is trusted before being recomputed on next read,
// even if nothing explicitly invalidated it (a safety net against a missed
// invalidation call somewhere, not the primary invalidation mechanism -
// that's scoreInvalidationService.ts, triggered on writes).
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export const getOrCalculateScore = async (
  source: BetweenScoreProfileInput,
  target: BetweenScoreProfileInput
): Promise<BetweenScoreResult> => {
  const cached = await (prisma as any).compatibilityScore.findUnique({
    where: {
      sourceProfileId_targetProfileId_algorithmVersion: {
        sourceProfileId: source.id,
        targetProfileId: target.id,
        algorithmVersion: ALGORITHM_VERSION,
      }
    }
  })

  if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
    return {
      eligible: cached.score > 0 || (cached.breakdown && Object.keys(cached.breakdown).length > 0),
      score: cached.score,
      algorithmVersion: cached.algorithmVersion,
      breakdown: cached.breakdown,
      reasonCodes: cached.reasons,
    }
  }

  const weights = await getActiveWeights()
  const result = await calculateBetweenScore(source, target, weights)

  // Only persist eligible results — a hard-conflict pair is excluded from
  // discovery entirely (5.3), so there's no discovery-time read that would
  // ever benefit from a cached "not eligible" row, and it would need its
  // own invalidation reasoning for no real gain.
  if (result.eligible) {
    await (prisma as any).compatibilityScore.upsert({
      where: {
        sourceProfileId_targetProfileId_algorithmVersion: {
          sourceProfileId: source.id,
          targetProfileId: target.id,
          algorithmVersion: ALGORITHM_VERSION,
        }
      },
      update: {
        score: result.score,
        breakdown: result.breakdown,
        reasons: result.reasonCodes,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
      },
      create: {
        sourceProfileId: source.id,
        targetProfileId: target.id,
        algorithmVersion: ALGORITHM_VERSION,
        score: result.score,
        breakdown: result.breakdown,
        reasons: result.reasonCodes,
        expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
      }
    }).catch((e: any) => console.error('[COMPATIBILITY SCORE CACHE]', e.message))
  }

  return result
}
