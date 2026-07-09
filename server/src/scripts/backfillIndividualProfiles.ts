/**
 * Backfill script — BETA.2 (FASE C)
 *
 * Gives every User exactly one Individual Profile, separate from any
 * Shared Profile (COUPLE/GROUP) they belong to.
 *
 * Before this sprint, a couple/group creator's ORIGINAL individual Profile
 * row was converted in place (routes/couples.ts, routes/groups.ts do
 * `prisma.profile.update({ where: { id: existing.id }, data: { type:
 * 'COUPLE' | 'GROUP' } })` on the creator's existing row rather than
 * creating a separate one) — so the creator has zero rows of their own
 * left over. A non-creator member who joined via invite (routes/couples.ts
 * POST /join/:token, routes/groups.ts accept) never had a Profile row at
 * all for this couple/group — they're tracked purely via ProfileMember.
 *
 * This script handles both cases:
 *
 *  1. CREATOR case (Profile.userId = user.id, but type is COUPLE/GROUP):
 *     the Shared Profile keeps all its existing data (bio, displayName,
 *     photos, intentions, boundaries, sharedDescription — all of it stays
 *     exactly where it is, still fully intact and functional). We null out
 *     that row's userId (freeing the unique slot — see schema.prisma's
 *     Profile.userId comment for why NULL is safe/intended here) and
 *     create a BRAND NEW Individual Profile row for the creator, DRAFT
 *     status, populated ONLY with safe structural fields that are
 *     genuinely personal rather than couple/group-voiced content: gender,
 *     orientation, city, country, locationLat/Lng, discretionLevel,
 *     visibilityMode. Explicitly NEVER copied: displayName, bio,
 *     relationshipStatus, sharedDescription, photos, intentions,
 *     boundaries — by the time this script runs, a creator's original
 *     Profile row may have been edited for months to describe the couple
 *     ("Somos um casal..."), so none of that free-text content can be
 *     trusted as still being about the individual.
 *
 *  2. MEMBER-ONLY case (ACCEPTED ProfileMember row, no owned Profile row
 *     at all): create a brand new, empty DRAFT Individual Profile — there
 *     is no prior data to carry over.
 *
 *  3. Already-correct case (owned Profile row exists with type
 *     INDIVIDUAL): no-op. This covers both users who never joined any
 *     Shared Profile, and users who separately created their own
 *     Individual Profile before or after joining someone else's
 *     couple/group as a non-creator member.
 *
 * Idempotent: once a creator's new Individual Profile row exists with
 * userId = their id, re-running finds it via the "already-correct" branch
 * and does nothing further — the couple/group row's userId is already
 * NULL by then, so it's no longer considered for the CREATOR case either.
 *
 * Usage:
 *   npm run db:backfill-individual-profiles           # apply
 *   npm run db:backfill-individual-profiles -- --dry-run   # preview only
 */
import prisma from '../lib/prisma'

const DRY_RUN = process.argv.includes('--dry-run')

// Fields safe to carry over from a legacy conflated creator row into the
// new Individual Profile. Deliberately excludes anything free-text or
// couple/group-voiced — see file header.
const SAFE_STRUCTURAL_FIELDS = [
  'gender', 'orientation', 'city', 'country',
  'locationLat', 'locationLng', 'discretionLevel', 'visibilityMode'
] as const

function placeholderDisplayName(email: string): string {
  const local = email.split('@')[0] || 'Utilizador'
  return `${local} (perfil por completar)`
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true }
  })
  console.log(`[BACKFILL-INDIVIDUAL] Scanning ${users.length} users...`)

  let alreadyCorrect = 0
  let creatorMigrated = 0
  let memberOnlyCreated = 0
  let noActionNeeded = 0

  for (const user of users) {
    const owned = await prisma.profile.findUnique({ where: { userId: user.id } })

    if (owned) {
      if (owned.type === 'INDIVIDUAL') {
        alreadyCorrect++
        continue
      }

      // CREATOR case — owned row is the Shared Profile itself.
      const safeData: Record<string, any> = {}
      for (const field of SAFE_STRUCTURAL_FIELDS) {
        const value = (owned as any)[field]
        if (value !== null && value !== undefined) safeData[field] = value
      }

      console.log(`[BACKFILL-INDIVIDUAL] CREATOR ${user.email} — Shared Profile ${owned.id} (${owned.type}) keeps its data; new Individual Profile gets: ${JSON.stringify(safeData)}`)

      if (!DRY_RUN) {
        await prisma.$transaction([
          prisma.profile.update({ where: { id: owned.id }, data: { userId: null } }),
          prisma.profile.create({
            data: {
              userId: user.id,
              type: 'INDIVIDUAL',
              status: 'DRAFT',
              displayName: placeholderDisplayName(user.email),
              ...safeData
            }
          })
        ])
      }
      creatorMigrated++
      continue
    }

    // No owned row at all — only act if they're actually a member of
    // something (skip users who simply haven't onboarded yet).
    const membership = await (prisma as any).profileMember.findFirst({
      where: { userId: user.id, status: 'ACCEPTED' }
    })
    const legacyCouple = membership ? null : await prisma.coupleProfile.findFirst({
      where: { partnerTwoUserId: user.id }
    })

    if (!membership && !legacyCouple) {
      noActionNeeded++
      continue
    }

    console.log(`[BACKFILL-INDIVIDUAL] MEMBER-ONLY ${user.email} — creating empty Individual Profile stub`)
    if (!DRY_RUN) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          type: 'INDIVIDUAL',
          status: 'DRAFT',
          displayName: placeholderDisplayName(user.email)
        }
      })
    }
    memberOnlyCreated++
  }

  console.log(`[BACKFILL-INDIVIDUAL] ${DRY_RUN ? 'DRY RUN — no changes written.' : 'Done.'}`)
  console.log(`[BACKFILL-INDIVIDUAL] Already correct: ${alreadyCorrect}, creator rows migrated: ${creatorMigrated}, member-only stubs created: ${memberOnlyCreated}, no action needed: ${noActionNeeded}`)
}

main()
  .catch(err => { console.error('[BACKFILL-INDIVIDUAL] Failed:', err); process.exit(1) })
  .finally(() => process.exit(0))
