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

// ── Recommendation (not implemented in this pass) ──────────────────────────
// This service currently only *reports* eligibility (used by the admin
// AdminAccountTab/UserDetail views so admins can see why a user isn't
// showing up in discovery, instead of guessing). Wiring it in as an
// *enforcement* gate inside discovery.ts/matches.ts/rooms.ts to replace their
// current ad-hoc checks is a larger change with real regression risk across
// several routes at once — flagged as Sprint 3+ follow-up rather than bundled
// into this pass.
