import prisma from './prisma'

// ─── Create DB notification ────────────────────────────────────────────────────
const createNotification = async (
  userId: string, type: string, title: string, body: string, data?: Record<string,any>
) => {
  try {
    await (prisma as any).notification.create({
      data: { userId, type, title, body, data: data ? JSON.stringify(data) : null }
    })
  } catch (err: any) {
    console.error('[NOTIFY CREATE]', err.message)
  }
}

// ─── Send Web Push ─────────────────────────────────────────────────────────────
const sendPush = async (userIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) => {
  try {
    const subs = await (prisma as any).pushSubscription.findMany({
      where: { userId: { in: userIds } }
    })
    if (!subs?.length) return

    const { pushToUsers } = await import('./webpush')
    await pushToUsers(userIds, { ...payload, icon: '/apple-touch-icon.png' })
  } catch (err: any) {
    console.error('[PUSH]', err.message)
  }
}

// ─── Notify all admins ────────────────────────────────────────────────────────
export const notifyAdmins = async (
  type: string, title: string, body: string,
  data?: Record<string,any>, excludeUserId?: string
) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        adminRole: { in: ['SUPER_ADMIN','ADMIN'] },
        status: 'ACTIVE',
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {})
      },
      select: { id: true }
    })
    if (!admins.length) return
    const adminIds = admins.map((a: { id: string }) => a.id)

    // Create DB notifications for bell
    await Promise.all(adminIds.map((userId: string) =>
      createNotification(userId, type, title, body, data)
    ))

    // Send push
    await sendPush(adminIds, { title, body, url: '/admin', tag: type })

    console.log(`[NOTIFY] ${type} → ${adminIds.length} admins`)
  } catch (err: any) {
    console.error('[NOTIFY ADMINS]', err.message)
  }
}

// ─── Notify a specific user ────────────────────────────────────────────────────
export const notifyUser = async (
  userId: string, type: string, title: string, body: string, data?: Record<string,any>
) => {
  try {
    await createNotification(userId, type, title, body, data)
    await sendPush([userId], { title, body, url: data?.tab ? `/${data.tab}` : '/', tag: type })
    console.log(`[NOTIFY USER] ${type} → ${userId}`)
  } catch (err: any) {
    console.error('[NOTIFY USER]', err.message)
  }
}
