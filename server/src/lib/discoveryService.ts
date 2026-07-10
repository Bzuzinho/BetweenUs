// 5.2 — DiscoveryService: the 13-step pipeline the Sprint 5 spec asks for,
// replacing discovery.ts's GET / route body (which had all of this inlined
// and, per the Sprint 5 audit, several real gaps: no bidirectional block
// check, no contact-hash check, no travel mode, no Profile.visibilityMode
// check, no pagination, no persisted/cached score).
//
// Each step below is a small, separately named function so it stays
// individually testable (5.12) without needing 13 separate files/classes -
// "criar abstrações apenas quando úteis, não criar 13 microservices
// artificiais" per the spec.
import prisma from './prisma'
import * as eligibilityService from './eligibilityService'
import { getActiveMembers } from './profileMembershipService'
import { evaluateIntentionCompatibility, type ProfileIntentionInput } from './intentionCompatibilityService'
import { evaluateBoundaryCompatibility } from './boundaryCompatibilityService'
import { evaluateCandidateConstraints, type ConstraintBoundaryInput, type CandidateStructuralProps } from './candidateConstraintService'
import { evaluateCompleteness } from './profileCompletenessService'
import { getOrCalculateScore } from './compatibilityScoreService'
import { buildExplanation } from './compatibilityExplanationService'
import { hashContactWithVersion } from './contactHashService'
import type { BetweenScoreBoundaryInput, BetweenScoreProfileInput, BetweenScoreReasonCode } from './betweenScoreService'

export interface DiscoveryFilters {
  type?: 'INDIVIDUAL' | 'COUPLE' | 'GROUP'
}

export interface DiscoveryCandidateItem {
  profile: any
  betweenScore: number
  compatibility: {
    intentions: number
    boundaries: number
    context: number
    discretion: number
    location: number
  }
  reasons: string[]
  // 11.4 — the raw BetweenScoreService reason codes behind `reasons`
  // (already computed per candidate below, just not previously exposed on
  // the return shape). Added so recommendationRanker.ts can derive its own
  // explainability codes (11.10) without recomputing BetweenScore itself —
  // it consumes this exact field, never touches boundary/intention data
  // directly.
  reasonCodes: BetweenScoreReasonCode[]
}

export interface DiscoveryResult {
  items: DiscoveryCandidateItem[]
  nextCursor: string | null
}

// How many eligible-pool candidates get fully scored+sorted per request.
// This is what makes the cursor pagination "recompute a bounded pool and
// slice" rather than a true DB-level keyset scan (see the cursor design
// note further down) - deliberately bounded so a single request can't
// blow up on a very large candidate set. 5.11 flags this as the thing to
// revisit if the eligible pool regularly exceeds this cap in production.
const POOL_CAP = 500

