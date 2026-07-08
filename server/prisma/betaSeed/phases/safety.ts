// BETA.1.22/1.23/1.24/1.25 — Block, Report + Evidence, Verification queue,
// Safety Check-in. Every write goes through the real service EXCEPT
// SafetyCheckin's OVERDUE/ESCALATED transitions: those are normally
// produced by runSafetyCheckinOverdueJob/runSafetyCheckinEscalationJob,
// which scan and mutate EVERY due row in the table (not just this seed's
// own) and, for escalation, send a REAL email to any real safetyEmail
// they find overdue. Calling those job functions from a seed script
// would risk exactly what BETA.1.25 explicitly forbids ("não enviar
// comunicação real... durante o seed") against unrelated, real accounts.
// Instead this file reproduces just the state TRANSITION each job makes
// (via the same exported, validated canTransitionSafetyCheckin state
// machine) scoped strictly to the seed's own SafetyCheckin rows, and
// never calls sendSafetyAlertEmail at all — see seedSafetyCheckins below.
import prisma from '../../../src/lib/prisma'
import { blockProfile } from '../../../src/lib/blockService'
import { computeReportPriority, type ReportReasonValue } from '../../../src/lib/reportPriorityService'
import { captureMessageSnapshot, captureProfileSnapshot, captureRoomContext, captureSystemEvent } from '../../../src/lib/reportEvidenceService'
import { scheduleCheckin, confirmSafe, cancelCheckin } from '../../../src/lib/safetyCheckinService'
import { canTransitionSafetyCheckin, type SafetyCheckinState, type SafetyCheckinEvent } from '../../../src/lib/safetyCheckinStateMachine'
import { uploadPrivateFile } from '../../../src/lib/storage'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

export const seedBlockScenario = async (individuals: ProfileMap): Promise<void> => {
  // A simple, no-existing-match block — Leonor blocks Tiago outright.
  const leonor = individuals['individual_leonor']?.profileId
  const tiago = individuals['individual_tiago']?.profileId
  if (leonor && tiago) {
    await blockProfile(leonor, tiago)
    console.log('  Block scenarios: 1 standalone (+ 1 combinado com Room F)')
  }
}

interface ReportSpec {
  reporterKey: string
  reportedKey: string
  reason: ReportReasonValue
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED'
  details: string
}

const REPORT_SPECS: ReportSpec[] = [
  { reporterKey: 'individual_tiago', reportedKey: 'individual_noa', reason: 'FAKE_PROFILE', status: 'PENDING', details: 'Perfil parece não corresponder a uma pessoa real (cenário de teste).' },
  { reporterKey: 'individual_rui', reportedKey: 'individual_diogo', reason: 'HARASSMENT', status: 'REVIEWING', details: 'Mensagens insistentes depois de pedir para não continuar a conversa (cenário de teste).' },
  { reporterKey: 'individual_catarina', reportedKey: 'individual_miguel', reason: 'MINOR', status: 'ESCALATED', details: 'Suspeita de idade — sinalizado para revisão máxima prioridade (cenário de teste).' },
  { reporterKey: 'individual_sofia', reportedKey: 'individual_rui', reason: 'NON_CONSENSUAL_IMAGE', status: 'RESOLVED', details: 'Alegada partilha de imagem sem consentimento (cenário de teste, sem imagem real anexada).' },
  { reporterKey: 'individual_joana', reportedKey: 'individual_tiago', reason: 'THREAT', status: 'DISMISSED', details: 'Denúncia de ameaça — após revisão, sem evidência suficiente (cenário de teste).' },
  { reporterKey: 'individual_marta', reportedKey: 'individual_noa', reason: 'COERCION', status: 'PENDING', details: 'Pressão insistente para avançar apesar de recusa explícita (cenário de teste).' },
]

