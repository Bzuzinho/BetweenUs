// 4.9 — ProfileCompletenessService
//
// Single source of truth for "how filled-in is this profile", so the
// frontend stops hardcoding percentages (it previously didn't compute this
// at all) and so discovery eligibility and the profile-owner UI agree on
// exactly the same definition of "complete".
//
// Deliberately NOT the same thing as EligibilityService (lifecycle/status —
// can this user log in, appear in discovery, etc). A profile can be fully
// eligible by status and still be 40% complete (e.g. approved, but no
// boundaries set yet). The two are meant to be read together, not merged.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'

export type CompletenessField =
  | 'DISPLAY_NAME'
  | 'MEMBERS'
  | 'GENDER'
  | 'INTENTIONS'
  | 'BOUNDARIES'
  | 'PRIMARY_PHOTO'
  | 'PRIVACY_SETTINGS'
  | 'BIO'

export interface CompletenessResult {
  score: number
  complete: boolean
  missing: CompletenessField[]
}

// Weights sum to 100. PRIMARY_PHOTO is weighted highest on purpose — a
// profile with zero visible photos isn't really usable in discovery no
// matter how well everything else is filled in, which is also why it's one
// of the two fields that gate discovery eligibility below (the other being
// MEMBERS for couples/groups still missing a partner).
const WEIGHTS: Record<CompletenessField, number> = {
  DISPLAY_NAME: 10,
  MEMBERS: 15,
  GENDER: 10,
  INTENTIONS: 15,
  BOUNDARIES: 15,
  PRIMARY_PHOTO: 20,
  PRIVACY_SETTINGS: 10,
  BIO: 5,
}

interface ProfileForCompleteness {
  id: string
  type: string
  status?: string | null
  displayName?: string | null
  bio?: string | null
  gender?: string | null
  intentions?: unknown[]
  boundaries?: unknown[]
  photos?: unknown[]
  privacySettings?: unknown
}

// Accepts a profile that may already have intentions/boundaries/photos/
// privacySettings included — profiles.ts GET /me and discovery.ts already
// load all four for other reasons, so this avoids re-querying them. MEMBERS
// is the one check that always needs its own lookup, via
// ProfileMembershipService (4.1) — the actual source of truth for who's
// active on a profile, not CoupleProfile's fixed partnerOne/partnerTwo pair.
export const evaluateCompleteness = async (profile: ProfileForCompleteness): Promise<CompletenessResult> => {
  const missing: CompletenessField[] = []

  if (!profile.displayName || !profile.displayName.trim()) missing.push('DISPLAY_NAME')

  // INDIVIDUAL profiles can't exist without their one owning member, so
  // there's nothing to check. COUPLE/GROUP need at least 2 active members —
  // deliberately NOT reusing ProfileTypePolicy.validateMemberCount here: that
  // function's "status" parameter means CoupleStatus (PENDING_PARTNER vs not),
  // which answers "is this an error?", not Profile.status (moderation state),
  // which is what's available here. Completeness asks a different question
  // anyway — a COUPLE stuck at 1 active member IS incomplete from the
  // profile-owner's point of view ("invite your partner"), even though
  // ProfileTypePolicy correctly treats that same state as valid, not an error,
  // while the invite is still pending.
  if (profile.type !== 'INDIVIDUAL') {
    const activeMembers = await getActiveMembers(profile.id)
    if (activeMembers.length < 2) missing.push('MEMBERS')
  }

  // Gender is a single field on Profile, which only means something for an
  // INDIVIDUAL — a COUPLE/GROUP profile is shared, and each member's own
  // gender lives on their own account context, out of scope here.
  if (profile.type === 'INDIVIDUAL' && !profile.gender) missing.push('GENDER')

  if (!profile.intentions || profile.intentions.length === 0) missing.push('INTENTIONS')
  if (!profile.boundaries || profile.boundaries.length === 0) missing.push('BOUNDARIES')
  if (!profile.photos || profile.photos.length === 0) missing.push('PRIMARY_PHOTO')
  if (!profile.privacySettings) missing.push('PRIVACY_SETTINGS')
  if (!profile.bio || !profile.bio.trim()) missing.push('BIO')

  const score = (Object.keys(WEIGHTS) as CompletenessField[])
    .filter(field => !missing.includes(field))
    .reduce((sum, field) => sum + WEIGHTS[field], 0)

  return { score, complete: missing.length === 0, missing }
}

// Convenience path for callers that don't already have the profile loaded
// with the right includes (e.g. a future standalone "profile health" check).
export const evaluateCompletenessById = async (profileId: string): Promise<CompletenessResult | null> => {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      intentions:      true,
      boundaries:      true,
      photos:          { where: { moderationStatus: 'APPROVED' } },
      privacySettings: true,
    }
  })
  if (!profile) return null
  return evaluateCompleteness(profile as any)
}
