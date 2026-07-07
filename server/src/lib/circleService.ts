// 10.9/10.10/10.12 — CircleService: membership request/approve/decline/
// leave/remove, local-moderator promotion, and the privacy view that
// respects PrivacySettings.showCircleBadge/hideCircleMemberships. Circle
// CREATION itself lives in circles.ts's admin routes only (10.11 — no
// user-facing creation path exists anywhere, including here).
import prisma from './prisma'

export type CircleMembershipStatus = 'REQUESTED' | 'APPROVED' | 'DECLINED' | 'LEFT' | 'REMOVED'
export type CircleMemberRole = 'MEMBER' | 'LOCAL_MODERATOR'

export interface MembershipResult {
  ok: boolean
  error?: string
  membership?: any
}

// 10.9 — join eligibility depends on the Circle's own visibility, not just
// its status:
//   DISCOVERABLE  — anyone can browse it and request to join.
//   PRIVATE       — not surfaced in the public browse list (circles.ts's
//                   GET / filters these out), but a REQUESTED join is
//                   still allowed if the user already knows the slug
//                   (e.g. shared a direct link) — "private" restricts
//                   discoverability, not joinability.
//   INVITE_ONLY   — self-service join is blocked entirely; membership can
//                   only be created by an admin/local moderator via
//                   addMemberDirectly below.
export const requestMembership = async (circleId: string, profileId: string): Promise<MembershipResult> => {
  const circle = await (prisma as any).circle.findUnique({ where: { id: circleId } })
  if (!circle) return { ok: false, error: 'Circle não encontrado.' }
  if (circle.status !== 'ACTIVE') return { ok: false, error: 'Este Circle não está ativo.' }
  if (circle.visibility === 'INVITE_ONLY') return { ok: false, error: 'Este Circle é apenas por convite.' }

  const existing = await (prisma as any).circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } }
  })
  if (existing && !['LEFT', 'DECLINED', 'REMOVED'].includes(existing.status)) {
    return { ok: false, error: 'Já tens um pedido ou participação neste Circle.', membership: existing }
  }

  const membership = existing
    ? await (prisma as any).circleMembership.update({
        where: { id: existing.id }, data: { status: 'REQUESTED', role: 'MEMBER', joinedAt: new Date() }
      })
    : await (prisma as any).circleMembership.create({
        data: { circleId, profileId, status: 'REQUESTED', role: 'MEMBER' }
      })
  return { ok: true, membership }
}

// Admin/local-moderator adding someone directly — the only join path for
// INVITE_ONLY circles, and also usable as a shortcut on DISCOVERABLE/
// PRIVATE ones (skips the REQUESTED step).
export const addMemberDirectly = async (circleId: string, profileId: string): Promise<MembershipResult> => {
  const circle = await (prisma as any).circle.findUnique({ where: { id: circleId } })
  if (!circle) return { ok: false, error: 'Circle não encontrado.' }

  const existing = await (prisma as any).circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } }
  })
  const membership = existing
    ? await (prisma as any).circleMembership.update({
        where: { id: existing.id }, data: { status: 'APPROVED', joinedAt: new Date() }
      })
    : await (prisma as any).circleMembership.create({
        data: { circleId, profileId, status: 'APPROVED', role: 'MEMBER', joinedAt: new Date() }
      })
  return { ok: true, membership }
}

const isModeratorOf = async (circleId: string, profileId: string): Promise<boolean> => {
  const m = await (prisma as any).circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } }
  })
  return !!m && m.status === 'APPROVED' && m.role === 'LOCAL_MODERATOR'
}

export const approveMembership = async (circleId: string, membershipId: string, actingProfileId: string, isAdmin: boolean): Promise<MembershipResult> => {
  if (!isAdmin && !(await isModeratorOf(circleId, actingProfileId))) {
    return { ok: false, error: 'Sem permissão para aprovar pedidos neste Circle.' }
  }
  const membership = await (prisma as any).circleMembership.findFirst({ where: { id: membershipId, circleId } })
  if (!membership || membership.status !== 'REQUESTED') return { ok: false, error: 'Pedido não encontrado ou já processado.' }

  const updated = await (prisma as any).circleMembership.update({
    where: { id: membershipId }, data: { status: 'APPROVED', joinedAt: new Date() }
  })
  return { ok: true, membership: updated }
}

export const declineMembership = async (circleId: string, membershipId: string, actingProfileId: string, isAdmin: boolean): Promise<MembershipResult> => {
  if (!isAdmin && !(await isModeratorOf(circleId, actingProfileId))) {
    return { ok: false, error: 'Sem permissão para recusar pedidos neste Circle.' }
  }
  const membership = await (prisma as any).circleMembership.findFirst({ where: { id: membershipId, circleId } })
  if (!membership || membership.status !== 'REQUESTED') return { ok: false, error: 'Pedido não encontrado ou já processado.' }

  const updated = await (prisma as any).circleMembership.update({ where: { id: membershipId }, data: { status: 'DECLINED' } })
  return { ok: true, membership: updated }
}

export const leaveCircle = async (circleId: string, profileId: string): Promise<MembershipResult> => {
  const membership = await (prisma as any).circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } }
  })
  if (!membership || membership.status !== 'APPROVED') return { ok: false, error: 'Não estás neste Circle.' }

  const updated = await (prisma as any).circleMembership.update({ where: { id: membership.id }, data: { status: 'LEFT' } })
  return { ok: true, membership: updated }
}

export const removeMember = async (circleId: string, membershipId: string, actingProfileId: string, isAdmin: boolean): Promise<MembershipResult> => {
  if (!isAdmin && !(await isModeratorOf(circleId, actingProfileId))) {
    return { ok: false, error: 'Sem permissão para remover membros deste Circle.' }
  }
  const membership = await (prisma as any).circleMembership.findFirst({ where: { id: membershipId, circleId } })
  if (!membership || membership.status !== 'APPROVED') return { ok: false, error: 'Membro não encontrado.' }

  const updated = await (prisma as any).circleMembership.update({ where: { id: membershipId }, data: { status: 'REMOVED' } })
  return { ok: true, membership: updated }
}

// Admin-only — promoting/demoting a LOCAL_MODERATOR is a trust decision
// scoped to a single Circle, but who gets to grant that trust stays with
// global admins, not existing local moderators (avoids a moderator
// promoting an ally to entrench themselves in a community they don't own).
export const setMemberRole = async (circleId: string, membershipId: string, role: CircleMemberRole): Promise<MembershipResult> => {
  const membership = await (prisma as any).circleMembership.findFirst({ where: { id: membershipId, circleId } })
  if (!membership || membership.status !== 'APPROVED') return { ok: false, error: 'Membro não encontrado.' }

  const updated = await (prisma as any).circleMembership.update({ where: { id: membershipId }, data: { role } })
  return { ok: true, membership: updated }
}

// 10.12 — the privacy gate for showing profileId's Circle memberships to
// ANY other viewer (public profile page, another member's view, etc.).
// hideCircleMemberships wins outright; otherwise showCircleBadge must be
// explicitly on. Default (both false... well hideCircleMemberships
// defaults false, showCircleBadge defaults false) is "hidden" — an
// unconfigured user shows nothing, matching the spec's "não é pública por
// default".
export const isMembershipVisibleToOthers = async (profileId: string): Promise<boolean> => {
  const settings = await (prisma as any).privacySettings.findUnique({ where: { profileId } })
  if (!settings) return false
  if (settings.hideCircleMemberships) return false
  return !!settings.showCircleBadge
}
