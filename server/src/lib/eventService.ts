// 10.5/10.6/10.8 — EventService: organizer resolution, the
// PRIVATE_EVENTS_ENABLED kill switch, the organizer verification gate, and
// EventAttendance transitions (request/approve/decline/cancel), including
// capacity enforcement. Routes (events.ts) delegate every state change
// here rather than writing Event/EventAttendance rows directly, same
// separation as matchService.ts/safetyCheckinService.ts.
import prisma from './prisma'
import { resolveMyProfileId } from './profileMembershipService'
import { canTransitionEvent, EventState, EventTransitionEvent } from './eventStateMachine'

// 10.8 — spec explicitly requires "nenhuma criação de evento aberta e não
// moderada" — unlike GROUP_PROFILES_ENABLED (already live, defaults ON to
// preserve behaviour), Events is a brand-new surface this sprint, so this
// defaults OFF until explicitly turned on in an environment.
export const isPrivateEventsEnabled = (): boolean =>
  process.env.PRIVATE_EVENTS_ENABLED === 'true'

export interface OrganizerEligibility {
  eligible: boolean
  reason?: string
  profileId?: string
}

// 10.8 — "organizador precisa de um nível mínimo de verificação
// configurável". VerificationStatus (verifications.ts) has no numeric
// "level", only PENDING/APPROVED/REJECTED/EXPIRED, so the configurable
// part is WHICH status counts as sufficient, via
// EVENT_ORGANIZER_MIN_VERIFICATION_STATUS — defaults to APPROVED (must
// have passed identity verification) since letting an unverified user
// organize a real-world meetup is exactly the kind of risk this gate
// exists to close.
const REQUIRED_STATUS = (): string =>
  process.env.EVENT_ORGANIZER_MIN_VERIFICATION_STATUS || 'APPROVED'

export const checkOrganizerEligibility = async (userId: string): Promise<OrganizerEligibility> => {
  const profileId = await resolveMyProfileId(userId)
  if (!profileId) return { eligible: false, reason: 'É necessário ter um perfil para organizar um evento.' }

  const verification = await prisma.verification.findUnique({ where: { userId }, select: { status: true } })
  const required = REQUIRED_STATUS()
  if (!verification || verification.status !== required) {
    return { eligible: false, reason: `É necessário ter verificação de identidade com estado ${required}.`, profileId }
  }

  return { eligible: true, profileId }
}

// Only counts toward capacity/venue-reveal eligibility — REQUESTED rows
// are pending, DECLINED/CANCELLED are inactive.
const APPROVED_STATUSES = ['APPROVED', 'ATTENDED']

export const getApprovedAttendanceCount = async (eventId: string): Promise<number> =>
  (prisma as any).eventAttendance.count({ where: { eventId, status: { in: APPROVED_STATUSES } } })

export const hasCapacity = async (event: { id: string; capacity: number | null }): Promise<boolean> => {
  if (event.capacity == null) return true
  const approved = await getApprovedAttendanceCount(event.id)
  return approved < event.capacity
}

// ─── Event lifecycle ────────────────────────────────────────────────────────
export const runEventTransition = async (
  eventId: string,
  event: EventTransitionEvent
): Promise<{ ok: boolean; error?: string; status?: EventState }> => {
  const current = await (prisma as any).event.findUnique({ where: { id: eventId }, select: { status: true } })
  if (!current) return { ok: false, error: 'Evento não encontrado.' }

  const check = canTransitionEvent(current.status as EventState, event)
  if (!check.allowed) return { ok: false, error: check.reason }

  await (prisma as any).event.update({ where: { id: eventId }, data: { status: check.toState } })
  return { ok: true, status: check.toState! }
}

// ─── Attendance ─────────────────────────────────────────────────────────────
export interface AttendanceResult {
  ok: boolean
  error?: string
  attendance?: any
}

