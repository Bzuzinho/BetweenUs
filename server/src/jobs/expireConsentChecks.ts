/**
 * 8.6: Job to move overdue ConsentCheck rows to EXPIRED. Idempotent —
 * relies entirely on consentCheckService.computeAndCacheStatus, which
 * only transitions a check to EXPIRED once (checks already EXPIRED are
 * skipped by the query, and re-running this against the same overdue
 * check twice is a no-op the second time since its status is already
 * EXPIRED by then).
 *
 * Wired into the server process via startExpireConsentChecksCron() in
 * index.ts (same in-process interval pattern as safetyAlertCron.ts /
 * cleanupExpiredMessages.ts). Still directly runnable standalone below.
 */
import { expireOverdueConsentChecks } from '../lib/consentCheckService'

export const runExpireConsentChecks = async (): Promise<{ expiredCount: number }> => {
  const expiredCount = await expireOverdueConsentChecks()
  console.log(`[EXPIRE CONSENT] Processed ${expiredCount} overdue consent check(s) at ${new Date().toISOString()}`)
  return { expiredCount }
}

const EXPIRE_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export const startExpireConsentChecksCron = (): void => {
  runExpireConsentChecks().catch(e => console.error('[EXPIRE CONSENT CRON]', e.message))
  setInterval(() => {
    runExpireConsentChecks().catch(e => console.error('[EXPIRE CONSENT CRON]', e.message))
  }, EXPIRE_INTERVAL_MS)
  console.log('[EXPIRE CONSENT CRON] Consent check expiration scheduled every 15 minutes.')
}

// Allow running directly (external cron / manual invocation)
if (require.main === module) {
  runExpireConsentChecks()
    .then(r => { console.log('Done:', r); process.exit(0) })
    .catch(e => { console.error('Error:', e.message); process.exit(1) })
}
