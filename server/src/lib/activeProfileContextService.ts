// BETA.2 (FASE C) — ActiveProfileContextService
//
// Before this sprint, "my profile" meant a single Prisma row found via
// Profile.userId — that worked because a user could only ever be behind
// ONE profile row (their own, OR the couple/group's row if they created
// it — routes/couples.ts and routes/groups.ts literally converted the
// creator's own individual Profile row in place via `type: 'COUPLE'`/
// `'GROUP'`, see schema.prisma's Profile.userId comment).
//
// FASE C gives every human User exactly one Individual Profile (own
// userId, type INDIVIDUAL) that is now ALWAYS separate from any Shared
// Profile (COUPLE/GROUP) they additionally belong to via ProfileMember.
// That means a user can now be "behind" more than one profile at once —
// this service is the single place that decides which one a given request
// should act as, and the single place that lists what's available so the
// client can render a Profile Switcher.
//
// Design notes:
//  - Availability is always computed fresh from ProfileMember/Profile
//    (never trusted from User.activeProfileId alone) so a stale/dangling
//    activeProfileId can never grant access to a profile the user no
//    longer belongs to — see schema.prisma's activeProfileId comment.
//  - Default-selection policy (see resolveActiveProfileId) exists purely
//    to avoid a behavior change for users who, before this sprint, were
//    only ever "behind" their couple/group profile: if their Individual
//    Profile is still an untouched DRAFT stub (created by the FASE C
//    backfill script, never edited) and they belong to exactly one Shared
//    Profile, default to that Shared Profile. Otherwise default to the
//    Individual Profile, matching the target architecture where Individual
//    is the primary identity.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'

export type ProfileContextRole = 'OWNER' | 'MEMBER'

export interface ProfileContext {
  profileId: string
  type: 'INDIVIDUAL' | 'COUPLE' | 'GROUP'
  status: string
  role: ProfileContextRole
  displayName: string
}

// All profiles this user can currently act as: their own Individual
// Profile (if it exists yet — a brand new user who hasn't finished
// onboarding has none), plus every Shared Profile they're an ACCEPTED
// member of (creator or not).
export async function getAvailableContexts(userId: string): Promise<ProfileContext[]> {
  const contexts: ProfileContext[] = []

  const individual = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true, type: true, status: true, displayName: true }
  })
  if (individual) {
    contexts.push({
      profileId: individual.id,
      type: individual.type as any,
      status: individual.status,
      role: 'OWNER',
      displayName: individual.displayName
    })
  }

  // Shared Profiles this user belongs to via ProfileMember (ACCEPTED),
  // with the same CoupleProfile-fallback getActiveMembers already handles
  // for profiles created before the ProfileMember backfill.
  const memberships = await (prisma as any).profileMember.findMany({
    where: { userId, status: 'ACCEPTED' },
    select: { profileId: true, isCreator: true }
  })
  const legacyCouple = await prisma.coupleProfile.findFirst({
    where: { partnerTwoUserId: userId },
    select: { profileId: true }
  })
  const sharedProfileIds = new Set<string>(memberships.map((m: any) => m.profileId as string))
  if (legacyCouple) sharedProfileIds.add(legacyCouple.profileId)

  for (const profileId of sharedProfileIds) {
    // individual.id would already be in sharedProfileIds only if this user
    // somehow appears as a ProfileMember of their own Individual Profile,
    // which never happens (ProfileMember rows only exist for COUPLE/GROUP
    // profiles) — no dedup needed against `individual` above.
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, type: true, status: true, displayName: true }
    })
    if (!profile || profile.type === 'INDIVIDUAL') continue
    const isCreator = memberships.find((m: any) => m.profileId === profileId)?.isCreator
    contexts.push({
      profileId: profile.id,
      type: profile.type as any,
      status: profile.status,
      role: isCreator ? 'OWNER' : 'MEMBER',
      displayName: profile.displayName
    })
  }

  return contexts
}

// Decides which profile a request should act as. `requestedProfileId`
// lets a caller explicitly ask for one (e.g. the Profile Switcher UI just
// clicked a different context) — always validated against what's actually
// available, never trusted blindly.
export async function resolveActiveProfileId(
  userId: string,
  requestedProfileId?: string | null
): Promise<string | null> {
  const available = await getAvailableContexts(userId)
  if (available.length === 0) return null

  if (requestedProfileId) {
    const match = available.find(c => c.profileId === requestedProfileId)
    if (match) {
      await persistActiveProfileId(userId, match.profileId)
      return match.profileId
    }
    // Requested a profile the user doesn't actually belong to — ignore it
    // and fall through to the normal resolution rather than erroring, same
    // posture as a dangling User.activeProfileId.
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeProfileId: true } })
  if (user?.activeProfileId) {
    const match = available.find(c => c.profileId === user.activeProfileId)
    if (match) return match.profileId
  }

  const individual = available.find(c => c.type === 'INDIVIDUAL')
  const sharedProfiles = available.filter(c => c.type !== 'INDIVIDUAL')

  // Backward-compat default: exactly one Shared Profile + untouched DRAFT
  // Individual Profile (the FASE C backfill's stub) → keep acting as the
  // Shared Profile, same as before this sprint.
  if (sharedProfiles.length === 1 && (!individual || individual.status === 'DRAFT')) {
    await persistActiveProfileId(userId, sharedProfiles[0].profileId)
    return sharedProfiles[0].profileId
  }

  // Target-architecture default: Individual Profile is the primary
  // identity. Falls back to a Shared Profile only if the user somehow has
  // no Individual Profile at all yet (shouldn't happen post-backfill, but
  // defensive rather than returning null and breaking every route).
  const fallback = individual || sharedProfiles[0]
  await persistActiveProfileId(userId, fallback.profileId)
  return fallback.profileId
}

async function persistActiveProfileId(userId: string, profileId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { activeProfileId: profileId } }).catch(() => {})
}

// Explicit switch — used by the Profile Switcher UI's "act as" action.
// Returns the resolved context, or null if the requested profile isn't
// actually available to this user.
export async function switchActiveProfile(userId: string, profileId: string): Promise<ProfileContext | null> {
  const available = await getAvailableContexts(userId)
  const match = available.find(c => c.profileId === profileId)
  if (!match) return null
  await persistActiveProfileId(userId, profileId)
  return match
}

// Re-exported for callers that only need the list-of-members shape
// (kept here so activeProfileContextService is the one-stop import for
// FASE C profile-context concerns without forcing every caller to also
// import profileMembershipService directly).
export { getActiveMembers }
