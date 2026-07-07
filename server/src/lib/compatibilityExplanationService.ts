// 5.7 — CompatibilityExplanationService: turns BetweenScoreService's
// reasonCodes into copy, from a fixed allow-list only. This is the layer
// that enforces "never reveal a specific sensitive boundary, private
// interest, or a preference marked private" - it has no access to the raw
// boundary/intention data at all, only the reasonCodes array, so there's
// nothing here that COULD leak a specific selection even by mistake.
import { countAlignedPrivateInterests } from './privateInterestService'
import type { BetweenScoreReasonCode } from './betweenScoreService'

// Fixed allow-list, verbatim from the spec. Do not add a new phrase here
// without also asking "could this ever be reconstructed into a specific
// boundary/intention/private-interest selection?" - if yes, it doesn't
// belong in this list.
const REASON_COPY: Record<BetweenScoreReasonCode, string> = {
  INTENTIONS_ALIGNED:    'Looking for a similar dynamic',
  BOUNDARIES_ALIGNED:    'Your limits are strongly aligned',
  SIMILAR_DISCRETION:    'Similar level of discretion',
  COMPATIBLE_PACE:       'Compatible conversation pace',
  BOTH_OPEN_TO_MEETING:  'Both open to meeting',
  TRAVEL_OVERLAP:        'Travel plans overlap',
}

export const explainReasonCodes = (reasonCodes: BetweenScoreReasonCode[]): string[] =>
  reasonCodes.map(code => REASON_COPY[code]).filter(Boolean)

// Private interests are NOT part of BetweenScoreService's weighted score or
// reasonCodes at all (4.8 already forbids exposing them anywhere but an
// aggregate count) - this appends the one sanctioned aggregate line
// ("N private compatibility signals aligned") as a fully separate signal,
// never mixed into the weighted breakdown.
export const explainPrivateInterestAlignment = async (
  sourceProfileId: string,
  targetProfileId: string
): Promise<string | null> => {
  const count = await countAlignedPrivateInterests(sourceProfileId, targetProfileId)
  return count > 0 ? `${count} private compatibility signals aligned` : null
}

// Convenience: the full explanation list a discovery card would show,
// combining the fixed reason phrases with the private-interest aggregate
// line if there is one.
export const buildExplanation = async (
  reasonCodes: BetweenScoreReasonCode[],
  sourceProfileId: string,
  targetProfileId: string
): Promise<string[]> => {
  const reasons = explainReasonCodes(reasonCodes)
  const privateLine = await explainPrivateInterestAlignment(sourceProfileId, targetProfileId)
  return privateLine ? [...reasons, privateLine] : reasons
}
