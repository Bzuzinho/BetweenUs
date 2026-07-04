import prisma from './prisma'

// Notify all admin users (SUPER_ADMIN, ADMIN) about an event
export const notifyAdmins = async (
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  excludeUserId?: string
) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        adminRole: { in: ['SUPER_ADMIN', 'ADMIN'] },
        status: 'ACTIVE',
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true }
    })

    if (!admins.length) return

    await (prisma as any).notification.createMany({
      data: admins.map(a => ({
        userId:    a.id,
        type,
        title,
        body,
        data:      data ? JSON.stringify(data) : null,
      }))
    })

    console.log(`[NOTIFY] ${type} → ${admins.length} admins: ${title}`)
  } catch (err: any) {
    console.error('[NOTIFY] Failed:', err.message)
  }
}

// Notify a specific user
export const notifyUser = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  try {
    await (prisma as any).notification.create({
      data: { userId, type, title, body, data: data ? JSON.stringify(data) : null }
    })
  } catch (err: any) {
    console.error('[NOTIFY USER] Failed:', err.message)
  }
}
