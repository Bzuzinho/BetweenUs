import { captureError } from './sentry'
import prisma from './prisma'
import { sendSafetyAlertEmail } from './email'

const CHECK_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const OVERDUE_AFTER_MS = Number(process.env.SAFETY_ALERT_OVERDUE_HOURS || 3) * 60 * 60 * 1000

async function checkOverdueSafetyCheckins() {
  try {
    const overdueBefore = new Date(Date.now() - OVERDUE_AFTER_MS)

    const overdue = await (prisma as any).safetyCheckin.findMany({
      where: {
        scheduledAt: { lt: overdueBefore },
        confirmedAt: null,
        cancelledAt: null,
        alertSent: false,
        safetyEmail: { not: null },
      }
    })

    for (const checkin of overdue) {
      try {
        await sendSafetyAlertEmail(checkin.safetyEmail, {
          scheduledAt: checkin.scheduledAt,
          locationHint: checkin.locationHint,
        })
        await (prisma as any).safetyCheckin.update({
          where: { id: checkin.id },
          data: { alertSent: true }
        })
        console.log(`[SAFETY CRON] Alert sent for checkin ${checkin.id}`)
      } catch (err: any) {
        captureError(err, { job: 'safetyAlertCron', checkinId: checkin.id })
      }
    }
  } catch (err: any) {
    captureError(err, { job: 'safetyAlertCron', stage: 'query' })
  }
}

export function startSafetyAlertCron() {
  console.log(`[SAFETY CRON] Started — checking every ${CHECK_INTERVAL_MS / 60000} min, alert after ${OVERDUE_AFTER_MS / 3600000}h overdue`)
  checkOverdueSafetyCheckins()
  setInterval(checkOverdueSafetyCheckins, CHECK_INTERVAL_MS)
}
