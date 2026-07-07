// 5.6 — BetweenScoreConfigService: reads BETWEEN_SCORE_V2's weights from
// the DB (BetweenScoreConfig, admin-editable) instead of hardcoding them
// inside a route or the scoring function itself. Same shape as
// ReferralRule (referralService.ts) — a single admin-editable settings
// row per concern, not a generic key/value config table.
import prisma from './prisma'

export const ALGORITHM_VERSION = 'BETWEEN_SCORE_V2'

export interface BetweenScoreWeights {
  intentions: number
  boundaries: number
  relationshipContext: number
  discretion: number
  location: number
  conversationPace: number
}

// Used only if no BetweenScoreConfig row exists yet (fresh install before
// an admin/seed has created one) — matches the weights the spec specified,
// so behavior is identical to "properly configured" until someone changes it.
const DEFAULT_WEIGHTS: BetweenScoreWeights = {
  intentions: 0.30,
  boundaries: 0.30,
  relationshipContext: 0.15,
  discretion: 0.10,
  location: 0.10,
  conversationPace: 0.05,
}

export const getActiveWeights = async (algorithmVersion: string = ALGORITHM_VERSION): Promise<BetweenScoreWeights> => {
  const config = await (prisma as any).betweenScoreConfig.findFirst({
    where: { algorithmVersion, active: true }
  })
  if (!config) return DEFAULT_WEIGHTS
  return {
    intentions: config.weightIntentions,
    boundaries: config.weightBoundaries,
    relationshipContext: config.weightRelationshipContext,
    discretion: config.weightDiscretion,
    location: config.weightLocation,
    conversationPace: config.weightConversationPace,
  }
}

// Admin write path — validated here (not at the DB level, same trust
// boundary ReferralRule already uses) rather than blocking on weights
// summing to exactly 1.0, since that's a product tuning decision, not a
// structural invariant worth hard-failing requests over. Callers are
// warned via the returned `warning` field so the admin UI can surface it.
export const upsertWeights = async (
  algorithmVersion: string,
  weights: Partial<BetweenScoreWeights>,
  updatedByUserId?: string
): Promise<{ config: any; warning?: string }> => {
  const current = await getActiveWeights(algorithmVersion)
  const merged = { ...current, ...weights }
  const sum = Object.values(merged).reduce((s, v) => s + v, 0)

  const config = await (prisma as any).betweenScoreConfig.upsert({
    where: { algorithmVersion },
    update: {
      weightIntentions: merged.intentions,
      weightBoundaries: merged.boundaries,
      weightRelationshipContext: merged.relationshipContext,
      weightDiscretion: merged.discretion,
      weightLocation: merged.location,
      weightConversationPace: merged.conversationPace,
      updatedByUserId,
    },
    create: {
      algorithmVersion,
      weightIntentions: merged.intentions,
      weightBoundaries: merged.boundaries,
      weightRelationshipContext: merged.relationshipContext,
      weightDiscretion: merged.discretion,
      weightLocation: merged.location,
      weightConversationPace: merged.conversationPace,
      updatedByUserId,
    }
  })

  const warning = Math.abs(sum - 1.0) > 0.01
    ? `Os pesos somam ${(sum * 100).toFixed(0)}%, não 100%.`
    : undefined

  return { config, warning }
}
