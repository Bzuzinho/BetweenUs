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

  // Sistema de localidades — locationId (catálogo GeoNames) tem prioridade
  // sobre a comparação de string legacy. Estes casos cobrem exactamente o
  // bug de homonímia que a comparação por id existe para resolver: duas
  // localidades chamadas "São Pedro" em distritos diferentes.
  describe('sistema de localidades — locationId/coordinates', () => {
    it('same locationId scores location as 100, even when the legacy city text disagrees', async () => {
      const a = baseProfile({ id: 'a', city: 'benedita', locationId: 'geo-1', coordinates: { latitude: 39.4, longitude: -8.98 } })
      const b = baseProfile({ id: 'b', city: 'benedita', locationId: 'geo-1', coordinates: { latitude: 39.4, longitude: -8.98 } })
      const result = await calculateBetweenScore(a, b, weights)
      expect(result.breakdown.location.score).toBe(100)
    })

    it('different locationId with the SAME normalized city text does NOT score as same-city — fixes the homonym bug', async () => {
      // "São Pedro" in two different districts: same normalized city
      // string, different real place. The legacy string-only path would
      // have scored this 100 (false positive); with locationId present on
      // both sides, distance is used instead.
      const a = baseProfile({ id: 'a', city: 'sao pedro', locationId: 'geo-north', coordinates: { latitude: 41.5, longitude: -8.4 } })
      const b = baseProfile({ id: 'b', city: 'sao pedro', locationId: 'geo-south', coordinates: { latitude: 37.0, longitude: -7.9 } }) // ~500km away
      const result = await calculateBetweenScore(a, b, weights)
      expect(result.breakdown.location.score).toBeLessThan(100)
      expect(result.breakdown.location.score).toBeLessThanOrEqual(20) // far apart -> lowest real-distance tier
    })

    it('different locationId, close coordinates (<10km) scores in the top real-distance tier', async () => {
      const a = baseProfile({ id: 'a', city: 'a', locationId: 'geo-a', coordinates: { latitude: 38.7223, longitude: -9.1393 } }) // Lisboa
      const b = baseProfile({ id: 'b', city: 'b', locationId: 'geo-b', coordinates: { latitude: 38.7600, longitude: -9.1600 } }) // ~5km away
      const result = await calculateBetweenScore(a, b, weights)
      expect(result.breakdown.location.score).toBe(95)
    })

    it('a profile without locationId (legacy) never crashes or is penalized against a catalog-based profile — falls back to string/coarse comparison', async () => {
      const a = baseProfile({ id: 'a', city: 'lisboa' }) // legacy, no locationId
      const b = baseProfile({ id: 'b', city: 'lisboa', locationId: 'geo-b', coordinates: { latitude: 38.7223, longitude: -9.1393 } })
      const result = await calculateBetweenScore(a, b, weights)
      // Falls through to the legacy city-string branch (both normalized to "lisboa")
      expect(result.breakdown.location.score).toBe(100)
    })
  })
})
