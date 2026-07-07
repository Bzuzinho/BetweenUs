import prisma from './prisma'
import { canTransition, type MatchEvent, type MatchState } from './matchStateMachine'
import { dispatch, type DomainEventType } from './domainEvents'

export type LikeResult =
  | { kind: 'PASS_RECORDED' }
  | { kind: 'LIKE_RECORDED' }
  | { kind: 'MATCH_CREATED'; matchId: string }
  | { kind: 'PENDING_PARTNER_APPROVAL' }
  | { kind: 'MATCH_PENDING_COUPLE_APPROVAL'; matchId: string }
  | { kind: 'ALREADY_MATCHED'; matchId: string }
  | { kind: 'ERROR'; message: string }

/**
 * Point 9: single source of truth for like → match decisions.
 *
 * Used by BOTH:
 *  - POST /api/discovery/:id/like   (individual-initiated likes)
 *  - POST /api/couples/like/:id     (couple-initiated likes)
 *
 * Rules:
 *  - Individual ↔ Individual: reciprocal like → match ACTIVE immediately.
 *  - Either side is an ACTIVE couple: reciprocal like → match created as
 *    PENDING_COUPLE_APPROVAL. It only becomes ACTIVE once both partners on
 *    EVERY couple side involved have approved via /api/couples/matches/:id/approve.
 *  - A couple profile with no active partner yet cannot match (treated as
 *    individual-only until coupleStatus === 'ACTIVE').
 */
export const createLikeOrMatch = async (
  actorProfileId: string,
  targetProfileId: string
): Promise<LikeResult> => {
  try {
    const [actor, target] = await Promise.all([
      prisma.profile.findUnique({ where: { id: actorProfileId }, include: { coupleProfile: true } }),
      prisma.profile.findUnique({ where: { id: targetProfileId }, include: { coupleProfile: true } })
    ])

    if (!actor || !target) return { kind: 'ERROR', message: 'Perfil não encontrado.' }

    // 9.3 — defense-in-depth: discovery already excludes blocked profiles
    // from ever being seen (5.3), but this closes the direct-API-call gap
    // (liking a profileId obtained some other way) so a block cannot be
    // routed around to force a like/match either way.
    const { isBlockedEitherWay } = await import('./blockService')
    if (await isBlockedEitherWay(actorProfileId, targetProfileId)) {
      return { kind: 'ERROR', message: 'Ação não disponível.' }
    }

    // Register the like (idempotent)
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
      update: { action: 'LIKE' },
      create: { actorProfileId, targetProfileId, action: 'LIKE' }
    })

    // Check reciprocity
    const theirLike = await prisma.profileAction.findFirst({
      where: { actorProfileId: targetProfileId, targetProfileId: actorProfileId, action: 'LIKE' }
    })

    if (!theirLike) {
      return { kind: 'LIKE_RECORDED' }
    }

    // Already matched?
    const existing = await prisma.match.findFirst({
      where: { OR: [
        { profileOneId: actorProfileId, profileTwoId: targetProfileId },
        { profileOneId: targetProfileId, profileTwoId: actorProfileId }
      ]}
    })
    if (existing) {
      return existing.status === 'ACTIVE'
        ? { kind: 'ALREADY_MATCHED', matchId: existing.id }
        : { kind: 'MATCH_PENDING_COUPLE_APPROVAL', matchId: existing.id }
    }

    // Point 9: decide if double consent is required on EITHER side
    const actorIsActiveCouple = actor.type === 'COUPLE' && actor.coupleProfile?.coupleStatus === 'ACTIVE'
    const targetIsActiveCouple = target.type === 'COUPLE' && target.coupleProfile?.coupleStatus === 'ACTIVE'
    const requiresDoubleConsent = actorIsActiveCouple || targetIsActiveCouple

    // 5.9 — creation now goes through MatchStateMachine.transition() instead
    // of a raw prisma.match.create with an inline status value, so this is
    // the ONLY place a Match's initial status is decided, and the CREATE
    // event's own validation (canTransition) runs even here.
    const result = await transition(null, 'CREATE', {
      toStateOverride: requiresDoubleConsent ? 'PENDING_COUPLE_APPROVAL' : 'ACTIVE',
      createData: {
        profileOneId: actorProfileId,
        profileTwoId: targetProfileId,
        conversationType: requiresDoubleConsent ? 'COUPLE_GROUP' : 'ONE_TO_ONE'
      }
    })
    if (!result.ok || !result.match) return { kind: 'ERROR', message: result.error || 'Erro ao criar match.' }

    return requiresDoubleConsent
      ? { kind: 'MATCH_PENDING_COUPLE_APPROVAL', matchId: result.match.id }
      : { kind: 'MATCH_CREATED', matchId: result.match.id }
  } catch (err: any) {
    console.error('[MATCH SERVICE]', err.message)
    return { kind: 'ERROR', message: 'Erro ao processar like.' }
  }
}

