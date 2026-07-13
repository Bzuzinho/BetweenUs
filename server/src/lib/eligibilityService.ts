import prisma from './prisma'

// ─── EligibilityService — Sprint 2.5 consistency audit ────────────────────────
//
// Documents and centralizes what the codebase ALREADY enforces (verified by
// reading each route, not invented), so the same rules stop being duplicated
// ad-hoc. Read-only / reporting for now — see the recommendation at the
// bottom before wiring this into like/match/chat as an enforcement gate.
//
// ── Lifecycle matrix (User x Profile x Verification), as implemented today ──
//
// User.status:         PENDING_VERIFICATION | ACTIVE | SUSPENDED | BANNED | DELETED
// Profile.status:       DRAFT (not modeled — profiles are created already PENDING_REVIEW)
//                        | PENDING_REVIEW | APPROVED | REJECTED | HIDDEN | SUSPENDED
// Verification.status:  PENDING | APPROVED | REJECTED | EXPIRED (or no row at all)
//
// Valid/observed combinations and what they mean in the current code:
//
//  User PENDING_VERIFICATION + no Profile
//    → can log in (auth.ts login only blocks BANNED/SUSPENDED/DELETED) and
//      can hit most authenticated routes (requireAuth blocks the same 3
//      statuses) — but /api/profiles POST is how a Profile gets created, and
//      most other routes 404 with "Cria o teu perfil primeiro." until then.
//
//  User PENDING_VERIFICATION + Profile APPROVED
//    → valid: happens whenever a moderator approves a profile before the
//      owner has verified their email (PUT /admin/profiles/:id/status
//      auto-activates the User via evaluateAndActivateUser as a side effect,
//      see userActivationService.ts). Once that runs, this combination stops
//      existing — but there's a window where it's true mid-request.
//    → does NOT appear in discovery (discovery.ts requires user.status
//      ACTIVE), even though the profile itself is APPROVED.
//
//  User ACTIVE + Profile PENDING_REVIEW
//    → valid and common: default profile creation state. User can use the
//      app, cannot appear in discovery until a moderator approves it.
//
//  User SUSPENDED/BANNED + Profile APPROVED
//    → Profile keeps its historical status (nothing un-approves it), but
//      discovery.ts's `user: { status: 'ACTIVE' }` filter already excludes
//      them. requireAuth also blocks SUSPENDED/BANNED from all authenticated
//      routes, so in practice they can't do anything with the app regardless
//      of what Profile.status says.
//
// ── What "eligible" means, verified against the actual route code ──────────

export interface Eligibility {
  canLogin: boolean
  canUseApp: boolean
  canAppearInDiscovery: boolean
  canLike: boolean
  canMatch: boolean
  canChat: boolean
  canRequestPrivatePhotos: boolean
  reasons: string[]
}

const BLOCKED_APP_STATUSES = new Set(['BANNED', 'SUSPENDED', 'DELETED'])

export async function forUser(userId: string): Promise<Eligibility> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true, adminRole: true,
      profile: { select: { status: true, privacySettings: true } },
    }
  })

  const reasons: string[] = []
  if (!user) {
    return {
      canLogin: false, canUseApp: false, canAppearInDiscovery: false,
      canLike: false, canMatch: false, canChat: false, canRequestPrivatePhotos: false,
      reasons: ['USER_NOT_FOUND']
    }
  }

  // Matches auth.ts POST /login and middleware/auth.ts requireAuth exactly —
  // both gate on the same three statuses today, so canLogin === canUseApp.
  const blocked = BLOCKED_APP_STATUSES.has(user.status)
  if (blocked) reasons.push(`ACCOUNT_${user.status}`)
  const canLogin = !blocked
  const canUseApp = !blocked

  const profileApproved = user.profile?.status === 'APPROVED'
  const isAdmin = !!user.adminRole
  const visibleInDiscoverySetting = user.profile?.privacySettings?.visibleInDiscovery !== false
  const notInvisible = !user.profile?.privacySettings?.invisibleMode

  // Matches discovery.ts's `where` clause + the visibility filter added in
  // this same audit (privacySettings was fetched there but never applied).
  const canAppearInDiscovery = canUseApp && user.status === 'ACTIVE' && profileApproved && !isAdmin
    && visibleInDiscoverySetting && notInvisible
  if (canUseApp && user.status === 'ACTIVE' && !profileApproved) reasons.push('PROFILE_NOT_APPROVED')
  if (canUseApp && (!visibleInDiscoverySetting || !notInvisible)) reasons.push('INVISIBLE_MODE_OR_HIDDEN')

  // discovery.ts POST /:id/like only requires requireAuth + viewer having a
  // Profile — it does not currently require the viewer's own Profile to be
  // APPROVED, nor the target's. Documented as-is, not invented stricter.
  const canLike = canUseApp && !!user.profile

  // matches.ts / couple approval flow requires an existing mutual Match row;
  // eligibility to *reach* that point is the same as canLike (both sides).
  const canMatch = canLike

  // Chat (messages.ts via conversations) requires an ACTIVE Match — same
  // requireAuth gate, no additional status requirement found beyond that.
  const canChat = canUseApp

  // photos.ts photo access requests — same requireAuth gate; Premium-only
  // gating (privacySettings.allowPhotoRequests) applies to the target, not
  // the requester's own eligibility.
  const canRequestPrivatePhotos = canUseApp

  return { canLogin, canUseApp, canAppearInDiscovery, canLike, canMatch, canChat, canRequestPrivatePhotos, reasons }
}

