export const REPORT_STATUSES = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED', 'ESCALATED']

export const REPORT_TIERS = ['MAXIMUM', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW', 'MINIMAL', 'NONE']

export const reportTierForPriority = priority => {
  if (priority >= 10) return 'MAXIMUM'
  if (priority >= 8) return 'HIGH'
  if (priority >= 7) return 'ELEVATED'
  if (priority >= 5) return 'MODERATE'
  if (priority >= 3) return 'LOW'
  if (priority >= 1) return 'MINIMAL'
  return 'NONE'
}