export const seedReports = async (
  individuals: ProfileMap, roomIds: Record<string, string>
): Promise<void> => {
  let count = 0
  for (const spec of REPORT_SPECS) {
    const reporter = individuals[spec.reporterKey]
    const reported = individuals[spec.reportedKey]
    if (!reporter?.userId || !reported?.userId) continue

    const existing = await prisma.report.findFirst({
      where: { reporterUserId: reporter.userId, reportedUserId: reported.userId, reason: spec.reason as any },
    })
    if (existing) continue

    const openReportCountForTarget = await prisma.report.count({ where: { reportedUserId: reported.userId, status: { in: ['PENDING', 'REVIEWING'] } } })
    const { priority } = computeReportPriority({ reason: spec.reason, openReportCountForTarget })

    const report = await prisma.report.create({
      data: {
        reporterUserId: reporter.userId, reportedUserId: reported.userId,
        reason: spec.reason as any, status: spec.status as any, priority,
        details: spec.details, reviewedAt: spec.status === 'PENDING' ? null : new Date(),
      },
    })

    // Evidence — varied by type, exercising each capture function.
    if (spec.reason === 'HARASSMENT' && roomIds.room_a_individual_active) {
      const msg = await (prisma as any).roomMessage.findFirst({ where: { roomId: roomIds.room_a_individual_active, senderUserId: reported.userId } })
      if (msg) await captureMessageSnapshot(report.id, msg.id, 'ROOM')
      await captureRoomContext(report.id, roomIds.room_a_individual_active)
    } else if (spec.reason === 'MINOR') {
      await captureProfileSnapshot(report.id, reported.profileId)
    } else if (spec.reason === 'NON_CONSENSUAL_IMAGE') {
      // Explicitly NOT a real/illegal media reference — synthetic
      // metadata only, per BETA.1.23's instruction.
      await captureSystemEvent(report.id, 'NON_CONSENSUAL_IMAGE_TEST_REFERENCE', { note: 'Referência sintética — sem imagem real anexada (dado de teste).' })
    } else if (spec.reason === 'COERCION') {
      await captureSystemEvent(report.id, 'COERCION_CONTEXT', { note: '"Já disse que prefiro não continuar esta conversa." / "Responde-me, só quero falar." (cenário de teste, sem conteúdo real).' })
    }

    count++
  }
  console.log(`  Reports: ${count}`)
}

const VERIFICATION_TEST_ASSET = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#333"/>' +
  '<text x="150" y="150" font-size="18" fill="#fff" text-anchor="middle" font-family="sans-serif">TEST VERIFICATION</text></svg>'
)

export const seedVerificationQueue = async (
  individuals: ProfileMap, couples: ProfileMap
): Promise<void> => {
  const upload = async () => (await uploadPrivateFile(VERIFICATION_TEST_ASSET, 'verification.svg', 'image/svg+xml')).key

  const specs: Array<{ userId?: string; type: 'SELFIE' | 'ID_DOCUMENT' | 'VIDEO'; status: 'PENDING' | 'APPROVED' | 'REJECTED' }> = [
    { userId: individuals['individual_tiago']?.userId, type: 'SELFIE', status: 'REJECTED' },   // AGE_SELFIE rejected
    { userId: individuals['individual_rui']?.userId, type: 'SELFIE', status: 'APPROVED' },      // AGE_SELFIE approved (pairs with the verified_only scenario)
    { userId: individuals['individual_diogo']?.userId, type: 'VIDEO', status: 'APPROVED' },     // stand-in for PROFILE_LIVENESS (closest real VerificationType)
  ]
  // IDENTITY (ID_DOCUMENT) PENDING — a couple member, since
  // VerificationType/Verification.userId are 1-per-user (no distinct
  // COUPLE verification type exists in the current schema — the closest
  // real equivalent is verifying both members individually, done below).
  const coupleMembers = couples['couple_1_third_match']?.memberUserIds || []
  if (coupleMembers[0]) specs.push({ userId: coupleMembers[0], type: 'ID_DOCUMENT', status: 'PENDING' })
  if (coupleMembers[1]) specs.push({ userId: coupleMembers[1], type: 'SELFIE', status: 'APPROVED' })

  let count = 0
  for (const spec of specs) {
    if (!spec.userId) continue
    const selfieStoragePath = await upload()
    await (prisma as any).verification.upsert({
      where: { userId: spec.userId },
      update: { type: spec.type, status: spec.status, selfieStoragePath, reviewedAt: spec.status === 'PENDING' ? null : new Date() },
      create: { userId: spec.userId, type: spec.type, status: spec.status, selfieStoragePath, reviewedAt: spec.status === 'PENDING' ? null : new Date() },
    })
    count++
  }
  console.log(`  Verification queue: ${count}`)
}

