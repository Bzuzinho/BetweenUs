// Closed Beta audit (FASE 2.7) — none of the in-process interval jobs
// (safetyCheckinJobs.ts, cleanupExpiredMessages.ts, expireConsentChecks.ts,
// recommendationLogCleanupJob.ts) had any protection against running
// concurrently on more than one server instance. Today's Railway config is
// single-instance (server/railway.json has no numReplicas/scale field), so
// this has no live effect yet — but it's a silent landmine the moment
// horizontal scale-out or a rolling-restart overlap ever happens, and the
// worst offender (safetyCheckinJobs' escalation step) sends a real email to
// a user's trust contact — a duplicate isn't just wasted work, it's a
// confusing/alarming double alert to a real person.
//
// Redis-backed SET NX EX lock — the simplest correct primitive for "at
// most one instance runs this at a time", reusing the same redis client
// (lib/redis.ts) already used for refresh-token/OTP storage rather than
// introducing a new dependency.
import redis, { connectRedis } from './redis'

// Runs `fn` only if the lock is acquired; returns whether it ran. Fails
// OPEN (runs `fn` anyway) if Redis itself is unreachable — a missed lock
// on today's single-instance deploy has zero effect, and safety-critical
// jobs (safety check-in alerts) should not silently stop running just
// because Redis had a blip, matching the existing best-effort Redis
// fallback pattern used elsewhere in this codebase (e.g. refresh token
// storage in routes/auth.ts).
export const withDistributedLock = async (
  key: string,
  ttlSeconds: number,
  fn: () => Promise<void>
): Promise<boolean> => {
  const lockKey = `lock:${key}`
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    await connectRedis()
    const acquired = await redis.set(lockKey, token, { NX: true, EX: ttlSeconds })
    if (!acquired) return false // another instance is already running this job

    try {
      await fn()
    } finally {
      // Best-effort release (only if we still own it — avoids releasing a
      // lock some other instance already re-acquired after our TTL
      // expired mid-run). The TTL itself is the real safety net.
      try {
        const current = await redis.get(lockKey)
        if (current === token) await redis.del(lockKey)
      } catch { /* TTL will expire it regardless */ }
    }
    return true
  } catch (err: any) {
    console.error(`[DISTRIBUTED LOCK] ${key}: Redis unavailable, running without a lock —`, err.message)
    await fn()
    return true
  }
}
