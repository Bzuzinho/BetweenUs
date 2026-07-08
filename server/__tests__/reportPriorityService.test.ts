// 9.13 — pure rule-engine tests, no DB needed.
import { computeReportPriority } from '../src/lib/reportPriorityService'

describe('reportPriorityService', () => {
  it.each(['MINOR', 'THREAT', 'NON_CONSENSUAL_IMAGE', 'REVENGE_PORN', 'DOXXING'] as const)(
    '%s is máxima priority (10)', (reason) => {
      const { priority, tier } = computeReportPriority({ reason })
      expect(priority).toBe(10)
      expect(tier).toBe('MAXIMUM')
    }
  )

  it('COERCION is alta (high) priority, below máxima', () => {
    const { priority, tier } = computeReportPriority({ reason: 'COERCION' })
    expect(priority).toBe(8)
    expect(tier).toBe('HIGH')
    expect(priority).toBeLessThan(10)
  })

  it('recidivism bumps a low-tier reason up to at least HIGH', () => {
    const withoutHistory = computeReportPriority({ reason: 'SPAM' })
    expect(withoutHistory.priority).toBeLessThan(8)

    const withHistory = computeReportPriority({ reason: 'SPAM', openReportCountForTarget: 3 })
    expect(withHistory.priority).toBeGreaterThanOrEqual(8)
  })

  it('recidivism never LOWERS an already-máxima reason', () => {
    const { priority } = computeReportPriority({ reason: 'THREAT', openReportCountForTarget: 0 })
    expect(priority).toBe(10)
  })
})
