// 8.3 — ConsentCheckService: the single place that turns per-person
// ConsentCheckResponse rows into the aggregate ConsentCheck.status. Routes
// (consent.ts) and the expiry job never write `status` directly — they
// always go through here, so there is exactly one place implementing the
// rule from the spec:
//
//   ACTIVE CONSENT = every required participant ACCEPTED, none REVOKED,
//   not expired. Silence = PENDING. Silence is NEVER treated as accepted.
//
// Naming note (8.11): do not confuse this with roomRuleService's
// getConsentState(roomId) — that function aggregates Room Rule
// acceptance, a completely different concept. This service only ever
// talks about ConsentCheck/ConsentCheckResponse (phase-based permission).
import prisma from './prisma'
import { getPhasePolicy, ConsentCheckPhaseValue } from './consentPhasePolicy'
import { notifyUser } from './notify'

export type ConsentAnswer = 'ACCEPTED' | 'NOT_YET' | 'DECLINED'

const PHASE_LABEL: Record<string, string> = {
  MATCH: 'o match',
  CHAT: 'continuar a conversar',
  PHOTO_REQUEST: 'partilhar fotos privadas',
  FACE_REVEAL: 'revelar o rosto',
  VIDEO_CALL: 'uma chamada de vídeo',
  MEETING_PROPOSAL: 'propor um encontro',
  SAFETY_CHECKIN: 'uma verificação de segurança'
}

const emitConsentCheckUpdate = async (matchId: string, payload: any) => {
  try {
    const room = await (prisma as any).privateRoom.findUnique({ where: { matchId } })
    if (!room) return
    const { getIo } = await import('./socketRegistry')
    const io = getIo()
    // Deliberately a distinct event name from rooms.ts's 'consent:updated'
    // (which is Room Rule acceptance, not this) — see 8.11.
    io?.to('room:' + room.id).emit('consent-check:updated', { roomId: room.id, ...payload })
  } catch {
    // socket not initialized (e.g. tests) — safe to ignore
  }
}

interface CreateParams {
  matchId: string
  phase: ConsentCheckPhaseValue
  initiatedBy: string
}

export const createConsentCheck = async ({ matchId, phase, initiatedBy }: CreateParams) => {
  const policy = getPhasePolicy(phase)
  const requiredUserIds = await policy.resolveRequiredParticipants({ matchId, initiatorUserId: initiatedBy })

  const check = await prisma.consentCheck.create({
    data: {
      matchId, phase, status: 'PENDING', initiatedBy,
      expiresAt: new Date(Date.now() + policy.expirationHours * 60 * 60 * 1000)
    }
  })

  if (requiredUserIds.length > 0) {
    await (prisma as any).consentCheckResponse.createMany({
      data: requiredUserIds.map(userId => ({ consentCheckId: check.id, userId, status: 'PENDING' })),
      skipDuplicates: true
    })
  }

  const others = requiredUserIds.filter(uid => uid !== initiatedBy)
  await Promise.all(others.map(uid => notifyUser(
    uid, 'consent_check_requested', '🤝 Pedido de consentimento',
    `Pedem a tua confirmação para ${PHASE_LABEL[phase] || phase}.`,
    { matchId, phase, tab: 'matches' }
  )))

  return computeAndCacheStatus(check.id)
}

// Core aggregation. Self-heals the required-participant set (adds a
// PENDING response row for anyone newly active who wasn't accounted for)
// EXCEPT once a check has reached a terminal ACCEPTED state on a phase
// that doesn't ask for re-consent on new members — that state is frozen
// per ConsentPhasePolicy.reConsentOnNewMember, not silently reopened.
export const computeAndCacheStatus = async (consentCheckId: string) => {
  const check = await prisma.consentCheck.findUnique({ where: { id: consentCheckId } })
  if (!check) return null

  // Expiry always takes precedence and is terminal — never resynced again.
  if (check.status !== 'EXPIRED' && check.expiresAt && check.expiresAt < new Date()) {
    const expired = await prisma.consentCheck.update({ where: { id: check.id }, data: { status: 'EXPIRED' } })
    const responses = await (prisma as any).consentCheckResponse.findMany({ where: { consentCheckId } })
    return { check: expired, responses, requiredUserIds: responses.map((r: any) => r.userId), requiredCount: responses.length, acceptedCount: 0, allAccepted: false }
  }
  if (check.status === 'EXPIRED') {
    const responses = await (prisma as any).consentCheckResponse.findMany({ where: { consentCheckId } })
    return { check, responses, requiredUserIds: responses.map((r: any) => r.userId), requiredCount: responses.length, acceptedCount: 0, allAccepted: false }
  }

  const policy = getPhasePolicy(check.phase)
  const frozenTerminal = check.status === 'DECLINED' || check.status === 'REVOKED' ||
    (check.status === 'ACCEPTED' && !policy.reConsentOnNewMember)

  let policyRequired: string[]
  if (frozenTerminal) {
    // Terminal & not reopened by new members: "required" is frozen to
    // whoever already has a response row, rather than re-resolving live
    // membership (which could otherwise silently grow after the fact).
    const existing = await (prisma as any).consentCheckResponse.findMany({ where: { consentCheckId }, select: { userId: true } })
    policyRequired = existing.map((r: any) => r.userId)
  } else {
    policyRequired = await policy.resolveRequiredParticipants({ matchId: check.matchId, initiatorUserId: check.initiatedBy })
    if (policyRequired.length > 0) {
      await (prisma as any).consentCheckResponse.createMany({
        data: policyRequired.map(userId => ({ consentCheckId, userId, status: 'PENDING' })),
        skipDuplicates: true
      })
    }
  }

  const allResponses = await (prisma as any).consentCheckResponse.findMany({ where: { consentCheckId } })
  const responses = allResponses.filter((r: any) => policyRequired.includes(r.userId))

  const anyRevoked = responses.some((r: any) => r.status === 'REVOKED')
  const anyDeclined = responses.some((r: any) => r.status === 'DECLINED')
  const allAccepted = policyRequired.length > 0 && responses.length === policyRequired.length && responses.every((r: any) => r.status === 'ACCEPTED')
  const acceptedCount = responses.filter((r: any) => r.status === 'ACCEPTED').length

  let nextStatus: string = 'PENDING'
  if (anyRevoked) nextStatus = 'REVOKED'
  else if (anyDeclined) nextStatus = 'DECLINED'
  else if (allAccepted) nextStatus = 'ACCEPTED'

  let updated = check
  if (nextStatus !== check.status) {
    updated = await prisma.consentCheck.update({
      where: { id: check.id },
      data: { status: nextStatus as any, respondedAt: nextStatus === 'ACCEPTED' ? new Date() : check.respondedAt }
    })
  }

  return { check: updated, responses: allResponses, requiredUserIds: policyRequired, requiredCount: policyRequired.length, acceptedCount, allAccepted }
}

