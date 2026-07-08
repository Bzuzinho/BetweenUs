// 11.2 — RecommendationSignalWeightConfigService: versioned, admin-editable
// signal weights. Same single-row-per-version shape as
// betweenScoreConfigService.ts's BetweenScoreConfig — deliberately not
// hardcoded constants ("não assumir pesos finais" in the spec). Defaults
// below are the spec's own worked example, a starting point only.
import prisma from './prisma'
import type { RecommendationSignalTypeValue } from './recommendationSignalService'

export const SIGNAL_CONFIG_VERSION = 'RECOMMENDATION_SIGNALS_V1'

export interface SignalWeights {
  PROFILE_VIEW: number
  LIKE: number
  MAYBE: number
  PASS: number
  MATCH: number
  CONVERSATION_STARTED: number
  SUSTAINED_CONVERSATION: number
  PHOTO_ACCESS_GRANTED: number
  SAFE_EXIT: number
  BLOCK: number
  REPORT: number
}

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  PROFILE_VIEW: 0.2,
  LIKE: 1,
  MAYBE: 0.3,
  PASS: -1,
  MATCH: 3,
  CONVERSATION_STARTED: 4,
  SUSTAINED_CONVERSATION: 8,
  PHOTO_ACCESS_GRANTED: 2,
  SAFE_EXIT: -8,
  BLOCK: -10,
  REPORT: -15,
}

const dbFieldMap: Record<keyof SignalWeights, string> = {
  PROFILE_VIEW: 'weightProfileView',
  LIKE: 'weightLike',
  MAYBE: 'weightMaybe',
  PASS: 'weightPass',
  MATCH: 'weightMatch',
  CONVERSATION_STARTED: 'weightConversationStarted',
  SUSTAINED_CONVERSATION: 'weightSustainedConversation',
  PHOTO_ACCESS_GRANTED: 'weightPhotoAccessGranted',
  SAFE_EXIT: 'weightSafeExit',
  BLOCK: 'weightBlock',
  REPORT: 'weightReport',
}

export const getActiveSignalWeights = async (configVersion: string = SIGNAL_CONFIG_VERSION): Promise<SignalWeights> => {
  const config = await (prisma as any).recommendationSignalWeightConfig.findFirst({
    where: { configVersion, active: true }
  })
  if (!config) return DEFAULT_SIGNAL_WEIGHTS
  const weights = {} as SignalWeights
  for (const key of Object.keys(dbFieldMap) as (keyof SignalWeights)[]) {
    weights[key] = config[dbFieldMap[key]]
  }
  return weights
}

export const getWeightFor = async (signalType: RecommendationSignalTypeValue, configVersion?: string): Promise<number> => {
  const weights = await getActiveSignalWeights(configVersion)
  return weights[signalType]
}

// Admin write path — same trust boundary as betweenScoreConfigService's
// upsertWeights: no hard validation of the values themselves (tuning is a
// product decision, not a structural invariant), just persisted and
// versioned so a bad change can be rolled back by re-activating an older
// configVersion row rather than losing history.
export const upsertSignalWeights = async (
  configVersion: string,
  weights: Partial<SignalWeights>,
  updatedByUserId?: string
): Promise<any> => {
  const current = await getActiveSignalWeights(configVersion)
  const merged = { ...current, ...weights }
  const data: any = { updatedByUserId }
  for (const key of Object.keys(dbFieldMap) as (keyof SignalWeights)[]) {
    data[dbFieldMap[key]] = merged[key]
  }

  return (prisma as any).recommendationSignalWeightConfig.upsert({
    where: { configVersion },
    update: data,
    create: { configVersion, ...data }
  })
}
