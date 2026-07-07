// 5.8 — ScoreInvalidationService: surgical invalidation, not a table wipe.
// Deletes only the CompatibilityScore rows where the given profile is
// EITHER source or target - a profile changing its intentions only
// invalidates scores that actually involve that profile, leaving every
// other cached pair untouched.
//
// Call this after writing any of: intentions, boundaries, private
// interests, relationship context (relationshipStatus/discretionLevel),
// location (city/lat/lng), travel mode, or profile membership changes
// (couple partner joining/leaving changes who "the profile" effectively
// is, compatibility-wise).
import prisma from './prisma'

export const invalidateScoresForProfile = async (profileId: string): Promise<number> => {
  const result = await (prisma as any).compatibilityScore.deleteMany({
    where: { OR: [{ sourceProfileId: profileId }, { targetProfileId: profileId }] }
  })
  return result.count
}

// Convenience for the (rare) case of a bulk operation touching several
// profiles at once (e.g. an admin catalog change nobody scoped narrowly),
// still deleting only what's affected, never a full-table truncate.
export const invalidateScoresForProfiles = async (profileIds: string[]): Promise<number> => {
  if (profileIds.length === 0) return 0
  const result = await (prisma as any).compatibilityScore.deleteMany({
    where: { OR: [{ sourceProfileId: { in: profileIds } }, { targetProfileId: { in: profileIds } }] }
  })
  return result.count
}