// ── Step 1: Candidate Pool ─────────────────────────────────────────────────
const fetchCandidatePool = async (viewerProfile: any, filters: DiscoveryFilters, excludeIds: Set<string>) => {
  return prisma.profile.findMany({
    where: {
      id: { notIn: [...excludeIds] },
      status: 'APPROVED',
      // BETA.2 (FASE C) — a Shared Profile (COUPLE/GROUP) no longer has a
      // `user` relation at all (userId is null — ownership moved to
      // ProfileMember, see schema.prisma's Profile.userId comment), so the
      // old unconditional `user: {status:'ACTIVE', adminRole:null}` filter
      // would silently exclude every couple/group from this query (an
      // inner-join-like filter on an optional relation excludes null
      // rows). Individual Profiles still get that check here as a
      // pre-filter (Step 2 re-checks it properly via EligibilityService);
      // Shared Profiles skip it here and get their own member-based check
      // in Step 2 below instead.
      OR: [
        { user: { status: 'ACTIVE', adminRole: null } },
        { userId: null },
      ],
      ...(filters.type && { type: filters.type }),
    },
    include: {
      user: { select: { id: true, email: true, ageVerifiedAt: true, verification: { select: { type: true, status: true } } } },
      photos: { where: { moderationStatus: 'APPROVED' }, take: 3 },
      intentions: { include: { intention: true } },
      boundaries: { include: { boundary: true } },
      privacySettings: true,
      travelModes: { where: { active: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], // stable base order, independent of score
    take: POOL_CAP,
  })
}

// ── Step 2: User Eligibility (uses EligibilityService, 5.3) ────────────────
const isUserEligible = async (ownerUserId: string): Promise<boolean> => {
  const eligibility = await eligibilityService.forUser(ownerUserId)
  return eligibility.canAppearInDiscovery
}

// BETA.2 (FASE C) — Shared Profile equivalent of isUserEligible. There's no
// single owning user to check anymore (Profile.userId is null for
// COUPLE/GROUP), so this checks every ACTIVE member instead — same ALL
// posture as ApprovalPolicyService's COUPLE default (a couple/group's
// safety-relevant eligibility is only as good as its least-eligible
// member; one suspended/banned member hides the whole shared profile
// rather than showing a partial/misleading card).
//
// Uses eligibilityService.forSharedProfileMember, NOT isUserEligible /
// forUser — forUser's canAppearInDiscovery gates on the member's own
// individually-owned Profile being APPROVED, which a Shared Profile
// member legitimately may not have at all (SHARED_ONLY policy, the
// default). That wrongly excluded the whole Shared Profile whenever a
// member had no separate individual profile — see
// eligibilityService.ts's forSharedProfileMember comment for the full
// account of the bug and the discoveryService.test.ts case that caught
// it. Account-level checks only here; the Shared Profile's OWN
// status/visibility is already checked at Step 1 (pool query) and Step 4
// (passesVisibilityPolicy) above.
const isSharedProfileEligible = async (profileId: string): Promise<boolean> => {
  const members = await getActiveMembers(profileId)
  if (members.length === 0) return false
  const results = await Promise.all(members.map(m => eligibilityService.forSharedProfileMember(m.userId)))
  return results.every(r => r.eligible)
}

// ── Step 3: Profile Eligibility (4.9 ProfileCompletenessService) ──────────
const isProfileEligible = (completenessMissing: string[]): boolean =>
  !completenessMissing.includes('PRIMARY_PHOTO') && !completenessMissing.includes('MEMBERS')

// ── Step 4: Visibility Policy ───────────────────────────────────────────────
// Checks BOTH PrivacySettings.invisibleMode/visibleInDiscovery (the ones
// discovery.ts already checked) AND Profile.visibilityMode (the
// ProfileVisibility enum found dead in the audit - written by privacy.ts
// alongside invisibleMode but never read anywhere). MATCHES_ONLY is
// treated as excluded from discovery too: by definition it means "only
// people I've already matched with should see me", which is the opposite
// of appearing to NEW candidates.
const passesVisibilityPolicy = (candidate: any): boolean => {
  if (candidate.privacySettings?.visibleInDiscovery === false) return false
  if (candidate.privacySettings?.invisibleMode) return false
  if (candidate.visibilityMode === 'INVISIBLE') return false
  if (candidate.visibilityMode === 'MATCHES_ONLY') return false
  return true
}

// ── Step 4.5: Shared Profile individual-discovery policy (BETA.2 FASE C) ──
// An Individual Profile whose owner is also an ACCEPTED member of a Shared
// Profile (couple/group) is hidden from Discovery UNLESS that Shared
// Profile's members have unanimously opted into
// individualDiscoveryPolicy: INDIVIDUAL_AND_SHARED (default SHARED_ONLY —
// see the schema.prisma enum comment and routes/profiles.ts's /:id/policy
// endpoints for how that's changed). Only applies to type INDIVIDUAL
// candidates — a Shared Profile itself is never affected by its own
// policy field.
const passesIndividualDiscoveryPolicy = async (candidate: any): Promise<boolean> => {
  if (candidate.type !== 'INDIVIDUAL' || !candidate.userId) return true
  const membership = await (prisma as any).profileMember.findFirst({
    where: { userId: candidate.userId, status: 'ACCEPTED' },
    select: { profile: { select: { type: true, individualDiscoveryPolicy: true } } }
  })
  if (!membership || membership.profile?.type === 'INDIVIDUAL') return true
  return membership.profile?.individualDiscoveryPolicy === 'INDIVIDUAL_AND_SHARED'
}

// ── Step 5: Direct Blocks (bidirectional — 5.3 audit fix) ──────────────────
// Before this, only "did the viewer block/pass the candidate" was checked
// (via excludeIds, built from the viewer's own ProfileAction rows). A
// profile that blocked the VIEWER, without the viewer ever blocking back,
// could still appear in the viewer's discovery feed — this fetches that
// reverse set once (not per-candidate) and folds it into the exclusion set.
const fetchProfilesThatBlockedViewer = async (viewerProfileId: string): Promise<Set<string>> => {
  const rows = await prisma.profileAction.findMany({
    where: { targetProfileId: viewerProfileId, action: 'BLOCK' },
    select: { actorProfileId: true }
  })
  return new Set(rows.map((r: { actorProfileId: string }) => r.actorProfileId))
}

// ── Step 6: Contact Blocks ───────────────────────────────────────────────
// BlockedContactHash existed (Sprint 3.5) with zero callers outside its own
// CRUD routes - never consulted by discovery. Fetches the viewer's blocked
// hashes ONCE, then compares in-memory against each candidate's email
// (hashed under whichever key versions the viewer's stored rows use) -
// avoids an isContactBlocked() DB round-trip per candidate.
const buildContactBlockChecker = async (viewerUserId: string) => {
  // Explicit annotation, matching contactHashService.ts's own workaround —
  // the generated Prisma client in this environment predates keyVersion
  // (added in Sprint 3.5) and infers it as unknown otherwise, even though
  // it's a real column the query actually returns.
  const rows: Array<{ contactHash: string; keyVersion: number }> = await prisma.blockedContactHash.findMany({
    where: { userId: viewerUserId },
    select: { contactHash: true, keyVersion: true }
  })
  if (rows.length === 0) return (_email: string) => false
  const versions = [...new Set(rows.map(r => r.keyVersion))]
  return (email: string): boolean => {
    if (!email) return false
    return versions.some(v => rows.some(r => r.keyVersion === v && r.contactHash === hashContactWithVersion(email, v)))
  }
}

// ── Steps 7-10: compatibility inputs (feed BetweenScoreService) ───────────
const toIntentionInputs = (profile: any): ProfileIntentionInput[] =>
  (profile.intentions || []).map((pi: any) => ({
    slug: pi.intention?.slug, preference: pi.preference, complementarySlug: pi.intention?.complementarySlug || null
  })).filter((i: ProfileIntentionInput) => !!i.slug)

const toBoundaryInputs = (profile: any): BetweenScoreBoundaryInput[] =>
  (profile.boundaries || []).map((pb: any) => ({
    slug: pb.boundary?.slug, preference: pb.preference,
    isHardBoundary: !!pb.boundary?.isHardBoundary, ruleType: pb.boundary?.ruleType || 'MUTUAL_ALIGNMENT',
    category: pb.boundary?.category || null,
  })).filter((b: BetweenScoreBoundaryInput) => !!b.slug)

const toScoreInput = (profile: any): BetweenScoreProfileInput => ({
  id: profile.id,
  relationshipStatus: profile.relationshipStatus,
  discretionLevel: profile.discretionLevel,
  city: profile.city,
  locationLat: profile.locationLat,
  locationLng: profile.locationLng,
  intentions: toIntentionInputs(profile),
  boundaries: toBoundaryInputs(profile),
  activeTravelCities: (profile.travelModes || []).map((t: any) => t.city),
})

// Discovery validation follow-up — Candidate Constraints (Step 7, ahead of
// Between Score). `toConstraintBoundaryInputs` mirrors `toBoundaryInputs`
// but additionally carries `constraintType`, since that's the only field
// candidateConstraintService.ts actually reads. `toStructuralProps` reuses
// the exact same "verified" definition already used elsewhere
// (heuristicRecommendationRanker.ts's isVerified: Verification.status ===
// 'APPROVED') — never a new one invented for this fix.
const toConstraintBoundaryInputs = (profile: any): ConstraintBoundaryInput[] =>
  (profile.boundaries || []).map((pb: any) => ({
    slug: pb.boundary?.slug, preference: pb.preference,
    ruleType: pb.boundary?.ruleType || 'MUTUAL_ALIGNMENT',
    constraintType: pb.boundary?.constraintType || null,
  })).filter((b: ConstraintBoundaryInput) => !!b.slug)

const toStructuralProps = (profile: any): CandidateStructuralProps => ({
  profileType: profile.type,
  isVerified: profile.user?.verification?.status === 'APPROVED',
})

// ── Cursor (5.4) ─────────────────────────────────────────────────────────
// Encodes the full sort key (score, createdAt, id) of the last item on a
// page. Ranking DOES change over time (score depends on both sides'
// intentions/boundaries/location, and can be invalidated mid-session by
// either profile - 5.8), so this is only stable WITHIN a session of pages
// requested close together, the same caveat any ranked feed has. Composite
// tuple with `id` as the final tiebreaker guarantees no duplicate/ambiguous
// position even when two candidates land on the exact same score.
interface Cursor { score: number; createdAt: string; id: string }

const encodeCursor = (c: Cursor): string => Buffer.from(JSON.stringify(c)).toString('base64url')
const decodeCursor = (raw: string): Cursor | null => {
  try { return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) } catch { return null }
}

// Strict "is `a` ranked after `b`" for the (score desc, createdAt desc, id asc) order.
const isAfterCursor = (item: { score: number; createdAt: Date; id: string }, cursor: Cursor): boolean => {
  if (item.score !== cursor.score) return item.score < cursor.score
  const itemTime = item.createdAt.getTime()
  const cursorTime = new Date(cursor.createdAt).getTime()
  if (itemTime !== cursorTime) return itemTime < cursorTime
  return item.id > cursor.id
}

export const getCandidates = async (
  viewerProfileId: string,
  filters: DiscoveryFilters = {},
  cursor: string | null = null,
  limit: number = 20
): Promise<DiscoveryResult> => {
  const viewerProfile = await prisma.profile.findUnique({
    where: { id: viewerProfileId },
    include: {
      intentions: { include: { intention: true } },
      // Discovery validation follow-up — boundary.constraintType is read
      // via the existing `boundary: true` include (constraintType is a
      // scalar column on Boundary, no extra include needed).
      boundaries: { include: { boundary: true } },
      travelModes: { where: { active: true } },
      // Discovery validation follow-up — needed for the reverse direction
      // of Candidate Constraints: a candidate with e.g. singles_only=YES
      // must not see the viewer either if the viewer is a COUPLE, and
      // verified_only needs the viewer's own verification status when the
      // CANDIDATE is the one with the constraint.
      user: { select: { verification: { select: { status: true } } } },
    }
  })
  if (!viewerProfile) return { items: [], nextCursor: null }

  // BETA.2 (FASE C) — a Shared Profile viewer (userId null — see
  // schema.prisma's Profile.userId comment) has no single owning user to
  // check canUseApp/contact-blocks against; both checks below are done
  // across every active member instead (same ALL posture as
  // isSharedProfileEligible on the candidate side — one banned/suspended
  // member blocks browsing for the whole shared context).
  const viewerMembers = viewerProfile.userId
    ? [viewerProfile.userId]
    : (await getActiveMembers(viewerProfileId)).map(m => m.userId)

  // Step 2 (viewer side): a viewer whose own account can't use discovery
  // shouldn't get results either, independent of any candidate's eligibility.
  const viewerEligibilities = await Promise.all(viewerMembers.map(uid => eligibilityService.forUser(uid)))
  if (viewerMembers.length === 0 || viewerEligibilities.some(e => !e.canUseApp)) return { items: [], nextCursor: null }

  const [myActions, blockedByProfileIds, contactBlockCheckers] = await Promise.all([
    prisma.profileAction.findMany({ where: { actorProfileId: viewerProfileId }, select: { targetProfileId: true, action: true } }),
    fetchProfilesThatBlockedViewer(viewerProfileId),
    Promise.all(viewerMembers.map(uid => buildContactBlockChecker(uid))),
  ])
  const contactIsBlocked = (email: string): boolean => contactBlockCheckers.some(check => check(email))

  const myMatches = await prisma.match.findMany({
    where: { OR: [{ profileOneId: viewerProfileId }, { profileTwoId: viewerProfileId }], status: { in: ['PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE'] } },
    select: { profileOneId: true, profileTwoId: true }
  })

  type MyActionRow = { targetProfileId: string; action: string }
  type MyMatchRow = { profileOneId: string; profileTwoId: string }

  const excludeIds = new Set<string>([
    viewerProfileId,
    ...(myActions as MyActionRow[]).filter((a: MyActionRow) => ['BLOCK', 'PASS'].includes(a.action)).map((a: MyActionRow) => a.targetProfileId),
    ...blockedByProfileIds,
  ])
  ;(myMatches as MyMatchRow[]).forEach((m: MyMatchRow) => excludeIds.add(m.profileOneId === viewerProfileId ? m.profileTwoId : m.profileOneId))

  // Step 1
  const pool = await fetchCandidatePool(viewerProfile, filters, excludeIds)

  const viewerScoreInput = toScoreInput(viewerProfile)
  // Discovery validation follow-up — computed once per request, not per
  // candidate (the viewer doesn't change across the loop).
  const viewerConstraintBoundaries = toConstraintBoundaryInputs(viewerProfile)
  const viewerStructuralProps = toStructuralProps(viewerProfile)
  const likedIds = new Set((myActions as MyActionRow[]).filter((a: MyActionRow) => a.action === 'LIKE').map((a: MyActionRow) => a.targetProfileId))

  const scored: Array<{ candidate: any; score: number; breakdown: any; reasonCodes: string[]; explanation: string[] }> = []

  for (const candidate of pool) {
    // Step 2 — BETA.2 (FASE C): Shared Profile candidates (userId null)
    // have no single owning user, so they're checked via every active
    // member instead (isSharedProfileEligible).
    const candidateEligible = candidate.userId
      ? await isUserEligible(candidate.userId)
      : await isSharedProfileEligible(candidate.id)
    if (!candidateEligible) continue
    // Step 6 — checked before the completeness call since it's the
    // cheapest check (pure in-memory, no DB call - candidate.user.email
    // was already fetched as part of the Step 1 pool query) and most
    // likely to exclude, so fail fast.
    if (candidate.user?.email && contactIsBlocked(candidate.user.email)) continue
    // Step 3
    const completeness = await evaluateCompleteness(candidate as any)
    if (!isProfileEligible(completeness.missing)) continue
    // Step 4
    if (!passesVisibilityPolicy(candidate)) continue
    // Step 4.5 (BETA.2 FASE C)
    if (!(await passesIndividualDiscoveryPolicy(candidate))) continue

    // Step 7 (Discovery validation follow-up) — Candidate Constraints,
    // evaluated BEFORE intention/boundary compatibility and BEFORE Between
    // Score, per the pipeline ordering agreed for this fix: Candidate Pool
    // -> Eligibility -> Visibility -> Blocks -> Contact Blocks ->
    // CANDIDATE CONSTRAINTS -> Intention Compatibility -> Boundary Mutual
    // Compatibility -> Between Score. A hard eligibility gate, never a
    // score input (positive or negative) — see candidateConstraintService.ts.
    const candidateConstraintBoundaries = toConstraintBoundaryInputs(candidate)
    const candidateStructuralProps = toStructuralProps(candidate)
    const constraintOk = evaluateCandidateConstraints(viewerConstraintBoundaries, candidateStructuralProps).compatible
      && evaluateCandidateConstraints(candidateConstraintBoundaries, viewerStructuralProps).compatible
    if (!constraintOk) continue

    // Steps 8-9 — hard exclusions (both directions), same as discovery.ts
    // had, now centralized here instead of duplicated at the route level.
    const candidateScoreInput = toScoreInput(candidate)
    const intentionOk = evaluateIntentionCompatibility(viewerScoreInput.intentions, candidateScoreInput.intentions).compatible
      && evaluateIntentionCompatibility(candidateScoreInput.intentions, viewerScoreInput.intentions).compatible
    if (!intentionOk) continue
    const boundaryOk = evaluateBoundaryCompatibility(viewerScoreInput.boundaries, candidateScoreInput.boundaries).compatible
      && evaluateBoundaryCompatibility(candidateScoreInput.boundaries, viewerScoreInput.boundaries).compatible
    if (!boundaryOk) continue

    // Step 11 — cached score (5.5/5.8)
    const result = await getOrCalculateScore(viewerScoreInput, candidateScoreInput)
    if (!result.eligible) continue // defense-in-depth: should already be excluded by the checks above

    const explanation = await buildExplanation(result.reasonCodes as any, viewerProfileId, candidate.id)

    scored.push({ candidate, score: result.score, breakdown: result.breakdown, reasonCodes: result.reasonCodes, explanation })
  }

  // Step 12 — Ranking: stable full order (score desc, createdAt desc, id asc)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const timeDiff = b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime()
    if (timeDiff !== 0) return timeDiff
    return a.candidate.id < b.candidate.id ? -1 : 1
  })

  // Step 13 — Pagination
  const decodedCursor = cursor ? decodeCursor(cursor) : null
  const startIndex = decodedCursor
    ? scored.findIndex(s => isAfterCursor({ score: s.score, createdAt: s.candidate.createdAt, id: s.candidate.id }, decodedCursor))
    : 0
  const safeStart = startIndex === -1 ? scored.length : startIndex
  const page = scored.slice(safeStart, safeStart + limit)
  const hasMore = safeStart + limit < scored.length

  const items: DiscoveryCandidateItem[] = page.map(s => ({
    profile: { ...s.candidate, liked: likedIds.has(s.candidate.id) },
    betweenScore: s.score,
    compatibility: {
      intentions: s.breakdown.intentions.score,
      boundaries: s.breakdown.boundaries.score,
      context: s.breakdown.relationshipContext.score,
      discretion: s.breakdown.discretion.score,
      location: s.breakdown.location.score,
    },
    reasons: s.explanation,
    reasonCodes: s.reasonCodes as BetweenScoreReasonCode[],
  }))

  const last = page[page.length - 1]
  const nextCursor = hasMore && last
    ? encodeCursor({ score: last.score, createdAt: last.candidate.createdAt.toISOString(), id: last.candidate.id })
    : null

  return { items, nextCursor }
}

