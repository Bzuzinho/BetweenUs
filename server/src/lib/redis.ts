import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

// Closed Beta audit (FASE 3.10) — logged the full error object (could
// include the connection string/URL for some redis-client error types);
// every other error log in the codebase logs err.message only. No secret
// was confirmed leaking in practice, but this brings it in line with the
// rest of the codebase's logging discipline rather than being the one
// place that logs a raw error object.
redis.on('error', (err) => console.error('[REDIS] Error:', err?.message || err))
redis.on('connect', () => console.log('[REDIS] Connected'))

export const connectRedis = async () => {
  if (!redis.isOpen) await redis.connect()
  return redis
}

export default redis