// BETA.2 (FASE C) follow-up — forUser()'s canAppearInDiscovery gates on
// `user.profile` (the legacy DIRECT Profile.userId relation: the profile
// this user personally owns). That's correct when checking an Individual
// Profile's own owner. It's WRONG when discoveryService.ts's
// isSharedProfileEligible calls it per ACTIVE MEMBER of a Shared Profile
// (couple/group) — a member can legitimately have no individually-owned
// Profile at all (that's the literal meaning of individualDiscoveryPolicy
// SHARED_ONLY, the default), and previously that made `user.profile` null,
// profileApproved false, and canAppearInDiscovery false for that member —
// which excluded the ENTIRE Shared Profile from everyone's Discovery,
// even though the Shared Profile itself was APPROVED and visible (already
// checked independently at discoveryService.ts's Step 1 pool query and
// Step 4 passesVisibilityPolicy). Confirmed via discoveryService.test.ts's
// "a Shared Profile itself is never filtered by its own
// individualDiscoveryPolicy" test: adding a second ProfileMember (to
// satisfy the unrelated MEMBERS completeness gate) still failed until
// this was fixed, because isSharedProfileEligible required that new
// member's OWN nonexistent individual profile to be approved.
//
// This checks only ACCOUNT-level eligibility (not banned/suspended/
// deleted, not an admin account) — never a specific Profile's own
// approval/visibility, since for a Shared Profile member that's simply
// the wrong profile to be checking.
//
// NOTE: canLike/canMatch above have the same `!!user.profile` conflation
// and would misfire the same way for a Shared-Profile-only member calling
// those actions on behalf of their couple/group — not exercised by any
// failing test today, so left as a flagged follow-up rather than expanded
// scope here.
export async function forSharedProfileMember(userId: string): Promise<{ eligible: boolean; reasons: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, adminRole: true } })
  if (!user) return { eligible: false, reasons: ['USER_NOT_FOUND'] }
  const reasons: string[] = []
  const blocked = BLOCKED_APP_STATUSES.has(user.status)
  if (blocked) reasons.push(`ACCOUNT_${user.status}`)
  const isAdmin = !!user.adminRole
  if (isAdmin) reasons.push('ADMIN_ACCOUNT')
  const eligible = !blocked && user.status === 'ACTIVE' && !isAdmin
  return { eligible, reasons }
}

