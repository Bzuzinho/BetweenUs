/**
 * Backfill script — Sprint 3
 *
 * Populates ProfileMember from existing CoupleProfile rows so that
 * getRequiredApproverUserIds() (matchService.ts) can rely on ProfileMember
 * for ALL couples, not just ones created after the dual-write went live.
 *
 * Safe to run multiple times (idempotent — skips profiles that already
 * have ProfileMember rows).
 *
 * Run once, manually, after deploying the schema migration:
 *   npm run db:backfill-members
 */
import prisma from '../lib/prisma'

async function main() {
  const couples = await prisma.coupleProfile.findMany()
  console.log(`[BACKFILL] Found ${couples.length} couple profiles.`)

  let created = 0
  let skipped = 0

  for (const couple of couples) {
    const existing = await (prisma as any).profileMember.findMany({
      where: { profileId: couple.profileId }
    })
    if (existing.length > 0) {
      skipped++
      continue
    }

    await (prisma as any).profileMember.create({
      data: {
        profileId: couple.profileId,
        userId: couple.partnerOneUserId,
        isCreator: true,
        status: 'ACCEPTED'
      }
    })
    created++

    if (couple.partnerTwoUserId) {
      await (prisma as any).profileMember.create({
        data: {
          profileId: couple.profileId,
          userId: couple.partnerTwoUserId,
          isCreator: false,
          status: 'ACCEPTED',
          respondedAt: couple.partnerTwoAcceptedAt || couple.updatedAt
        }
      })
      created++
    } else if (couple.partnerTwoInviteEmail) {
      await (prisma as any).profileMember.create({
        data: {
          profileId: couple.profileId,
          invitedEmail: couple.partnerTwoInviteEmail,
          status: 'PENDING',
          inviteToken: couple.coupleInviteToken || null
        }
      })
      created++
    }
  }

  console.log(`[BACKFILL] Done. Created ${created} ProfileMember rows, skipped ${skipped} already-migrated profiles.`)
}

main()
  .catch(err => { console.error('[BACKFILL] Failed:', err); process.exit(1) })
  .finally(() => process.exit(0))
