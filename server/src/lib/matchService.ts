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
  | { kind: 'ERROR'; message: string; code?: string }

// BETA.4 — monetization package (product decision confirmed 2026-07-13):
// FREE plan caps how many ACTIVE matches a profile can hold at once, to
// encourage archiving/ending old conversations or upgrading — Premium
// (any plan !== FREE) is unlimited. Deliberately NOT gating the pending
// single-consent request list itself (GET /api/matches/pending-requests
// stays free/unrestricted per that same product decision) — only the
// point where a match actually BECOMES ACTIVE is gated, and only for
// whichever side of the pair is actually at FREE-plan capacity.
export const FREE_MAX_ACTIVE_MATCHES = Number(process.env.FREE_MAX_ACTIVE_MATCHES || 5)

// A profile's "premium" status is resolved from its owning user(s):
// Profile.userId directly for an Individual Profile, or every ACTIVE
// ProfileMember's userId for a Shared Profile (COUPLE/GROUP) — same
// owner-resolution pattern discoveryService.ts already uses for
// eligibility (isSharedProfileEligible). Any one premium member is enough
// to lift the cap for the whole shared profile (a positive perk, unlike
// the ALL-must-be-eligible posture used for safety gates elsewhere).
const isProfilePremium = async (profileId: string): Promise<boolean> => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { userId: true } })
  if (!profile) return false
  let ownerUserIds: string[]
  if (profile.userId) {
    ownerUserIds = [profile.userId]
  } else {
    const { getActiveMembers } = await import('./profileMembershipService')
    ownerUserIds = (await getActiveMembers(profileId)).map(m => m.userId)
  }
  if (ownerUserIds.length === 0) return false
  const sub = await prisma.subscription.findFirst({
    where: { userId: { in: ownerUserIds }, plan: { not: 'FREE' }, status: 'ACTIVE' },
    select: { id: true }
  })
  return !!sub
}

const countActiveMatches = (profileId: string): Promise<number> =>
  prisma.match.count({ where: { status: 'ACTIVE', OR: [{ profileOneId: profileId }, { profileTwoId: profileId }] } })

export interface CapacityCheckResult { ok: boolean; blockedProfileId?: string }

// Checked at every point a match transitions INTO ACTIVE — see
// transition() below (covers CREATE→ACTIVE and ACTIVATE→ACTIVE, i.e. both
// the direct individual↔individual path and the couple/group N-party
// approval path) and matches.ts's POST /accept/:fromProfileId (the
// single-consent accept path, which creates its Match row directly
// instead of going through transition() — see that route's own comment).
export const checkActiveMatchCapacity = async (profileOneId: string, profileTwoId: string): Promise<CapacityCheckResult> => {
  for (const profileId of [profileOneId, profileTwoId]) {
    if (await isProfilePremium(profileId)) continue
    const count = await countActiveMatches(profileId)
    if (count >= FREE_MAX_ACTIVE_MATCHES) return { ok: false, blockedProfileId: profileId }
  }
  return { ok: true }
}

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

    // Register the like (idempotent) — capture the PRIOR action first so
    // the signal below only fires on a genuine transition INTO 'LIKE',
    // not on every repeat call with the same actor/target (11.5.6 dedup
    // policy: one LIKE signal per actor/target action, matching how the
    // underlying ProfileAction row itself is idempotent).
    const priorAction = await prisma.profileAction.findUnique({
      where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
      select: { action: true }
    })
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
      update: { action: 'LIKE' },
      create: { actorProfileId, targetProfileId, action: 'LIKE' }
    })

    // 11.1/11.5.6 — behavioral signal, best-effort, never blocks the like
    // itself. Only fired the first time this pair transitions into LIKE.
    if (priorAction?.action !== 'LIKE') {
      const { recordSignal } = await import('./recommendationSignalService')
      recordSignal(actorProfileId, targetProfileId, 'LIKE').catch(() => {})
    }

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

    // Point 9: decide if double consent is required on EITHER side.
    // BETA.2 (FASE E) — this used to check `type === 'COUPLE'` only, which
    // silently skipped GROUP profiles entirely: a GROUP liking/being liked
    // would jump straight to ACTIVE, bypassing N-party approval altogether
    // (found while seeding a GROUP x INDIVIDUAL match scenario — no seed
    // data existed yet to exercise this path). A Shared Profile (COUPLE or
    // GROUP) requires consent once it's actually usable: COUPLE only once
    // coupleStatus=ACTIVE (matches the pre-existing rule — a
    // PENDING_PARTNER couple can't match yet at all), GROUP once its own
    // Profile.status=APPROVED (GROUP has no separate coupleStatus-like
    // sub-state machine, so Profile.status is the equivalent signal).
    const requiresApproval = (p: typeof actor): boolean => {
      if (p.type === 'COUPLE') return p.coupleProfile?.coupleStatus === 'ACTIVE'
      if (p.type === 'GROUP') return p.status === 'APPROVED'
      return false
    }
    const requiresDoubleConsent = requiresApproval(actor) || requiresApproval(target)

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
    if (!result.ok || !result.match) return { kind: 'ERROR', message: result.error || 'Erro ao criar match.', code: result.code }

    // 11.1 — MATCH is mutual by nature: one signal row per direction.
    // (Already naturally deduped — this code path only runs once, right
    // after the match is first created above; the `existing` check earlier
    // returns before here on any subsequent call for the same pair.)
    {
      const { recordSignal } = await import('./recommendationSignalService')
      recordSignal(actorProfileId, targetProfileId, 'MATCH').catch(() => {})
      recordSignal(targetProfileId, actorProfileId, 'MATCH').catch(() => {})
    }

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
  // 11.5.6 — same "only on genuine transition" dedup as LIKE, applied here
  // too for consistency/bounded row growth even though PASS is excluded
  // from the global aggregate (see comment below) so a duplicate row
  // would be harmless for ranking — it would still be wasted writes if a
  // client retried this call.
  const priorAction = await prisma.profileAction.findUnique({
    where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
    select: { action: true }
  })
  await prisma.profileAction.upsert({
    where: { actorProfileId_targetProfileId: { actorProfileId, targetProfileId } },
    update: { action: 'PASS' },
    create: { actorProfileId, targetProfileId, action: 'PASS' }
  })
  if (priorAction?.action === 'PASS') return
  // 11.1/11.7 — recorded for completeness, but deliberately EXCLUDED from
  // the global aggregate a candidate's other viewers see (see
  // recommendationSignalService's GLOBAL_AGGREGATE_TYPES comment) — a
  // PASS is already a hard per-viewer exclusion from future discovery,
  // not a reputational signal about the passed profile.
  const { recordSignal } = await import('./recommendationSignalService')
  recordSignal(actorProfileId, targetProfileId, 'PASS').catch(() => {})
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
  code?: string
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

    if (check.toState === 'ACTIVE') {
      const capacity = await checkActiveMatchCapacity(opts.createData.profileOneId, opts.createData.profileTwoId)
      if (!capacity.ok) return { ok: false, error: 'Limite de conversas ativas atingido.', code: 'ACTIVE_MATCH_LIMIT' }
    }

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

  if (check.toState === 'ACTIVE' && existing.status !== 'ACTIVE') {
    const capacity = await checkActiveMatchCapacity(existing.profileOneId, existing.profileTwoId)
    if (!capacity.ok) return { ok: false, error: 'Limite de conversas ativas atingido.', code: 'ACTIVE_MATCH_LIMIT' }
  }

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
