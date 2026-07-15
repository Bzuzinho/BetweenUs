// 4.1 — ProfileMembershipService: single source of truth for "who belongs
// to this profile" (individual, couple, or future group).
//
// Before this, the same dual-read pattern (check ProfileMember, fall back
// to CoupleProfile.partnerOneUserId/partnerTwoUserId for profiles created
// before the ProfileMember backfill) was duplicated across matchService.ts,
// profiles.ts (twice), and not applied at all in webhooks.ts. Centralizing
// it here means the fallback logic only needs to be correct in one place,
// and any new consumer never has a reason to read partnerOne/partnerTwo
// directly again.
//
// CoupleProfile is NOT removed in this sprint (explicit instruction) — it
// stays as the couple-specific metadata record (coupleDescription,
// coupleStatus, invite token) while ProfileMember becomes the membership
// source of truth. See getActiveMembers() for exactly how the fallback
// works and when it's safe to remove (once every CoupleProfile row has a
// matching ProfileMember pair — check via the backfill script's output).
import { v4 as uuidv4 } from 'uuid'
import prisma from './prisma'

export interface ActiveMember {
  userId: string
  isCreator: boolean
}

// Returns everyone who currently belongs to this profile (ACCEPTED status).
// For a not-yet-backfilled couple (ProfileMember rows don't exist yet but
// CoupleProfile does), falls back to the couple's partner pair so nothing
// silently returns zero members mid-migration.
export const getActiveMembers = async (profileId: string): Promise<ActiveMember[]> => {
  const members = await (prisma as any).profileMember.findMany({
    where: { profileId, status: 'ACCEPTED', userId: { not: null } },
    select: { userId: true, isCreator: true }
  })
  if (members.length > 0) {
    return members.map((m: any) => ({ userId: m.userId as string, isCreator: m.isCreator }))
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { coupleProfile: true }
  })
  if (!profile) return []

  if (profile.coupleProfile?.coupleStatus === 'ACTIVE') {
    const out: ActiveMember[] = [{ userId: profile.coupleProfile.partnerOneUserId, isCreator: true }]
    if (profile.coupleProfile.partnerTwoUserId) {
      out.push({ userId: profile.coupleProfile.partnerTwoUserId, isCreator: false })
    }
    return out
  }

  // INDIVIDUAL, or a COUPLE still PENDING_PARTNER — just the owner.
  return profile.userId ? [{ userId: profile.userId, isCreator: true }] : []
}

export const isActiveMember = async (profileId: string, userId: string): Promise<boolean> => {
  const members = await getActiveMembers(profileId)
  return members.some(m => m.userId === userId)
}

// Reverse of getActiveMembers: given a set of userIds, returns every
// profileId any of them currently belongs to (Individual, Couple or
// Group) — not just the one they happen to be browsing as. Discovery uses
// this to exclude a person's OWN other profiles from their own feed;
// before this existed, excludeIds only had the single active profileId,
// so e.g. someone browsing as their Couple would see their own
// Individual profile show up as a candidate (and could like/block it).
// Same ProfileMember-first, CoupleProfile-fallback pattern as
// getActiveMembers, so a not-yet-backfilled couple is still covered.
export const getProfileIdsForUsers = async (userIds: string[]): Promise<string[]> => {
  if (userIds.length === 0) return []

  const [ownedProfiles, memberships, fallbackCouples] = await Promise.all([
    prisma.profile.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    (prisma as any).profileMember.findMany({
      where: { userId: { in: userIds }, status: 'ACCEPTED' },
      select: { profileId: true }
    }),
    prisma.coupleProfile.findMany({
      where: { OR: [{ partnerOneUserId: { in: userIds } }, { partnerTwoUserId: { in: userIds } }] },
      select: { profileId: true }
    }),
  ])

  return [...new Set<string>([
    ...ownedProfiles.map(p => p.id),
    ...memberships.map((m: { profileId: string }) => m.profileId),
    ...fallbackCouples.map(c => c.profileId),
  ])]
}

// Same list getRequiredApproverUserIds (matchService.ts) needs — kept as a
// separate name because "who can edit this profile" and "who must approve
// a match" happen to be the same set today (every active member), but
// that's a coincidence of the current product rules, not a structural
// guarantee. If that ever diverges, this is the one function to change.
export const getRequiredApprovers = async (profileId: string): Promise<string[]> => {
  const members = await getActiveMembers(profileId)
  return members.map(m => m.userId)
}

