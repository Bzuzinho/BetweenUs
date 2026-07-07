// 4.11 — IntentionCompatibilityService (4.6): compatible, NO conflict,
// inactive-option handling. Pure function, no DB needed.
import { evaluateIntentionCompatibility, type ProfileIntentionInput } from '../src/lib/intentionCompatibilityService'

describe('evaluateIntentionCompatibility', () => {
  it('direct match: both YES on the same slug is compatible with a positive score', () => {
    const a: ProfileIntentionInput[] = [{ slug: 'casual_encounter', preference: 'YES' }]
    const b: ProfileIntentionInput[] = [{ slug: 'casual_encounter', preference: 'YES' }]
    const result = evaluateIntentionCompatibility(a, b)
    expect(result.compatible).toBe(true)
    expect(result.matches).toContain('casual_encounter')
    expect(result.score).toBeGreaterThan(0)
  })

  it('complementary match: a couple seek_third YES matches an individual seek_couple YES', () => {
    const couple: ProfileIntentionInput[] = [{ slug: 'seek_third', preference: 'YES', complementarySlug: 'seek_couple' }]
    const individual: ProfileIntentionInput[] = [{ slug: 'seek_couple', preference: 'YES' }]
    const result = evaluateIntentionCompatibility(couple, individual)
    expect(result.compatible).toBe(true)
    expect(result.matches).toContain('seek_third')
  })

  it('spec example: couple YES seek_third + individual explicit NO seek_couple is a conflict', () => {
    const couple: ProfileIntentionInput[] = [{ slug: 'seek_third', preference: 'YES', complementarySlug: 'seek_couple' }]
    const individual: ProfileIntentionInput[] = [{ slug: 'seek_couple', preference: 'NO' }]
    const result = evaluateIntentionCompatibility(couple, individual)
    expect(result.compatible).toBe(false)
    expect(result.conflicts).toContain('seek_third')
  })

  it('direct NO conflict: A wants it, B explicitly does not', () => {
    const a: ProfileIntentionInput[] = [{ slug: 'polyamory', preference: 'YES' }]
    const b: ProfileIntentionInput[] = [{ slug: 'polyamory', preference: 'NO' }]
    const result = evaluateIntentionCompatibility(a, b)
    expect(result.compatible).toBe(false)
    expect(result.conflicts).toContain('polyamory')
  })

  it('an intention neither side selected at all (e.g. deactivated in the catalog) contributes nothing', () => {
    // Inactive catalog options are filtered out before reaching this
    // service (catalog.ts only returns active:true), so a slug that
    // simply never appears in either profile's list behaves the same as
    // one that was deactivated — no match, no conflict either way.
    const a: ProfileIntentionInput[] = [{ slug: 'still_exploring', preference: 'YES' }]
    const b: ProfileIntentionInput[] = []
    const result = evaluateIntentionCompatibility(a, b)
    expect(result.compatible).toBe(true)
    expect(result.matches).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
    expect(result.score).toBe(0)
  })
})
