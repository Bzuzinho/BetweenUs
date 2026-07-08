// 11.5 — retention job for RecommendationRankingLog. Shadow-mode logging
// can write a row per (viewer, candidate) pair on every discovery request
// while the flag is on — this is diagnostic/analysis data, not an audit
// trail with indefinite-retention requirements the way AdminAction is, so
// it is pruned on a simple age cutoff. Default 90 days: long enough to
// cover a full shadow-mode observation window (11.11's "não ativar
// ranking novo sem período de dados" implies at least weeks, not days) and
// short enough that this table doesn't grow unbounded if shadow mode is
// left on indefinitely.
//
// Same in-process interval pattern as expireConsentChecks.ts — wired into
// index.ts via startRecommendationLogCleanupCron(), also directly
// runnable standalone below.
import prisma from '../lib/prisma'

const RETENTION_DAYS = Number(process.env.RECOMMENDATION_LOG_RETENTION_DAYS || 90)

export const runRecommendationLogCleanup = async (): Promise<{ deletedCount: number }> => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const result = await (prisma as any).recommendationRankingLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  console.log(`[RECOMMENDATION LOG CLEANUP] Removed ${result.count} row(s) older than ${RETENTION_DAYS} days at ${new Date().toISOString()}`)
  return { deletedCount: result.count }
}

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // once a day is plenty for a 90-day retention window

export const startRecommendationLogCleanupCron = (): void => {
  runRecommendationLogCleanup().catch(e => console.error('[RECOMMENDATION LOG CLEANUP CRON]', e.message))
  setInterval(() => {
    runRecommendationLogCleanup().catch(e => console.error('[RECOMMENDATION LOG CLEANUP CRON]', e.message))
  }, CLEANUP_INTERVAL_MS)
  console.log(`[RECOMMENDATION LOG CLEANUP CRON] Scheduled daily, retention ${RETENTION_DAYS} days.`)
}

if (require.main === module) {
  runRecommendationLogCleanup()
    .then(r => { console.log('Done:', r); process.exit(0) })
    .catch(e => { console.error('Error:', e.message); process.exit(1) })
}
