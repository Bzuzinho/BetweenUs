import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.on('error', (err) => console.error('[REDIS] Error:', err))
redis.on('connect', () => console.log('[REDIS] Connected'))

export const connectRedis = async () => {
  if (!redis.isOpen) await redis.connect()
  return redis
}

export default redis
