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

// ─── Notify every member of a profile ──────────────────────────────────────────
// BETA.4 typecheck fix — Profile.userId is nullable (a COUPLE/GROUP profile
// has no single owner; ownership lives in ProfileMember instead — see
// schema.prisma's Profile.userId comment). Code that notified via
// `profile.user.id` directly (discovery.ts's LIKE_RECORDED case,
// matches.ts's accept-request notification) both failed to typecheck
// under strict null checks AND, at the product level, silently never
// notified a couple/group's non-creator members at all — the same bug
// class BETA.3 fixed for the action routes themselves (discovery.ts's
// like/pass/block, matches.ts's accept/reject), just never caught here on
// the notification side since it doesn't 404 or error, it just quietly
// notifies nobody extra.
//
// Resolves via ProfileMembershipService.getActiveMembers, which already
// covers every case this needs: INDIVIDUAL → the owner, COUPLE/GROUP →
// every ACCEPTED ProfileMember, and a not-yet-backfilled couple → its
// CoupleProfile partner pair. No separate "does this profile even have a
// userId" branch needed here — getActiveMembers already resolves that.
export const getNotificationUserIdsForProfile = async (profileId: string): Promise<string[]> => {
  const { getActiveMembers } = await import('./profileMembershipService')
  const members = await getActiveMembers(profileId)
  return [...new Set(members.map(m => m.userId))]
}

export const notifyProfileMembers = async (
  profileId: string, type: string, title: string, body: string, data?: Record<string,any>
) => {
  const userIds = await getNotificationUserIdsForProfile(profileId)
  // Never blocks the caller's own flow (a like, an accept, etc.) on a
  // notification failure — same posture notifyUser already has for a
  // single user, just applied across the whole fan-out here.
  await Promise.all(userIds.map(userId =>
    notifyUser(userId, type, title, body, data).catch(() => {})
  ))
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