export const getConsentCheckState = async (consentCheckId: string) => computeAndCacheStatus(consentCheckId)

export const listConsentChecksForMatch = async (matchId: string) => {
  const checks = await prisma.consentCheck.findMany({ where: { matchId }, orderBy: { createdAt: 'desc' } })
  const states = await Promise.all(checks.map((c: any) => computeAndCacheStatus(c.id)))
  return states.filter(Boolean)
}

export const respondToConsentCheck = async (consentCheckId: string, userId: string, answer: ConsentAnswer) => {
  const check = await prisma.consentCheck.findUnique({ where: { id: consentCheckId } })
  if (!check) return { error: 'NOT_FOUND' as const }

  if (check.expiresAt && check.expiresAt < new Date()) {
    await computeAndCacheStatus(consentCheckId)
    return { error: 'EXPIRED' as const }
  }

  await (prisma as any).consentCheckResponse.upsert({
    where: { consentCheckId_userId: { consentCheckId, userId } },
    update: { status: answer, respondedAt: new Date() },
    create: { consentCheckId, userId, status: answer, respondedAt: new Date() }
  })

  const state = await computeAndCacheStatus(consentCheckId)
  if (!state) return { error: 'NOT_FOUND' as const }

  const others = state.requiredUserIds.filter((uid: string) => uid !== userId)
  const verb = answer === 'ACCEPTED' ? 'confirmou' : answer === 'DECLINED' ? 'recusou' : 'respondeu "ainda não" a'
  await Promise.all(others.map((uid: string) => notifyUser(
    uid, 'consent_check_response', '🤝 Consentimento atualizado',
    `Alguém ${verb} o pedido de ${PHASE_LABEL[check.phase] || check.phase}.`,
    { matchId: check.matchId, phase: check.phase, tab: 'matches' }
  )))
  await emitConsentCheckUpdate(check.matchId, { consentCheckId, phase: check.phase, status: state.check.status })

  return { state }
}

export const revokeConsentCheckResponse = async (consentCheckId: string, userId: string) => {
  const check = await prisma.consentCheck.findUnique({ where: { id: consentCheckId } })
  if (!check) return { error: 'NOT_FOUND' as const }

  const response = await (prisma as any).consentCheckResponse.findUnique({
    where: { consentCheckId_userId: { consentCheckId, userId } }
  })
  if (!response || response.status !== 'ACCEPTED') {
    return { error: 'NOT_ACCEPTED' as const }
  }

  await (prisma as any).consentCheckResponse.update({
    where: { consentCheckId_userId: { consentCheckId, userId } },
    data: { status: 'REVOKED', revokedAt: new Date() }
  })

  const state = await computeAndCacheStatus(consentCheckId)
  if (!state) return { error: 'NOT_FOUND' as const }

  const others = state.requiredUserIds.filter((uid: string) => uid !== userId)
  await Promise.all(others.map((uid: string) => notifyUser(
    uid, 'consent_check_revoked', '⚠️ Consentimento revogado',
    `Alguém revogou o consentimento para ${PHASE_LABEL[check.phase] || check.phase}. Isto pode bloquear ações dependentes.`,
    { matchId: check.matchId, phase: check.phase, tab: 'matches' }
  )))
  await emitConsentCheckUpdate(check.matchId, { consentCheckId, phase: check.phase, status: state.check.status })

  return { state }
}

// 8.5 — used by dependent-action gates (e.g. photos.ts's request-access)
// to check whether a phase currently has an active revocation blocking it
// for a given match. Returns true if the MOST RECENT check for this
// phase+match is in REVOKED state (a later, freshly-accepted check for
// the same phase supersedes an older revoked one).
export const isPhaseCurrentlyRevoked = async (matchId: string, phase: ConsentCheckPhaseValue): Promise<boolean> => {
  const latest = await prisma.consentCheck.findFirst({
    where: { matchId, phase }, orderBy: { createdAt: 'desc' }
  })
  if (!latest) return false
  const state = await computeAndCacheStatus(latest.id)
  return state?.check.status === 'REVOKED'
}

// 8.6 — called by the expire-consent-checks job. Idempotent: only touches
// checks that are still PENDING (or ACCEPTED-but-not-frozen, via the same
// computeAndCacheStatus expiry branch) and already past expiresAt.
export const expireOverdueConsentChecks = async (): Promise<number> => {
  const overdue = await prisma.consentCheck.findMany({
    where: { status: { notIn: ['EXPIRED'] }, expiresAt: { lt: new Date() } },
    select: { id: true }
  })
  for (const c of overdue) {
    await computeAndCacheStatus(c.id)
  }
  return overdue.length
}
