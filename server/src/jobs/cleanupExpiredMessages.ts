/**
 * T8/7.7: Job to soft-delete messages whose expiresAt has passed — now
 * covers BOTH Conversation's Message and Private Room's RoomMessage.
 *
 * 7.7 IMPORTANT: expiring a message here only stops the API from ever
 * returning its real body again (and the client stops rendering it) - it
 * is NOT a guarantee against screenshots, copies, or anything the other
 * person already saw before expiry. Nowhere in the product should this be
 * described as "disappearing" in a way that implies technical enforcement
 * beyond that. See the room UI's own consent/rules copy for the same
 * honesty requirement.
 *
 * Wired into the server process via startRoomMessageCleanupCron() in
 * index.ts (same in-process interval pattern as safetyAlertCron.ts) so it
 * actually runs without depending on a separately-configured Railway cron
 * service existing — this job previously (T8) was written but never
 * wired anywhere, so it never actually ran on any expired Message row in
 * production. Still directly runnable standalone below, for anyone who
 * does want to run it as an external cron instead/also (idempotent either way).
 */
import prisma from '../lib/prisma'

export const cleanupExpiredMessages = async (): Promise<{ deletedMessages: number; deletedRoomMessages: number }> => {
  const now = new Date()

  const messageResult = await prisma.message.updateMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null
    },
    data: {
      deletedAt: now,
      body: '[Mensagem expirada]'
    }
  })

  // 7.6/7.7 — RoomMessage now has the same expiresAt field as Message.
  // body is optional on RoomMessage (IMAGE/SYSTEM carry no text), so an
  // expired IMAGE message is cleared by nulling mediaId instead of writing
  // placeholder text into a field that may have been empty to begin with.
  const roomMessageResult = await (prisma as any).roomMessage.updateMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null
    },
    data: {
      deletedAt: now,
      body: '[Mensagem expirada]',
      mediaId: null,
    }
  })

  console.log(`[CLEANUP] Soft-deleted ${messageResult.count} expired Conversation messages and ${roomMessageResult.count} expired Room messages at ${now.toISOString()}`)
  return { deletedMessages: messageResult.count, deletedRoomMessages: roomMessageResult.count }
}

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export const startRoomMessageCleanupCron = (): void => {
  cleanupExpiredMessages().catch(e => console.error('[CLEANUP CRON]', e.message))
  setInterval(() => {
    cleanupExpiredMessages().catch(e => console.error('[CLEANUP CRON]', e.message))
  }, CLEANUP_INTERVAL_MS)
  console.log('[CLEANUP CRON] Expired message cleanup scheduled every 15 minutes.')
}

// Allow running directly (external cron / manual invocation)
if (require.main === module) {
  cleanupExpiredMessages()
    .then(r => { console.log('Done:', r); process.exit(0) })
    .catch(e => { console.error('Error:', e.message); process.exit(1) })
}
