// 5.10 — Domain events: a simple in-process dispatcher, not a message
// bus/queue. Fired by MatchService.transition() right after a state
// change is persisted, so side effects (notifications, conversation/room
// setup, media access revocation) live in ONE place instead of being
// duplicated at every call site that used to write Match.status directly.
//
// Deliberately synchronous and in-process: this project has no message
// broker, and Sprint 5's scope doesn't call for building one. Handlers
// that fail are caught and logged individually so one broken handler
// never blocks the state transition that already succeeded, or blocks
// other handlers for the same event.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'
import { notifyUser } from './notify'

export type DomainEventType =
  | 'MATCH_CREATED' | 'MATCH_APPROVAL_REQUIRED' | 'MATCH_ACTIVATED'
  | 'MATCH_PAUSED' | 'MATCH_ENDED' | 'MATCH_BLOCKED' | 'MATCH_REJECTED'

export interface DomainEvent {
  type: DomainEventType
  matchId: string
  profileOneId: string
  profileTwoId: string
}

type Handler = (event: DomainEvent) => Promise<void>

const handlers: Record<DomainEventType, Handler[]> = {
  MATCH_CREATED: [], MATCH_APPROVAL_REQUIRED: [], MATCH_ACTIVATED: [],
  MATCH_PAUSED: [], MATCH_ENDED: [], MATCH_BLOCKED: [], MATCH_REJECTED: [],
}

export const on = (type: DomainEventType, handler: Handler): void => {
  handlers[type].push(handler)
}

export const dispatch = async (event: DomainEvent): Promise<void> => {
  for (const handler of handlers[event.type]) {
    try {
      await handler(event)
    } catch (err: any) {
      console.error(`[DOMAIN EVENT] ${event.type} handler failed`, err.message)
    }
  }
}

const profileDisplayName = async (profileId: string): Promise<string> => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { displayName: true } })
  return profile?.displayName || 'Alguém'
}

const userIdsFor = async (profileId: string): Promise<string[]> =>
  (await getActiveMembers(profileId)).map(m => m.userId)

// ── MATCH_ACTIVATED ──────────────────────────────────────────────────────
// - notification to every active member of both profiles (not just one
//   user each, since a couple side can have 2 members who both care).
// - conversation/room: already created eagerly at Match-creation time
//   (conversation: { create: {...} } in matchService.createLikeOrMatch),
//   including when the match starts life as PENDING_COUPLE_APPROVAL - so
//   there's nothing left to create here by the time ACTIVATE fires. Left
//   as an explicit no-op with this comment rather than silently doing
//   nothing, so a future change to lazy-create the conversation instead
//   has an obvious place to plug in.
// - ConsentCheck eligibility: the ConsentCheck model exists in the schema
//   but (confirmed in the Sprint 5 audit) has NO route or service using it
//   anywhere in the app yet - it's unimplemented, not just unwired. This
//   handler does not invent that feature; it's the documented hook point
//   a future "propose a meeting, request consent" feature would subscribe
//   to (a match becoming ACTIVE is exactly the eligibility condition it
//   would need), without building speculative functionality now.
on('MATCH_ACTIVATED', async (event) => {
  const [oneUserIds, twoUserIds, oneName, twoName] = await Promise.all([
    userIdsFor(event.profileOneId), userIdsFor(event.profileTwoId),
    profileDisplayName(event.profileOneId), profileDisplayName(event.profileTwoId),
  ])
  await Promise.all([
    ...oneUserIds.map(uid => notifyUser(uid, 'match', '💫 Match confirmado!', `Tens um novo match com ${twoName}.`, { matchId: event.matchId, tab: 'matches' })),
    ...twoUserIds.map(uid => notifyUser(uid, 'match', '💫 Match confirmado!', `Tens um novo match com ${oneName}.`, { matchId: event.matchId, tab: 'matches' })),
  ])

  // 6.6/7.9 — "Interesse enviado → Parceiro A confirmou → Parceiro B
  // confirmou → Private Room desbloqueada": any match with 3+ total active
  // members across both sides (couple+individual, couple+couple) gets its
  // Private Room created here, the moment the match itself goes ACTIVE —
  // that IS the "unlocked" moment. A plain individual-individual match (2
  // total members) keeps using its already-created Conversation and gets
  // no room. Room creation itself (type inference, membership, initial
  // rule set) is now PrivateRoomService.createFromMatch's job (7.9) —
  // this handler only decides WHETHER to call it and sends the
  // notification, matching the "unlocked" language even though the room
  // actually starts in WAITING_CONSENT (rules must be accepted first,
  // 7.4) rather than immediately ACTIVE.
  const totalMembers = oneUserIds.length + twoUserIds.length
  if (totalMembers >= 3) {
    const { createFromMatch } = await import('./privateRoomService')
    const result = await createFromMatch(event.matchId).catch((e: any) => {
      console.error('[MATCH_ACTIVATED private room]', e.message)
      return null
    })
    if (result?.ok && result.created) {
      const allUserIds = [...oneUserIds, ...twoUserIds]
      await Promise.all(allUserIds.map(uid => notifyUser(
        uid, 'private_room', '🔓 Sala privada desbloqueada',
        'O match tornou-se numa sala privada partilhada. Aceitem as regras da sala para começar.',
        { matchId: event.matchId, tab: 'rooms' }
      )))
    }
  }
})

