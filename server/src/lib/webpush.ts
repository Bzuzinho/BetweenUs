// Between Us — Web Push via web-push npm package
import prisma from './prisma'

const isProd = process.env.NODE_ENV === 'production'

// Security follow-up — this file previously hardcoded a REAL VAPID key
// pair (both public and private) as `process.env.X || '<real value>'`
// fallbacks, committed to the public repo. VAPID_PUBLIC_KEY being public
// is fine by design (it's meant to ship in client code), but
// VAPID_PRIVATE_KEY must never have had a real-looking fallback in
// source at all — same class of mistake the exposed JWT_SECRET was, just
// smaller blast radius (forged push payloads, not account takeover).
// Now follows the exact fail-hard-in-prod / no-real-value-in-code pattern
// already used by JWT_SECRET (utils/jwt.ts) and CONTACT_HASH_SECRET
// (contactHashService.ts): required in production, and even the dev
// fallback is an obviously-fake placeholder, never a real key.
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@betweenus.app'

let webpush: any = null

const getWebPush = async () => {
  if (webpush) return webpush
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    if (isProd) {
      console.error('[PUSH] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not configured — push notifications disabled.')
    } else {
      console.warn('[PUSH] VAPID keys not set — push disabled in this environment (dev fallback intentionally does not use a real key pair).')
    }
    return null
  }
  try {
    webpush = await import('web-push')
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    console.log('[PUSH] web-push initialised, public key:', VAPID_PUBLIC.slice(0,20) + '...')
  } catch (err: any) {
    console.error('[PUSH] web-push not available:', err.message)
    webpush = null
  }
  return webpush
}

export const pushToUsers = async (
  userIds: string[],
  payload: { title: string; body: string; url?: string; icon?: string; tag?: string }
) => {
  if (!userIds.length) return
  const wp = await getWebPush()
  if (!wp) return

  const subs = await (prisma as any).pushSubscription.findMany({
    where: { userId: { in: userIds } }
  }).catch(() => [])

  if (!subs?.length) {
    console.log('[PUSH] No subscriptions for users:', userIds)
    return
  }

  const expired: string[] = []

  await Promise.all(subs.map(async (sub: any) => {
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, icon: payload.icon || '/apple-touch-icon.png', badge: '/icon-144.png' })
      )
      console.log('[PUSH] ✅ Sent to', sub.endpoint.slice(0,40))
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        expired.push(sub.id)
      } else {
        console.error('[PUSH] ❌ Failed:', err.message)
      }
    }
  }))

  if (expired.length) {
    await (prisma as any).pushSubscription.deleteMany({ where: { id: { in: expired } } }).catch(()=>{})
    console.log('[PUSH] Cleaned', expired.length, 'expired subscriptions')
  }
}

export const pushToAdmins = async (
  payload: { title: string; body: string; url?: string },
  excludeUserId?: string
) => {
  const admins = await prisma.user.findMany({
    where: {
      adminRole: { in: ['SUPER_ADMIN','ADMIN'] },
      status: 'ACTIVE',
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {})
    },
    select: { id: true }
  })
  await pushToUsers(admins.map((a: { id: string }) => a.id), payload)
}

export const VAPID_PUBLIC_KEY = VAPID_PUBLIC || null
