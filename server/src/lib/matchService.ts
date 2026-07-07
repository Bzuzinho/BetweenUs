import prisma from './prisma'

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

    const match = await prisma.match.create({
      data: {
        profileOneId: actorProfileId,
        profileTwoId: targetProfileId,
        status: requiresDoubleConsent ? 'PENDING_COUPLE_APPROVAL' : 'ACTIVE',
        matchedAt: requiresDoubleConsent ? null : new Date(),
        conversation: { create: { type: requiresDoubleConsent ? 'COUPLE_GROUP' : 'ONE_TO_ONE' } }
      }
    })

    return requiresDoubleConsent
      ? { kind: 'MATCH_PENDING_COUPLE_APPROVAL', matchId: match.id }
      : { kind: 'MATCH_CREATED', matchId: match.id }
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
