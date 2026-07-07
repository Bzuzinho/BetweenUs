// 5.6 — BetweenScoreService: BETWEEN_SCORE_V2.
//
// Replaces discovery.ts's old calcScore (hardcoded weights, computed fresh
// every request, no persistence, no explanation of what dvove the number).
// Reuses IntentionCompatibilityService/BoundaryCompatibilityService (4.6/4.7)
// directly for their own 0-100 heuristic scores rather than re-deriving
// intention/boundary logic a second time.
import { evaluateIntentionCompatibility, type ProfileIntentionInput } from './intentionCompatibilityService'
import { evaluateBoundaryCompatibility, type ProfileBoundaryInput } from './boundaryCompatibilityService'
import { haversineKm } from '../utils/location'
import { getActiveWeights, ALGORITHM_VERSION, type BetweenScoreWeights } from './betweenScoreConfigService'

// Same shape as ProfileBoundaryInput, plus `category` — needed here (and
// nowhere else) to split conversation_style boundaries into their own
// weighted bucket instead of double-counting them under "boundaries".
export interface BetweenScoreBoundaryInput extends ProfileBoundaryInput {
  category?: string | null
}

export interface BetweenScoreProfileInput {
  id: string
  relationshipStatus?: string | null
  discretionLevel?: string | null
  city?: string | null
  locationLat?: number | null
  locationLng?: number | null
  intentions: ProfileIntentionInput[]
  boundaries: BetweenScoreBoundaryInput[]
  activeTravelCities?: string[] // cities from this profile's currently-active TravelMode rows
}

export type BetweenScoreReasonCode =
  | 'INTENTIONS_ALIGNED'
  | 'BOUNDARIES_ALIGNED'
  | 'SIMILAR_DISCRETION'
  | 'COMPATIBLE_PACE'
  | 'BOTH_OPEN_TO_MEETING'
  | 'TRAVEL_OVERLAP'

interface BreakdownEntry { score: number; weight: number }

export interface BetweenScoreResult {
  eligible: boolean // false = hard conflict (intention or boundary); score/breakdown below are 0 in that case
  score: number      // 0-100 weighted final, 0 when !eligible
  algorithmVersion: string
  breakdown: Record<keyof BetweenScoreWeights, BreakdownEntry>
  reasonCodes: BetweenScoreReasonCode[]
}

// "conversation_style" boundaries (slow_pace/fast_pace/talk_first/...) get
// their OWN weighted bucket (conversationPace) instead of being folded into
// the general "boundaries" bucket, to avoid double-counting the same
// selections in two different weights.
const isConversationPace = (b: BetweenScoreBoundaryInput) => b.category === 'conversation_style'

const relationshipCompatMap: Record<string, string[]> = {
  SINGLE:         ['SINGLE', 'COUPLE_CURIOUS', 'COUPLE_LIBERAL', 'OPEN', 'POLYAMOROUS'],
  OPEN:           ['SINGLE', 'OPEN', 'POLYAMOROUS', 'COUPLE_CURIOUS'],
  POLYAMOROUS:    ['SINGLE', 'OPEN', 'POLYAMOROUS'],
  COUPLE_CURIOUS: ['SINGLE', 'OPEN'],
  COUPLE_LIBERAL: ['SINGLE', 'COUPLE_LIBERAL', 'OPEN'],
}
const relationshipContextScore = (a?: string | null, b?: string | null): number => {
  const va = a || 'SINGLE'
  const vb = b || 'SINGLE'
  return (relationshipCompatMap[va] || []).includes(vb) ? 100 : 0
}

const DISCRETION_ORDER = ['MAXIMUM', 'SELECTIVE', 'OPEN']
const discretionScore = (a?: string | null, b?: string | null): number => {
  if (!a || !b) return 100 // no preference stated on either side — treat as neutral, not a penalty
  const ia = DISCRETION_ORDER.indexOf(a)
  const ib = DISCRETION_ORDER.indexOf(b)
  if (ia === -1 || ib === -1) return 100
  const distance = Math.abs(ia - ib)
  return distance === 0 ? 100 : distance === 1 ? 60 : 20
}

// Base distance score, before any travel-mode override. No location data on
// either side is treated as neutral (50) — absence of data isn't a
// rejection signal.
const baseLocationScore = (source: BetweenScoreProfileInput, target: BetweenScoreProfileInput): number => {
  if (source.city && target.city && source.city.toLowerCase() === target.city.toLowerCase()) return 100
  if (source.locationLat != null && source.locationLng != null && target.locationLat != null && target.locationLng != null) {
    const km = haversineKm(source.locationLat, source.locationLng, target.locationLat, target.locationLng)
    if (km < 10) return 95
    if (km < 25) return 80
    if (km < 50) return 60
    if (km < 100) return 40
    return 20
  }
  return 50
}