const applySafetyTransition = async (checkinId: string, event: SafetyCheckinEvent, extraData: Record<string, any> = {}) => {
  const checkin = await (prisma as any).safetyCheckin.findUnique({ where: { id: checkinId } })
  if (!checkin) return
  const check = canTransitionSafetyCheckin(checkin.status as SafetyCheckinState, event)
  if (!check.allowed) return
  await (prisma as any).safetyCheckin.update({ where: { id: checkinId }, data: { status: check.toState, ...extraData } })
}

export const seedSafetyCheckins = async (individuals: ProfileMap): Promise<void> => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000)
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000)
  let count = 0

  // SCHEDULED — future, untouched.
  const marta = individuals['individual_marta']?.profileId
  if (marta) { await scheduleCheckin(marta, { scheduledAt: hoursFromNow(2), safetyEmail: null }); count++ }

  // WAITING_CONFIRMATION — past scheduledAt, request stage only.
  const joana = individuals['individual_joana']?.profileId
  if (joana) {
    const c = await scheduleCheckin(joana, { scheduledAt: hoursAgo(1), safetyEmail: null })
    await applySafetyTransition(c.id, 'REQUEST_CONFIRMATION', { requestSentAt: new Date() })
    count++
  }

  // SAFE_CONFIRMED — via the real confirmSafe() service.
  const rui = individuals['individual_rui']?.profileId
  if (rui) {
    const c = await scheduleCheckin(rui, { scheduledAt: hoursAgo(1), safetyEmail: null })
    await applySafetyTransition(c.id, 'REQUEST_CONFIRMATION', { requestSentAt: new Date() })
    await confirmSafe(c.id)
    count++
  }

  // CANCELLED — via the real cancelCheckin() service.
  const alex = individuals['individual_alex']?.profileId
  if (alex) { const c = await scheduleCheckin(alex, { scheduledAt: hoursFromNow(3), safetyEmail: null }); await cancelCheckin(c.id); count++ }

  // OVERDUE — scheduledAt far enough in the past to have crossed the
  // REQUEST_TO_OVERDUE_HOURS grace window. safetyEmail intentionally
  // null — see this file's header comment.
  const catarina = individuals['individual_catarina']?.profileId
  if (catarina) {
    const overdueHours = Number(process.env.SAFETY_ALERT_OVERDUE_HOURS || 3) + 1
    const c = await scheduleCheckin(catarina, { scheduledAt: hoursAgo(overdueHours), safetyEmail: null })
    await applySafetyTransition(c.id, 'REQUEST_CONFIRMATION', { requestSentAt: new Date() })
    await applySafetyTransition(c.id, 'MARK_OVERDUE', { overdueAt: new Date() })
    count++
  }

  // ESCALATED — crossed both grace windows. safetyEmail deliberately
  // null so no real code path (this seed's or the real cron's) could
  // ever attempt to send an alert for this row, even after the seed
  // finishes running.
  const sofia = individuals['individual_sofia']?.profileId
  if (sofia) {
    const escalatedHours = Number(process.env.SAFETY_ALERT_OVERDUE_HOURS || 3) + Number(process.env.SAFETY_CHECKIN_ESCALATION_GRACE_HOURS || 1) + 1
    const c = await scheduleCheckin(sofia, { scheduledAt: hoursAgo(escalatedHours), safetyEmail: null })
    await applySafetyTransition(c.id, 'REQUEST_CONFIRMATION', { requestSentAt: new Date() })
    await applySafetyTransition(c.id, 'MARK_OVERDUE', { overdueAt: new Date() })
    await applySafetyTransition(c.id, 'ESCALATE', { escalatedAt: new Date() })
    count++
  }

  console.log(`  Safety Check-ins: ${count}`)
}
