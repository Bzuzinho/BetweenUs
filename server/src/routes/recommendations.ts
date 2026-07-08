// 11.5/11.11/11.12 — admin-only visibility into the Intelligent
// Recommendations experiment: current flags, signal weight config,
// shadow-mode analysis, and A/B guardrails. No route here can change what
// a real user sees — this is read + weight-tuning only; the actual
// on/off switches are the two env vars (INTELLIGENT_RECOMMENDATIONS_
// SHADOW_MODE / _ENABLED), deliberately not toggleable from the admin UI
// in this sprint (a flag flip is a deploy-time decision reviewed outside
// the app, not a click any ADMIN can make mid-incident without that
// review — consistent with how AI_MODERATION_ENABLED/PRIVATE_EVENTS_ENABLED
// are handled elsewhere in this codebase).
import { Router, Response } from 'express'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { isShadowModeEnabled, isIntelligentRecommendationsEnabled } from '../lib/recommendationAbTestService'
import { getActiveSignalWeights, upsertSignalWeights, SIGNAL_CONFIG_VERSION, DEFAULT_SIGNAL_WEIGHTS } from '../lib/recommendationSignalWeightConfigService'
import { HEURISTIC_MODEL_VERSION } from '../lib/heuristicRecommendationRanker'
import {
  computeRankCorrelation, estimateTopNLikeRate, computeMeaningfulConnectionRateByCohort, computeGuardrailComparison
} from '../lib/recommendationAnalysisService'
import { computeMeaningfulConnectionRateSince } from '../lib/meaningfulConnectionService'

const router = Router()

// GET /api/admin/recommendations/status — flags + current model version.
router.get('/status', requireAuth, requireAdmin('recommendations'), async (req: AuthRequest, res: Response) => {
  res.json({
    shadowModeEnabled: isShadowModeEnabled(),
    intelligentRecommendationsEnabled: isIntelligentRecommendationsEnabled(),
    modelVersion: HEURISTIC_MODEL_VERSION,
    signalConfigVersion: SIGNAL_CONFIG_VERSION,
  })
})

// GET /api/admin/recommendations/weights
router.get('/weights', requireAuth, requireAdmin('recommendations'), async (req: AuthRequest, res: Response) => {
  const weights = await getActiveSignalWeights()
  res.json({ weights, defaults: DEFAULT_SIGNAL_WEIGHTS, configVersion: SIGNAL_CONFIG_VERSION })
})

const weightsSchema = z.object({
  PROFILE_VIEW: z.number().optional(), LIKE: z.number().optional(), MAYBE: z.number().optional(),
  PASS: z.number().optional(), MATCH: z.number().optional(), CONVERSATION_STARTED: z.number().optional(),
  SUSTAINED_CONVERSATION: z.number().optional(), PHOTO_ACCESS_GRANTED: z.number().optional(),
  SAFE_EXIT: z.number().optional(), BLOCK: z.number().optional(), REPORT: z.number().optional(),
})

// PUT /api/admin/recommendations/weights — 11.2: admin-editable, versioned.
router.put('/weights', requireAuth, requireAdmin('recommendations'), async (req: AuthRequest, res: Response) => {
  try {
    const data = weightsSchema.parse(req.body)
    const config = await upsertSignalWeights(SIGNAL_CONFIG_VERSION, data, req.userId)
    await logAdminAction(req.userId!, 'UPDATE_RECOMMENDATION_SIGNAL_WEIGHTS', 'recommendation_signal_weight_config', config.id, { newData: data, ipAddress: req.ip })
    res.json({ ok: true, config })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/admin/recommendations/shadow-analysis?days=14 — 11.11.
router.get('/shadow-analysis', requireAuth, requireAdmin('recommendations'), async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 14))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [rankCorrelation, likeProjection, meaningfulByCohort] = await Promise.all([
      computeRankCorrelation(HEURISTIC_MODEL_VERSION, since),
      estimateTopNLikeRate(HEURISTIC_MODEL_VERSION, since),
      computeMeaningfulConnectionRateByCohort(since),
    ])

    res.json({ sinceDays: days, rankCorrelation, likeProjection, meaningfulConnectionRateByCohort: meaningfulByCohort })
  } catch (err: any) {
    console.error('[RECOMMENDATION SHADOW ANALYSIS]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/admin/recommendations/guardrails?days=14 — 11.12.
router.get('/guardrails', requireAuth, requireAdmin('recommendations'), async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 14))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const comparison = await computeGuardrailComparison(since)
    res.json({ sinceDays: days, ...comparison })
  } catch (err: any) {
    console.error('[RECOMMENDATION GUARDRAILS]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/admin/recommendations/meaningful-connection-rate?days=30 — 11.3,
// overall (not cohort-split) — the headline product metric on its own.
router.get('/meaningful-connection-rate', requireAuth, requireAdmin('recommendations'), async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const rate = await computeMeaningfulConnectionRateSince(since)
    res.json({ sinceDays: days, ...rate })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
