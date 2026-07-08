/**
 * 3.6 — Hard delete job runner. Run in Railway's Console tab, e.g.:
 *
 *   npm run hard-delete -- --dry-run
 *   npm run hard-delete -- --run
 *
 * --dry-run (default if no flag given) reports what WOULD happen without
 * touching anything. --run actually deletes. See lib/hardDeleteJob.ts for
 * exactly what this does and why (grace period, non-cascading FKs, R2
 * cleanup, idempotency).
 *
 * Deliberately NOT wired into an automatic cron — hard-deleting user data
 * is irreversible, and this project doesn't have another job (like
 * safetyAlertCron) that touches destructive/irreversible operations
 * unattended. Run this manually (or from the admin UI — see
 * admin.ts GET/POST /gdpr/hard-delete) until there's a deliberate decision
 * to automate it.
 */
import { runHardDeleteJob } from '../lib/hardDeleteJob'

async function main() {
  const dryRun = !process.argv.includes('--run')

  console.log(`[HARD DELETE] ${dryRun ? 'DRY RUN' : 'LIVE RUN'} starting...`)
  const results = await runHardDeleteJob(dryRun)

  if (results.length === 0) {
    console.log('[HARD DELETE] No users past the grace period. Nothing to do.')
    process.exit(0)
  }

  for (const r of results) {
    if (r.skipped) {
      console.log(`[HARD DELETE] SKIPPED ${r.email} (${r.userId}) — ${r.reason}`)
    } else {
      console.log(`[HARD DELETE] ${dryRun ? 'WOULD DELETE' : 'DELETED'} ${r.email} (${r.userId}) — ${r.mediaKeysRemoved} media file(s), ${r.roomMessagesRemoved} room message(s), ${r.reportsAnonymised} report(s) anonymised, ${r.adminActionsAnonymised} admin action(s) anonymised, ${r.betaInviteUsageAnonymised} beta invite usage anonymised`)
    }
  }

  const deleted = results.filter(r => !r.skipped).length
  const skipped = results.filter(r => r.skipped).length
  console.log(`[HARD DELETE] Done. ${deleted} ${dryRun ? 'would be deleted' : 'deleted'}, ${skipped} skipped.`)
  process.exit(0)
}

main().catch(err => { console.error('[HARD DELETE] Failed:', err); process.exit(1) })