// ── MATCH_PAUSED / MATCH_ENDED ───────────────────────────────────────────
// No side effects beyond the state change itself yet - listed explicitly
// (rather than omitted) so it's clear this was a decision, not an
// oversight, and so there's an obvious place to add e.g. a system message
// in the conversation later.
on('MATCH_PAUSED', async () => {})
on('MATCH_ENDED', async () => {})

// ── MATCH_REJECTED ────────────────────────────────────────────────────────
// 6.5: notifies EVERY active member of BOTH sides with the exact same
// neutral copy — never singles out which side or which member rejected.
// This is the structural guarantee behind "nunca revelar quem rejeitou":
// there is no code path here that reads which specific user's approval
// was missing, only that the match as a whole didn't proceed.
on('MATCH_REJECTED', async (event) => {
  const [oneUserIds, twoUserIds] = await Promise.all([
    userIdsFor(event.profileOneId), userIdsFor(event.profileTwoId)
  ])
  const allUserIds = [...oneUserIds, ...twoUserIds]
  await Promise.all(allUserIds.map(uid => notifyUser(
    uid, 'match_ended', 'Match não avançou',
    'Este match não reuniu a aprovação necessária e foi encerrado.',
    { matchId: event.matchId, tab: 'matches' }
  )))
})

// ── MATCH_APPROVAL_REQUIRED ──────────────────────────────────────────────
// Notifies whichever required approvers haven't approved yet. Couples.ts's
// own like route already sends its own "aguardar aprovação" style
// messaging inline via its response body; this additionally makes sure
// the OTHER couple's members (who may not be the one who just liked) get
// a real notification, which nothing currently sends.
on('MATCH_APPROVAL_REQUIRED', async (event) => {
  const { getRequiredApprovers } = await import('./profileMembershipService')
  const [oneApprovers, twoApprovers] = await Promise.all([
    getRequiredApprovers(event.profileOneId), getRequiredApprovers(event.profileTwoId)
  ])
  const approvers = [...new Set([...oneApprovers, ...twoApprovers])]
  await Promise.all(approvers.map(uid => notifyUser(
    uid, 'match_approval_required', '💫 Aprovação necessária',
    'Há um match à espera da aprovação do casal.',
    { matchId: event.matchId, tab: 'matches' }
  )))
})

// ── MATCH_BLOCKED ─────────────────────────────────────────────────────────
// - revoke media access: any APPROVED PhotoAccessRequest between users on
//   either side gets REVOKED. Before this, blocking someone left previously
//   granted private-photo access standing forever.
// - close communication: matches.ts already refuses new messages once
//   status is BLOCKED (checked at send-time) - no further action needed
//   there, this is just documented so it's clear it was verified, not
//   missed.
// - discovery exclusion: already covered by the ProfileAction BLOCK row
//   privacy.ts creates alongside the status change - not duplicated here.
on('MATCH_BLOCKED', async (event) => {
  const [oneUserIds, twoUserIds] = await Promise.all([
    userIdsFor(event.profileOneId), userIdsFor(event.profileTwoId)
  ])
  await (prisma as any).photoAccessRequest.updateMany({
    where: {
      status: 'APPROVED',
      OR: [
        { requesterId: { in: oneUserIds }, ownerId: { in: twoUserIds } },
        { requesterId: { in: twoUserIds }, ownerId: { in: oneUserIds } },
      ]
    },
    data: { status: 'REVOKED', respondedAt: new Date() }
  }).catch((e: any) => console.error('[MATCH_BLOCKED photo revoke]', e.message))
})
