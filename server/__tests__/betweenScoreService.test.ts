// 5.12 — BetweenScoreService (5.6): score deterministic, algorithmVersion
// present, hard conflict -> not eligible. Passes an explicit weightsOverride
// so this never touches the DB (getActiveWeights would otherwise query
// BetweenScoreConfig) - keeps this suite pure-function-fast.
import { calculateBetweenScore, type BetweenScoreProfileInput } from '../src/lib/betweenScoreService'
import { ALGORITHM_VERSION, type BetweenScoreWeights } from '../src/lib/betweenScoreConfigService'

const weights: BetweenScoreWeights = {
  intentions: 0.30, boundaries: 0.30, relationshipContext: 0.15,
  discretion: 0.10, location: 0.10, conversationPace: 0.05,
}

const baseProfile = (overrides: Partial<BetweenScoreProfileInput> = {}): BetweenScoreProfileInput => ({
  id: 'profile-a',
  relationshipStatus: 'SINGLE',
  discretionLevel: 'SELECTIVE',
  city: 'Lisboa',
  locationLat: null,
  locationLng: null,
  intentions: [],
  boundaries: [],
  ...overrides,
})

describe('calculateBetweenScore', () => {
  it('is deterministic — identical inputs produce identical output', async () => {
    const a = baseProfile({ id: 'a', intentions: [{ slug: 'casual_encounter', preference: 'YES' }] })
    const b = baseProfile({ id: 'b', intentions: [{ slug: 'casual_encounter', preference: 'YES' }] })
    const first = await calculateBetweenScore(a, b, weights)
    const second = await calculateBetweenScore(a, b, weights)
    expect(second).toEqual(first)
  })

  it('always reports the current algorithmVersion', async () => {
    const a = baseProfile({ id: 'a' })
    const b = baseProfile({ id: 'b' })
    const result = await calculateBetweenScore(a, b, weights)
    expect(result.algorithmVersion).toBe(ALGORITHM_VERSION)
  })

  it('a hard boundary conflict makes the pair not eligible, with a zero score', async () => {
    const a = baseProfile({ id: 'a', boundaries: [{ slug: 'no_couples', preference: 'NO', isHardBoundary: true, ruleType: 'MUTUAL_ALIGNMENT' }] })
    const b = baseProfile({ id: 'b', boundaries: [{ slug: 'no_couples', preference: 'YES', isHardBoundary: true, ruleType: 'MUTUAL_ALIGNMENT' }] })
    const result = await calculateBetweenScore(a, b, weights)
    expect(result.eligible).toBe(false)
    expect(result.score).toBe(0)
  })

  it('an intention conflict (explicit NO) also makes the pair not eligible', async () => {
    const a = baseProfile({ id: 'a', intentions: [{ slug: 'polyamory', preference: 'YES' }] })
    const b = baseProfile({ id: 'b', intentions: [{ slug: 'polyamory', preference: 'NO' }] })
    const result = await calculateBetweenScore(a, b, weights)
    expect(result.eligible).toBe(false)
  })

  it('conversationPace is scored from conversation_style boundaries only, separate from the general boundaries bucket', async () => {
    const a = baseProfile({ id: 'a', boundaries: [
      { slug: 'slow_pace', preference: 'YES', isHardBoundary: false, ruleType: 'PERSONAL_PREFERENCE', category: 'conversation_style' },
      { slug: 'no_couples', preference: 'YES', isHardBoundary: false, ruleType: 'MUTUAL_ALIGNMENT', category: 'relationship_type' },
    ]})
    const b = baseProfile({ id: 'b', boundaries: [
      { slug: 'slow_pace', preference: 'YES', isHardBoundary: false, ruleType: 'PERSONAL_PREFERENCE', category: 'conversation_style' },
      { slug: 'no_couples', preference: 'YES', isHardBoundary: false, ruleType: 'MUTUAL_ALIGNMENT', category: 'relationship_type' },
    ]})
    const result = await calculateBetweenScore(a, b, weights)
    expect(result.eligible).toBe(true)
    expect(result.reasonCodes).toContain('COMPATIBLE_PACE')
    // the shared "no_couples" YES/YES should count toward "boundaries", not conversationPace
    expect(result.breakdown.boundaries.score).toBeGreaterThan(0)
  })

  it('travel overlap boosts location to 100 and surfaces TRAVEL_OVERLAP', async () => {
    const a = baseProfile({ id: 'a', city: 'Lisboa' })
    const b = baseProfile({ id: 'b', city: 'Porto', activeTravelCities: ['Lisboa'] })
    const result = await calculateBetweenScore(a, b, weights)
    expect(result.breakdown.location.score).toBe(100)
    expect(result.reasonCodes).toContain('TRAVEL_OVERLAP')
  })
})
