/**
 * 9.6: three distinct jobs replacing the old safetyAlertCron.ts's single
 * combined "detect overdue + send alert" step, each owning exactly one
 * SafetyCheckinStateMachine transition:
 *
 *   safety-checkin-request    — SCHEDULED -> WAITING_CONFIRMATION
 *   safety-checkin-overdue    — WAITING_CONFIRMATION -> OVERDUE
 *   safety-checkin-escalation — OVERDUE -> ESCALATED (+ safety contact email)
 *
 * Same in-process interval pattern as every other job in this codebase
 * (cleanupExpiredMessages.ts, expireConsentChecks.ts) — no in-memory
 * timers per check-in, just periodic idempotent sweeps consistent with
 * the existing cron infrastructure. Each is independently runnable for
 * an external cron too.
 */
import { captureError } from '../lib/sentry'
import {
  runSafetyCheckinRequestJob, runSafetyCheckinOverdueJob, runSafetyCheckinEscalationJob
} from '../lib/safetyCheckinService'

const INTERVAL_MS = 10 * 60 * 1000 // 10 minutes — matches the old safetyAlertCron.ts cadence

const runAll = async () => {
  try {
    const requested = await runSafetyCheckinRequestJob()
    if (requested > 0) console.log(`[SAFETY-CHECKIN-REQUEST] ${requested} check-in(s) moved to WAITING_CONFIRMATION`)
  } catch (err: any) { captureError(err, { job: 'safety-checkin-request' }) }

  try {
    const overdue = await runSafetyCheckinOverdueJob()
    if (overdue > 0) console.log(`[SAFETY-CHECKIN-OVERDUE] ${overdue} check-in(s) moved to OVERDUE`)
  } catch (err: any) { captureError(err, { job: 'safety-checkin-overdue' }) }

  try {
    const escalated = await runSafetyCheckinEscalationJob()
    if (escalated > 0) console.log(`[SAFETY-CHECKIN-ESCALATION] ${escalated} check-in(s) ESCALATED`)
  } catch (err: any) { captureError(err, { job: 'safety-checkin-escalation' }) }
}

export const startSafetyCheckinJobs = (): void => {
  runAll()
  setInterval(runAll, INTERVAL_MS)
  console.log('[SAFETY-CHECKIN JOBS] request/overdue/escalation scheduled every 10 minutes.')
}

// Allow running directly (external cron / manual invocation)
if (require.main === module) {
  runAll().then(() => process.exit(0)).catch(e => { console.error('Error:', e.message); process.exit(1) })
}