// 10.6 — a REQUESTED row is always created first, even when
// approvalRequired is false; in that case it's immediately auto-approved
// in the same call, so callers always get a consistent row shape back and
// there's exactly one write path (no separate "auto-approved" insert
// branch to keep in sync with the manual-approval one).
export const requestAttendance = async (eventId: string, profileId: string): Promise<AttendanceResult> => {
  const event = await (prisma as any).event.findUnique({ where: { id: eventId } })
  if (!event) return { ok: false, error: 'Evento não encontrado.' }
  if (event.status !== 'PUBLISHED') return { ok: false, error: 'Este evento não está a aceitar inscrições.' }

  const existing = await (prisma as any).eventAttendance.findUnique({
    where: { eventId_profileId: { eventId, profileId } }
  })
  if (existing && existing.status !== 'CANCELLED' && existing.status !== 'DECLINED') {
    return { ok: false, error: 'Já tens um pedido de participação para este evento.', attendance: existing }
  }

  if (!(await hasCapacity(event))) return { ok: false, error: 'Este evento já atingiu a capacidade máxima.' }

  const autoApprove = !event.approvalRequired
  const data = {
    status: autoApprove ? 'APPROVED' : 'REQUESTED',
    requestedAt: new Date(),
    approvedAt: autoApprove ? new Date() : null,
    cancelledAt: null
  }

  const attendance = existing
    ? await (prisma as any).eventAttendance.update({ where: { id: existing.id }, data })
    : await (prisma as any).eventAttendance.create({ data: { eventId, profileId, ...data } })

  return { ok: true, attendance }
}

const assertOrganizer = async (eventId: string, organizerProfileId: string) => {
  const event = await (prisma as any).event.findUnique({ where: { id: eventId }, select: { organizerProfileId: true } })
  if (!event) return { ok: false as const, error: 'Evento não encontrado.' }
  if (event.organizerProfileId !== organizerProfileId) return { ok: false as const, error: 'Apenas o organizador pode fazer isto.' }
  return { ok: true as const }
}

export const approveAttendance = async (eventId: string, attendanceId: string, organizerProfileId: string): Promise<AttendanceResult> => {
  const guard = await assertOrganizer(eventId, organizerProfileId)
  if (!guard.ok) return guard

  const event = await (prisma as any).event.findUnique({ where: { id: eventId } })
  if (!(await hasCapacity(event))) return { ok: false, error: 'Este evento já atingiu a capacidade máxima.' }

  const attendance = await (prisma as any).eventAttendance.findFirst({ where: { id: attendanceId, eventId } })
  if (!attendance || attendance.status !== 'REQUESTED') return { ok: false, error: 'Pedido não encontrado ou já processado.' }

  const updated = await (prisma as any).eventAttendance.update({
    where: { id: attendanceId },
    data: { status: 'APPROVED', approvedAt: new Date() }
  })
  return { ok: true, attendance: updated }
}

export const declineAttendance = async (eventId: string, attendanceId: string, organizerProfileId: string): Promise<AttendanceResult> => {
  const guard = await assertOrganizer(eventId, organizerProfileId)
  if (!guard.ok) return guard

  const attendance = await (prisma as any).eventAttendance.findFirst({ where: { id: attendanceId, eventId } })
  if (!attendance || attendance.status !== 'REQUESTED') return { ok: false, error: 'Pedido não encontrado ou já processado.' }

  const updated = await (prisma as any).eventAttendance.update({ where: { id: attendanceId }, data: { status: 'DECLINED' } })
  return { ok: true, attendance: updated }
}

// Cancellation is the attendee's own action (unlike approve/decline) — no
// organizer guard, just ownership of the attendance row itself.
export const cancelAttendance = async (eventId: string, profileId: string): Promise<AttendanceResult> => {
  const attendance = await (prisma as any).eventAttendance.findUnique({
    where: { eventId_profileId: { eventId, profileId } }
  })
  if (!attendance || attendance.status === 'CANCELLED' || attendance.status === 'DECLINED') {
    return { ok: false, error: 'Não há inscrição ativa para cancelar.' }
  }
  const updated = await (prisma as any).eventAttendance.update({
    where: { id: attendance.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() }
  })
  return { ok: true, attendance: updated }
}