// ── forProfileContext(profileId, userId) — BETA.3 Task 6 ───────────────────
//
// forUser() above answers "what can this User's ACCOUNT do", and for
// canLike/canMatch/canAppearInDiscovery it does so via `user.profile` — the
// direct Profile.userId relation, i.e. the User's own individually-owned
// Profile. forSharedProfileMember's own comment already flags why that's
// wrong for a Shared Profile's non-owning member (legitimately has no
// individually-owned Profile at all).
//
// forProfileContext is the profile-context-aware replacement: it takes the
// ACTUAL profileId a request is acting as — resolved via
// activeProfileContextService.resolveActiveProfileId /
// profileMembershipService.resolveMyProfileId, never trusted blindly from
// the client — and evaluates eligibility against THAT profile specifically,
// after confirming userId is actually allowed to act as it (owner of an
// Individual Profile, or an ACCEPTED ProfileMember of a Shared Profile).
// This is what routes should gate product actions on going forward instead
// of re-deriving ad-hoc "does a profile exist" checks per route.
//
// Scope note: wired into discovery.ts's POST /:id/like and /:id/pass in
// this same pass (the two routes BETA.3 also fixed for the underlying
// Active Profile Context resolution bug — see discovery.ts). Not yet wired
// into matches.ts/rooms.ts/photos.ts's own action routes — those already
// correctly resolve the acting profile via resolveMyProfileId, so there's
// no active-profile-context BUG there today; adding this gate to them too
// is additive defense-in-depth, not a bug fix, and is flagged as a
// follow-up rather than bundled into this pass (same reasoning as this
// file's original "wiring in as an enforcement gate is a larger change
// with real regression risk across several routes at once" note below,
// scoped down now that two concrete call sites exist and are covered by
// tests).
export interface ProfileContextEligibility {
  canUseAsContext: boolean
  canAppearInDiscovery: boolean
  canLike: boolean
  canMatch: boolean
  canChat: boolean
  canRequestPrivatePhotos: boolean
  reasons: string[]
}

export async function forProfileContext(profileId: string, userId: string): Promise<ProfileContextEligibility> {
  const deny = (reasons: string[]): ProfileContextEligibility => ({
    canUseAsContext: false, canAppearInDiscovery: false, canLike: false,
    canMatch: false, canChat: false, canRequestPrivatePhotos: false, reasons
  })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, adminRole: true } })
  if (!user) return deny(['USER_NOT_FOUND'])

  const blocked = BLOCKED_APP_STATUSES.has(user.status)
  if (blocked) return deny([`ACCOUNT_${user.status}`])

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, status: true, privacySettings: true }
  })
  if (!profile) return deny(['PROFILE_NOT_FOUND'])

  // Confirm userId may actually act as this profile — owner of an
  // Individual Profile, or an ACCEPTED ProfileMember of a Shared Profile.
  // Dynamic import: same circular-require workaround profileMembershipService
  // itself already uses for activeProfileContextService.
  const { isActiveMember } = await import('./profileMembershipService')
  const isOwner = profile.userId === userId
  const isMember = isOwner ? false : await isActiveMember(profileId, userId)
  if (!isOwner && !isMember) return deny(['NOT_A_MEMBER_OF_PROFILE'])

  const reasons: string[] = []
  const isAdmin = !!user.adminRole
  if (isAdmin) reasons.push('ADMIN_ACCOUNT')

  const canUseAsContext = true

  const profileApproved = profile.status === 'APPROVED'
  if (!profileApproved) reasons.push('PROFILE_NOT_APPROVED')
  const visibleInDiscoverySetting = (profile as any).privacySettings?.visibleInDiscovery !== false
  const notInvisible = !(profile as any).privacySettings?.invisibleMode
  if (!visibleInDiscoverySetting || !notInvisible) reasons.push('INVISIBLE_MODE_OR_HIDDEN')

  // Matches forUser()'s existing semantics exactly: canLike/canMatch/canChat/
  // canRequestPrivatePhotos don't require the profile to be APPROVED or
  // visible — only canAppearInDiscovery does. Not invented stricter here.
  const canAppearInDiscovery = canUseAsContext && profileApproved && !isAdmin && visibleInDiscoverySetting && notInvisible
  const canLike = canUseAsContext
  const canMatch = canLike
  const canChat = canUseAsContext
  const canRequestPrivatePhotos = canUseAsContext

  return { canUseAsContext, canAppearInDiscovery, canLike, canMatch, canChat, canRequestPrivatePhotos, reasons }
}

// ── Recommendation (not implemented in this pass) ──────────────────────────
// This service currently only *reports* eligibility (used by the admin
// AdminAccountTab/UserDetail views so admins can see why a user isn't
// showing up in discovery, instead of guessing). Wiring it in as an
// *enforcement* gate inside discovery.ts/matches.ts/rooms.ts to replace their
// current ad-hoc checks is a larger change with real regression risk across
// several routes at once — flagged as Sprint 3+ follow-up rather than bundled
// into this pass.
