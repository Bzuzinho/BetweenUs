// Discovery validation follow-up — CandidateConstraintService: pure unit
// tests, no DB. Covers the 9 required cases plus the documented GROUP
// handling decision (COUPLES_ONLY/INDIVIDUALS_ONLY exclude GROUP,
// EXCLUDE_COUPLES does not — see candidateConstraintService.ts's header
// comment).
import { evaluateCandidateConstraints, type ConstraintBoundaryInput } from '../src/lib/candidateConstraintService'

const boundary = (constraintType: ConstraintBoundaryInput['constraintType'], preference: ConstraintBoundaryInput['preference'] = 'YES'): ConstraintBoundaryInput[] => [
  { slug: 'test_boundary', preference, ruleType: 'CANDIDATE_CONSTRAINT', constraintType },
]

describe('CandidateConstraintService — no_couples / EXCLUDE_COUPLES', () => {
  it('1. no_couples YES + COUPLE -> incompatible', () => {
    const result = evaluateCandidateConstraints(boundary('EXCLUDE_COUPLES', 'YES'), { profileType: 'COUPLE', isVerified: true })
    expect(result.compatible).toBe(false)
    expect(result.conflicts[0].code).toBe('EXCLUDE_COUPLES')
  })

  it('2. no_couples MAYBE + COUPLE -> allowed (only an explicit YES asserts the filter)', () => {
    const result = evaluateCandidateConstraints(boundary('EXCLUDE_COUPLES', 'MAYBE'), { profileType: 'COUPLE', isVerified: true })
    expect(result.compatible).toBe(true)
  })

  it('3. no_couples NO + COUPLE -> allowed (explicit NO means "I don\'t mind couples", never excludes)', () => {
    const result = evaluateCandidateConstraints(boundary('EXCLUDE_COUPLES', 'NO'), { profileType: 'COUPLE', isVerified: true })
    expect(result.compatible).toBe(true)
  })

  it('EXCLUDE_COUPLES does not exclude GROUP (documented decision — only COUPLE is excluded)', () => {
    const result = evaluateCandidateConstraints(boundary('EXCLUDE_COUPLES', 'YES'), { profileType: 'GROUP', isVerified: true })
    expect(result.compatible).toBe(true)
  })
})

describe('CandidateConstraintService — singles_only / INDIVIDUALS_ONLY', () => {
  it('4. singles_only YES + INDIVIDUAL -> allowed', () => {
    const result = evaluateCandidateConstraints(boundary('INDIVIDUALS_ONLY'), { profileType: 'INDIVIDUAL', isVerified: true })
    expect(result.compatible).toBe(true)
  })

  it('5. singles_only YES + COUPLE -> excluded', () => {
    const result = evaluateCandidateConstraints(boundary('INDIVIDUALS_ONLY'), { profileType: 'COUPLE', isVerified: true })
    expect(result.compatible).toBe(false)
    expect(result.conflicts[0].code).toBe('INDIVIDUALS_ONLY')
  })

  it('INDIVIDUALS_ONLY also excludes GROUP (documented decision — literal "apenas solteiros" reading)', () => {
    const result = evaluateCandidateConstraints(boundary('INDIVIDUALS_ONLY'), { profileType: 'GROUP', isVerified: true })
    expect(result.compatible).toBe(false)
  })
})

describe('CandidateConstraintService — couples_only / COUPLES_ONLY', () => {
  it('6. couples_only YES + COUPLE -> allowed', () => {
    const result = evaluateCandidateConstraints(boundary('COUPLES_ONLY'), { profileType: 'COUPLE', isVerified: true })
    expect(result.compatible).toBe(true)
  })

  it('7. couples_only YES + INDIVIDUAL -> excluded', () => {
    const result = evaluateCandidateConstraints(boundary('COUPLES_ONLY'), { profileType: 'INDIVIDUAL', isVerified: true })
    expect(result.compatible).toBe(false)
    expect(result.conflicts[0].code).toBe('COUPLES_ONLY')
  })

  it('COUPLES_ONLY also excludes GROUP (documented decision — literal "apenas casais" reading)', () => {
    const result = evaluateCandidateConstraints(boundary('COUPLES_ONLY'), { profileType: 'GROUP', isVerified: true })
    expect(result.compatible).toBe(false)
  })
})

describe('CandidateConstraintService — verified_only / VERIFIED_ONLY', () => {
  it('8. verified_only YES + verified candidate -> allowed', () => {
    const result = evaluateCandidateConstraints(boundary('VERIFIED_ONLY'), { profileType: 'INDIVIDUAL', isVerified: true })
    expect(result.compatible).toBe(true)
  })

  it('9. verified_only YES + unverified candidate -> excluded', () => {
    const result = evaluateCandidateConstraints(boundary('VERIFIED_ONLY'), { profileType: 'INDIVIDUAL', isVerified: false })
    expect(result.compatible).toBe(false)
    expect(result.conflicts[0].code).toBe('VERIFIED_ONLY')
  })

  it('profile type is irrelevant to VERIFIED_ONLY — a verified COUPLE also passes', () => {
    const result = evaluateCandidateConstraints(boundary('VERIFIED_ONLY'), { profileType: 'COUPLE', isVerified: true })
    expect(result.compatible).toBe(true)
  })
})

describe('CandidateConstraintService — malformed data fails open, never crashes', () => {
  it('a CANDIDATE_CONSTRAINT boundary with no constraintType is ignored, not treated as a conflict', () => {
    const result = evaluateCandidateConstraints(
      [{ slug: 'broken', preference: 'YES', ruleType: 'CANDIDATE_CONSTRAINT', constraintType: null }],
      { profileType: 'COUPLE', isVerified: true }
    )
    expect(result.compatible).toBe(true)
  })

  it('a non-CANDIDATE_CONSTRAINT boundary is never evaluated by this service', () => {
    const result = evaluateCandidateConstraints(
      [{ slug: 'talk_first', preference: 'YES', ruleType: 'MUTUAL_ALIGNMENT', constraintType: null }],
      { profileType: 'COUPLE', isVerified: true }
    )
    expect(result.compatible).toBe(true)
  })
})
