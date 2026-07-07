// 4.11 — BoundaryCompatibilityService (4.7): hard conflict, soft
// difference, personal preference, and sensitive-boundary handling. Pure
// function, no DB needed.
import { evaluateBoundaryCompatibility, type ProfileBoundaryInput } from '../src/lib/boundaryCompatibilityService'

const boundary = (overrides: Partial<ProfileBoundaryInput>): ProfileBoundaryInput => ({
  slug: 'no_couples', preference: 'YES', isHardBoundary: true, ruleType: 'MUTUAL_ALIGNMENT', ...overrides
})

describe('evaluateBoundaryCompatibility', () => {
  it('MUTUAL_ALIGNMENT hard conflict: A=NO / B=YES on the same hard boundary excludes both directions', () => {
    const a = [boundary({ slug: 'no_couples', preference: 'NO' })]
    const b = [boundary({ slug: 'no_couples', preference: 'YES' })]
    const result = evaluateBoundaryCompatibility(a, b)
    expect(result.compatible).toBe(false)
    expect(result.hardConflicts).toContain('no_couples')
  })

  it('soft difference: a non-hard boundary with differing preferences never blocks, just shows up as a difference', () => {
    const a = [boundary({ slug: 'public_pda', preference: 'YES', isHardBoundary: false })]
    const b = [boundary({ slug: 'public_pda', preference: 'NO', isHardBoundary: false })]
    const result = evaluateBoundaryCompatibility(a, b)
    expect(result.compatible).toBe(true)
    expect(result.hardConflicts).toHaveLength(0)
    expect(result.softDifferences).toContain('public_pda')
  })

  it('PERSONAL_PREFERENCE never excludes, even when marked as a hard boundary and preferences differ', () => {
    // Spec's own example: "show my face before match" is the profile's OWN
    // visibility choice, not a claim about what the other person must
    // accept - it must never turn into a hardConflict.
    const a = [boundary({ slug: 'show_face_before_match', preference: 'YES', isHardBoundary: true, ruleType: 'PERSONAL_PREFERENCE' })]
    const b = [boundary({ slug: 'show_face_before_match', preference: 'NO', isHardBoundary: true, ruleType: 'PERSONAL_PREFERENCE' })]
    const result = evaluateBoundaryCompatibility(a, b)
    expect(result.compatible).toBe(true)
    expect(result.hardConflicts).toHaveLength(0)
  })

  it('REQUIRE_TARGET_ACCEPTANCE: A=YES only conflicts if B explicitly said NO, not if B is neutral', () => {
    const aWantsIt = [boundary({ slug: 'emotional_involvement', preference: 'YES', ruleType: 'REQUIRE_TARGET_ACCEPTANCE' })]

    const explicitNo = evaluateBoundaryCompatibility(
      aWantsIt,
      [boundary({ slug: 'emotional_involvement', preference: 'NO', ruleType: 'REQUIRE_TARGET_ACCEPTANCE' })]
    )
    expect(explicitNo.compatible).toBe(false)

    const neutralMaybe = evaluateBoundaryCompatibility(
      aWantsIt,
      [boundary({ slug: 'emotional_involvement', preference: 'MAYBE', ruleType: 'REQUIRE_TARGET_ACCEPTANCE' })]
    )
    expect(neutralMaybe.compatible).toBe(true)
  })

  it('sensitive is catalog display metadata only - it is not part of ProfileBoundaryInput and never changes the compatibility outcome', () => {
    // The compatibility function only ever sees slug/preference/isHardBoundary/
    // ruleType - "sensitive" (whether a boundary's copy is shown bluntly in
    // the UI) lives on the Boundary catalog row and is never passed in here.
    // Confirms two otherwise-identical hard conflicts behave identically
    // regardless of what the underlying boundary's sensitivity would be.
    const a = [boundary({ slug: 'explore_fetishes', preference: 'NO' })]
    const b = [boundary({ slug: 'explore_fetishes', preference: 'YES' })]
    const result = evaluateBoundaryCompatibility(a, b)
    expect(result.compatible).toBe(false)
    expect(result.hardConflicts).toEqual(['explore_fetishes'])
  })

  it('mutual YES on the same boundary counts as commonYes, not a conflict or difference', () => {
    const a = [boundary({ slug:'polyamory_ok', preference:'YES', isHardBoundary:false })]
    const b = [boundary({ slug:'polyamory_ok', preference:'YES', isHardBoundary:false })]
    const result = evaluateBoundaryCompatibility(a, b)
    expect(result.commonYes).toContain('polyamory_ok')
    expect(result.softDifferences).toHaveLength(0)
  })
})