// Travel Mode context (5.2 pipeline step 10) — previously had a full CRUD
// (routes/travel.ts) with zero effect anywhere. A profile's active travel
// city matching the other side's home city (or the other side's own active
// travel city) overrides the base location score upward and surfaces the
// TRAVEL_OVERLAP reason — it never lowers a score, only helps.
const travelOverlaps = (source: BetweenScoreProfileInput, target: BetweenScoreProfileInput): boolean => {
  const sourceCities = (source.activeTravelCities || []).map(c => c.toLowerCase())
  const targetCities = (target.activeTravelCities || []).map(c => c.toLowerCase())
  if (sourceCities.length === 0 && targetCities.length === 0) return false
  if (target.city && sourceCities.includes(target.city.toLowerCase())) return true
  if (source.city && targetCities.includes(source.city.toLowerCase())) return true
  return sourceCities.some(c => targetCities.includes(c))
}

export const calculateBetweenScore = async (
  source: BetweenScoreProfileInput,
  target: BetweenScoreProfileInput,
  weightsOverride?: BetweenScoreWeights
): Promise<BetweenScoreResult> => {
  const weights = weightsOverride || await getActiveWeights()

  const paceBoundaries = (p: BetweenScoreProfileInput): BetweenScoreBoundaryInput[] => p.boundaries.filter(isConversationPace)
  const otherBoundaries = (p: BetweenScoreProfileInput): BetweenScoreBoundaryInput[] => p.boundaries.filter(b => !isConversationPace(b))

  const intentionResult = evaluateIntentionCompatibility(source.intentions, target.intentions)
  const intentionResultRev = evaluateIntentionCompatibility(target.intentions, source.intentions)
  const boundaryResult = evaluateBoundaryCompatibility(otherBoundaries(source), otherBoundaries(target))
  const boundaryResultRev = evaluateBoundaryCompatibility(otherBoundaries(target), otherBoundaries(source))
  const paceResult = evaluateBoundaryCompatibility(paceBoundaries(source), paceBoundaries(target))

  const zeroBreakdown = (): Record<keyof BetweenScoreWeights, BreakdownEntry> => ({
    intentions:           { score: 0, weight: weights.intentions },
    boundaries:           { score: 0, weight: weights.boundaries },
    relationshipContext:  { score: 0, weight: weights.relationshipContext },
    discretion:           { score: 0, weight: weights.discretion },
    location:             { score: 0, weight: weights.location },
    conversationPace:     { score: 0, weight: weights.conversationPace },
  })

  // Hard conflict (either direction) -> not eligible, no score computed.
  // This must stay consistent with DiscoveryService's own eligibility gate
  // (5.3), which excludes these candidates before scoring is ever reached —
  // this check here is defense-in-depth, not the primary gate.
  if (!intentionResult.compatible || !intentionResultRev.compatible || !boundaryResult.compatible || !boundaryResultRev.compatible) {
    return { eligible: false, score: 0, algorithmVersion: ALGORITHM_VERSION, breakdown: zeroBreakdown(), reasonCodes: [] }
  }

  const travelOverlap = travelOverlaps(source, target)
  const locationScoreValue = travelOverlap ? 100 : baseLocationScore(source, target)

  const breakdown: Record<keyof BetweenScoreWeights, BreakdownEntry> = {
    intentions:          { score: intentionResult.score, weight: weights.intentions },
    boundaries:          { score: boundaryResult.score, weight: weights.boundaries },
    relationshipContext: { score: relationshipContextScore(source.relationshipStatus, target.relationshipStatus), weight: weights.relationshipContext },
    discretion:          { score: discretionScore(source.discretionLevel, target.discretionLevel), weight: weights.discretion },
    location:            { score: locationScoreValue, weight: weights.location },
    conversationPace:    { score: paceResult.hardConflicts.length > 0 ? 20 : (paceBoundaries(source).length === 0 || paceBoundaries(target).length === 0 ? 60 : paceResult.score), weight: weights.conversationPace },
  }

  const finalScore = Math.round(
    Object.values(breakdown).reduce((sum, entry) => sum + entry.score * entry.weight, 0)
  )

  const reasonCodes: BetweenScoreReasonCode[] = []
  if (intentionResult.matches.length > 0) reasonCodes.push('INTENTIONS_ALIGNED')
  if (boundaryResult.commonYes.length >= 2) reasonCodes.push('BOUNDARIES_ALIGNED')
  if (breakdown.discretion.score === 100) reasonCodes.push('SIMILAR_DISCRETION')
  if (breakdown.conversationPace.score >= 80) reasonCodes.push('COMPATIBLE_PACE')
  const bothOpenToMeeting = otherBoundaries(source).some(b => b.slug === 'open_to_meeting' && b.preference === 'YES')
    && otherBoundaries(target).some(b => b.slug === 'open_to_meeting' && b.preference === 'YES')
  if (bothOpenToMeeting) reasonCodes.push('BOTH_OPEN_TO_MEETING')
  if (travelOverlap) reasonCodes.push('TRAVEL_OVERLAP')

  return {
    eligible: true,
    score: Math.max(0, Math.min(100, finalScore)),
    algorithmVersion: ALGORITHM_VERSION,
    breakdown,
    reasonCodes,
  }
}