/**
 * Point 10 (Sprint 3) / 4.1 (Sprint 4): generalized required-approvers
 * resolver. Now a thin wrapper over ProfileMembershipService — kept as its
 * own export (rather than having callers import the service directly)
 * because "required approvers for a match" reads more clearly at the call
 * sites in couples.ts/matches.ts than "required approvers of a profile".
 */
export const getRequiredApproverUserIds = async (profileId: string): Promise<string[]> => {
  const { getRequiredApprovers } = await import('./profileMembershipService')
  return getRequiredApprovers(profileId)
}

export const recordPass = async (actorProfileId: string, targetProfileId: string): Promise<void> => {
  await prisma.profileAction.upsert({
    where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
    update: { action: 'PASS' },
    create: { actorProfileId, targetProfileId, action: 'PASS' }
  })
}

/**
 * 5.9 — MatchStateMachine.transition(): the ONLY place Match.status is
 * written. Before this, it was written directly in discovery.ts's like
 * route (now fixed to delegate here via createLikeOrMatch), couples.ts's
 * approve route, and privacy.ts's block route — none of them validating
 * against each other's assumptions about what transitions were legal.
 *
 * matchId is null only for the CREATE event (no Match row exists yet).
 */
export interface TransitionResult {
  ok: boolean
  match?: any
  error?: string
}

const EVENT_TO_DOMAIN_EVENT: Partial<Record<MatchEvent, DomainEventType>> = {
  REQUIRE_COUPLE_APPROVAL: 'MATCH_APPROVAL_REQUIRED',
  ACTIVATE:                'MATCH_ACTIVATED',
  PAUSE:                   'MATCH_PAUSED',
  END:                     'MATCH_ENDED',
  BLOCK:                   'MATCH_BLOCKED',
  REJECT:                  'MATCH_REJECTED',
  // APPROVE and RESUME deliberately have no domain event: APPROVE is a
  // self-transition (records that one approver approved, doesn't move the
  // FSM), and RESUME lands on ACTIVE but firing MATCH_ACTIVATED's "you
  // have a new match!" notification copy would be wrong for a match that
  // already existed and was just paused.
}

export const transition = async (
  matchId: string | null,
  event: MatchEvent,
  opts: {
    toStateOverride?: MatchState
    createData?: { profileOneId: string; profileTwoId: string; conversationType: 'ONE_TO_ONE' | 'COUPLE_GROUP' }
  } = {}
): Promise<TransitionResult> => {
  if (event === 'CREATE') {
    if (!opts.createData) return { ok: false, error: 'createData é obrigatório para o evento CREATE.' }
    const check = canTransition(null, 'CREATE', opts.toStateOverride)
    if (!check.allowed) return { ok: false, error: check.reason }

    const match = await prisma.match.create({
      data: {
        profileOneId: opts.createData.profileOneId,
        profileTwoId: opts.createData.profileTwoId,
        status: check.toState!,
        matchedAt: check.toState === 'ACTIVE' ? new Date() : null,
        conversation: { create: { type: opts.createData.conversationType } }
      }
    })

    await dispatch({ type: 'MATCH_CREATED', matchId: match.id, profileOneId: match.profileOneId, profileTwoId: match.profileTwoId })
    if (check.toState === 'ACTIVE') {
      await dispatch({ type: 'MATCH_ACTIVATED', matchId: match.id, profileOneId: match.profileOneId, profileTwoId: match.profileTwoId })
    } else if (check.toState === 'PENDING_COUPLE_APPROVAL') {
      await dispatch({ type: 'MATCH_APPROVAL_REQUIRED', matchId: match.id, profileOneId: match.profileOneId, profileTwoId: match.profileTwoId })
    }
    return { ok: true, match }
  }

  if (!matchId) return { ok: false, error: 'matchId é obrigatório para este evento.' }
  const existing = await prisma.match.findUnique({ where: { id: matchId } })
  if (!existing) return { ok: false, error: 'Match não encontrado.' }

  const check = canTransition(existing.status as MatchState, event)
  if (!check.allowed) return { ok: false, error: check.reason }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: check.toState!,
      ...(check.toState === 'ACTIVE' && !existing.matchedAt ? { matchedAt: new Date() } : {})
    }
  })

  const domainEventType = EVENT_TO_DOMAIN_EVENT[event]
  if (domainEventType) {
    await dispatch({ type: domainEventType, matchId: updated.id, profileOneId: updated.profileOneId, profileTwoId: updated.profileTwoId })
  }

  return { ok: true, match: updated }
}
