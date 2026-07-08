// 11.14 — stable cohort assignment (11.12): same (experimentKey, profileId)
// always maps to the same cohort, including across repeated calls (no
// hidden mutable state) and regardless of call order.
import { assignCohort, EXPERIMENT_KEY } from '../src/lib/recommendationAbTestService'

describe('RecommendationAbTestService — stable assignment', () => {
  it('the same profileId always resolves to the same cohort', () => {
    const id = 'stable-profile-id-123'
    const first = assignCohort(id)
    for (let i = 0; i < 20; i++) {
      expect(assignCohort(id)).toBe(first)
    }
  })

  it('different profileIds are not all forced into the same cohort (both cohorts reachable)', () => {
    const cohorts = new Set<string>()
    for (let i = 0; i < 500; i++) {
      cohorts.add(assignCohort(`profile-${i}`))
    }
    expect(cohorts.has('CONTROL')).toBe(true)
    expect(cohorts.has('RECOMMENDATION_V1')).toBe(true)
  })

  it('a different experimentKey can assign the same profileId to a different cohort (namespaced, not global per-profile)', () => {
    const id = 'namespace-test-profile'
    const resultsByKey = new Map<string, string>()
    resultsByKey.set(EXPERIMENT_KEY, assignCohort(id, EXPERIMENT_KEY))
    resultsByKey.set('SOME_OTHER_EXPERIMENT', assignCohort(id, 'SOME_OTHER_EXPERIMENT'))
    // Not asserting they differ (could coincide) — just that each key's
    // result is independently stable.
    expect(assignCohort(id, EXPERIMENT_KEY)).toBe(resultsByKey.get(EXPERIMENT_KEY))
    expect(assignCohort(id, 'SOME_OTHER_EXPERIMENT')).toBe(resultsByKey.get('SOME_OTHER_EXPERIMENT'))
  })

  it('roughly balances 50/50 over a large sample (not skewed to one cohort)', () => {
    let v1 = 0
    const total = 1000
    for (let i = 0; i < total; i++) {
      if (assignCohort(`balance-${i}`) === 'RECOMMENDATION_V1') v1++
    }
    const ratio = v1 / total
    expect(ratio).toBeGreaterThan(0.4)
    expect(ratio).toBeLessThan(0.6)
  })
})