// Invites someone new to a profile (couple partner or group member) by
// email. Returns the invite token the caller can build an invite URL from.
export const inviteMember = async (profileId: string, email: string): Promise<{ inviteToken: string }> => {
  const inviteToken = uuidv4()
  await (prisma as any).profileMember.create({
    data: { profileId, invitedEmail: email, status: 'PENDING', inviteToken }
  })
  return { inviteToken }
}

// Accepts a pending invite by token, attaching the accepting user's id.
// Returns null if the token doesn't match a pending invite (already used,
// never existed, or was for a different profile than expected).
export const acceptMembership = async (inviteToken: string, userId: string) => {
  const invite = await (prisma as any).profileMember.findFirst({
    where: { inviteToken, status: 'PENDING' }
  })
  if (!invite) return null
  const updated = await (prisma as any).profileMember.update({
    where: { id: invite.id },
    data: { userId, status: 'ACCEPTED', respondedAt: new Date(), inviteToken: null }
  })
  // 5.8 — a couple/group going from 1 to 2+ active members changes what
  // "this profile" effectively is for compatibility purposes (relationship
  // context, who's behind it) - invalidate rather than leave a stale score
  // computed against the pre-acceptance membership.
  const { invalidateScoresForProfile } = await import('./scoreInvalidationService')
  await invalidateScoresForProfile(invite.profileId).catch(() => {})
  // 6.1 — a newly-accepted member wasn't around for whatever the current
  // Agreement round already decided; expire it so the profile starts a
  // clean round with everyone who's actually present able to answer.
  const { expireAgreementOnMembershipChange } = await import('./profileAgreementService')
  await expireAgreementOnMembershipChange(invite.profileId).catch(() => {})
  return updated
}

export const declineMembership = async (inviteToken: string) => {
  const invite = await (prisma as any).profileMember.findFirst({
    where: { inviteToken, status: 'PENDING' }
  })
  if (!invite) return null
  return (prisma as any).profileMember.update({
    where: { id: invite.id },
    data: { status: 'DECLINED', respondedAt: new Date(), inviteToken: null }
  })
}

// 6.1 — lifted out of routes/profiles.ts (where it was a private, unexported
// helper duplicated in spirit across couples.ts's older Profile.userId-only
// routes) so every new Sprint 6 router (agreements, travel, photos) resolves
// "my profile" the same correct way.
//
// BETA.2 (FASE C) — before this, "owned profile" (Profile.userId) and "the
// profile I act as" were the same thing, because a couple/group creator's
// individual Profile row WAS their couple/group row (converted in place).
// Now that every user has a separate Individual Profile from any Shared
// Profile they belong to, those two questions are different, and this
// function answers the second one (delegates to
// activeProfileContextService.resolveActiveProfileId, which is also what
// decides Profile Switcher defaults) rather than the first. Dynamic import
// to avoid a circular require — activeProfileContextService imports
// getActiveMembers from this file, same pattern already used below for
// scoreInvalidationService/profileAgreementService.
export const resolveMyProfileId = async (userId: string): Promise<string | null> => {
  const { resolveActiveProfileId } = await import('./activeProfileContextService')
  return resolveActiveProfileId(userId)
}

// Removes (or marks declined, if never fully joined) a member from a
// profile — used when a couple separates or a group member leaves. This is
// what couples.ts DELETE /me was missing: it flipped CoupleProfile.
// coupleStatus to SEPARATED but left the ProfileMember rows as ACCEPTED,
// so the two models disagreed about who belonged to the profile.
export const removeMember = async (profileId: string, userId: string): Promise<void> => {
  await (prisma as any).profileMember.updateMany({
    where: { profileId, userId },
    data: { status: 'DECLINED', respondedAt: new Date() }
  })
  // 5.8 — same reasoning as acceptMembership: membership shrinking changes
  // the profile's effective compatibility inputs.
  const { invalidateScoresForProfile } = await import('./scoreInvalidationService')
  await invalidateScoresForProfile(profileId).catch(() => {})
  // 6.1 — membership shrinking also invalidates the couple's current
  // Agreement round: it no longer represents who's actually on the profile.
  const { expireAgreementOnMembershipChange } = await import('./profileAgreementService')
  await expireAgreementOnMembershipChange(profileId).catch(() => {})
}
