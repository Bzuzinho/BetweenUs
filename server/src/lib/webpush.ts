// Between Us — Web Push via web-push npm package
import prisma from './prisma'

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BLSayTEUWhVEb-QdJSClF_6SIZQX8sfxvwEGPnfF-cxDtVepyPjuPXzIb2BkhsfogR-JbJFBa7aHUvwSyXxGg9Y'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'AmCcnlYcjOHBkJmnkDB_d0oHK6FJdNzwqAbi-Pl2tB4'
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     || 'mailto:admin@betweenus.app'

let webpush: any = null

const getWebPush = async () => {
  if (webpush) return webpush
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

export const VAPID_PUBLIC_KEY = VAPID_PUBLIC
