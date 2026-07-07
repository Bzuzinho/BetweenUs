// 9.5/9.6/9.7 — SafetyCheckin V2: every status write goes through
// canTransitionSafetyCheckin, and the three jobs (9.6) each own exactly
// one transition rather than one job doing detection+alerting in a single
// step like the old safetyAlertCron.ts did.
//
// Flow (9.6): scheduledAt arrives → REQUEST_CONFIRMATION notification →
// grace period 1 (SAFETY_ALERT_OVERDUE_HOURS, kept as the same env var
// name already configured in Railway) with no confirmation → OVERDUE →
// grace period 2 (SAFETY_CHECKIN_ESCALATION_GRACE_HOURS) still
// unconfirmed → ESCALATED → safety contact notified, only if one is
// configured.
import prisma from './prisma'
import { canTransitionSafetyCheckin, SafetyCheckinState } from './safetyCheckinStateMachine'
import { notifyUser } from './notify'
import { getActiveMembers } from './profileMembershipService'
import { sendSafetyAlertEmail } from './email'

export const REQUEST_TO_OVERDUE_HOURS = Number(process.env.SAFETY_ALERT_OVERDUE_HOURS || 3)
export const OVERDUE_TO_ESCALATED_HOURS = Number(process.env.SAFETY_CHECKIN_ESCALATION_GRACE_HOURS || 1)

interface TransitionResult {
  ok: boolean
  error?: string
  checkin?: any
}

const applyTransition = async (checkinId: string, event: Parameters<typeof canTransitionSafetyCheckin>[1], extraData: Record<string, any> = {}): Promise<TransitionResult> => {
  const checkin = await (prisma as any).safetyCheckin.findUnique({ where: { id: checkinId } })
  if (!checkin) return { ok: false, error: 'NOT_FOUND' }

  const check = canTransitionSafetyCheckin(checkin.status as SafetyCheckinState, event)
  if (!check.allowed) return { ok: false, error: check.reason }

  const updated = await (prisma as any).safetyCheckin.update({
    where: { id: checkinId },
    data: { status: check.toState, ...extraData }
  })
  return { ok: true, checkin: updated }
}

export const scheduleCheckin = async (profileId: string, opts: { matchId?: string | null; scheduledAt: Date; locationHint?: string | null; safetyEmail?: string | null }) => {
  return (prisma as any).safetyCheckin.create({
    data: {
      profileId, matchId: opts.matchId || null, scheduledAt: opts.scheduledAt,
      locationHint: opts.locationHint || null, safetyEmail: opts.safetyEmail || null,
      status: 'SCHEDULED'
    }
  })
}

export const confirmSafe = async (checkinId: string) => applyTransition(checkinId, 'CONFIRM_SAFE', { confirmedAt: new Date() })
export const cancelCheckin = async (checkinId: string) => applyTransition(checkinId, 'CANCEL', { cancelledAt: new Date() })

// 9.6 job 1 — safety-checkin-request: fires once scheduledAt has arrived,
// asks the person (in-app, not their safety contact) to confirm they're
// safe. Idempotent: only touches rows still in SCHEDULED.
export const runSafetyCheckinRequestJob = async (): Promise<number> => {
  const due = await (prisma as any).safetyCheckin.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } }
  })
  for (const checkin of due) {
    const result = await applyTransition(checkin.id, 'REQUEST_CONFIRMATION', { requestSentAt: new Date() })
    if (!result.ok) continue
    const members = await getActiveMembers(checkin.profileId)
    await Promise.all(members.map((m: any) => notifyUser(
      m.userId, 'safety_checkin_request', '💚 Confirma que estás bem',
      'Tens um check-in de segurança agendado. Confirma que está tudo bem.',
      { checkinId: checkin.id, tab: 'safety' }
    )))
  }
  return due.length
}

// 9.6 job 2 — safety-checkin-overdue: after the first grace period with
// no confirmation, marks OVERDUE. No external communication yet — this is
// still an internal state, the safety contact is NOT alerted here.
export const runSafetyCheckinOverdueJob = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - REQUEST_TO_OVERDUE_HOURS * 60 * 60 * 1000)
  const due = await (prisma as any).safetyCheckin.findMany({
    where: { status: 'WAITING_CONFIRMATION', scheduledAt: { lt: cutoff } }
  })
  for (const checkin of due) {
    await applyTransition(checkin.id, 'MARK_OVERDUE', { overdueAt: new Date() })
  }
  return due.length
}

// 9.6 job 3 — safety-checkin-escalation: after the SECOND grace period
// still unconfirmed, escalates and — only if a safety contact was
// configured — sends the neutral notification email (9.7). If no
// safetyEmail is set, still escalates the internal status (so it surfaces
// in future admin visibility) but sends nothing to anyone external.
export const runSafetyCheckinEscalationJob = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - (REQUEST_TO_OVERDUE_HOURS + OVERDUE_TO_ESCALATED_HOURS) * 60 * 60 * 1000)
  const due = await (prisma as any).safetyCheckin.findMany({
    where: { status: 'OVERDUE', scheduledAt: { lt: cutoff } }
  })
  for (const checkin of due) {
    const result = await applyTransition(checkin.id, 'ESCALATE', { escalatedAt: new Date() })
    if (!result.ok) continue

    if (checkin.safetyEmail && !checkin.alertSent) {
      try {
        const profile = await prisma.profile.findUnique({ where: { id: checkin.profileId }, select: { displayName: true } })
        await sendSafetyAlertEmail(checkin.safetyEmail, {
          scheduledAt: checkin.scheduledAt,
          locationHint: checkin.locationHint,
          requesterName: profile?.displayName || 'Alguém'
        })
        await (prisma as any).safetyCheckin.update({ where: { id: checkin.id }, data: { alertSent: true } })
      } catch (err: any) {
        console.error('[SAFETY ESCALATION EMAIL]', err.message)
      }
    }
  }
  return due.length
}
