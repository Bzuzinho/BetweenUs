/**
 * T8: Job to soft-delete messages whose expiresAt has passed.
 *
 * Run this on a schedule (e.g. every hour) in Railway using a separate
 * Railway cron service, or call it from a scheduled function.
 *
 * To test locally: npx ts-node server/src/jobs/cleanupExpiredMessages.ts
 * To run in Railway: add a Cron service pointing to this file.
 */
import prisma from '../lib/prisma'

export const cleanupExpiredMessages = async (): Promise<{ deleted: number }> => {
  const now = new Date()

  const result = await prisma.message.updateMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null
    },
    data: {
      deletedAt: now,
      body: '[Mensagem expirada]'
    }
  })

  console.log(`[CLEANUP] Soft-deleted ${result.count} expired messages at ${now.toISOString()}`)
  return { deleted: result.count }
}

// Allow running directly
if (require.main === module) {
  cleanupExpiredMessages()
    .then(r => { console.log('Done:', r); process.exit(0) })
    .catch(e => { console.error('Error:', e.message); process.exit(1) })
}
