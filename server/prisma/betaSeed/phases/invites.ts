// BETA.2.8 — Beta Invite scenarios. The "Convites" admin tab could not be
// QA'd at all before this: BetaInvite had zero seeded rows. Uses the real
// model (schema.prisma's BetaInvite) exactly as routes/beta.ts writes it —
// no separate seed-only shape, no emails sent (createSeedInvite never
// calls any mail/notify function, just prisma.betaInvite.upsert).
//
// BetaInvite has no explicit `status` enum — status is DERIVED the same
// way routes/beta.ts's own listing logic derives it:
//   ACCEPTED — usedById is set
//   REVOKED  — active=false (admin manually deactivated), never used
//   EXPIRED  — active=true, never used, expiresAt in the past
//   PENDING  — active=true, never used, not expired
// (see validate.ts's beta-invites checks for the exact same derivation
// used to assert against this seed data — one definition, not two).
import prisma from '../../../src/lib/prisma'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

const relativeDate = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

export const BETA_INVITE_CODES = {
  pending: 'BETA-INVITE-A-PENDING',
  accepted: 'BETA-INVITE-B-ACCEPTED',
  expired: 'BETA-INVITE-C-EXPIRED',
  revoked: 'BETA-INVITE-D-REVOKED',
} as const

export const seedBetaInvites = async (individuals: ProfileMap): Promise<void> => {
  const creator = individuals['individual_diogo']?.userId
  const accepter = individuals['individual_ines']?.userId
  if (!creator) { console.warn('  Beta invites: individual_diogo not found, skipping.'); return }

  // A — PENDING: active, unused, no expiry yet.
  await (prisma as any).betaInvite.upsert({
    where: { code: BETA_INVITE_CODES.pending },
    update: {},
    create: {
      code: BETA_INVITE_CODES.pending, createdById: creator,
      maxUses: 1, useCount: 0, active: true, expiresAt: relativeDate(20),
    }
  })

  // B — ACCEPTED: usedById set, useCount reflects the single use.
  // usedById is @unique on BetaInvite, so accepter can only be linked to
  // ONE invite in the whole dataset — individual_ines is not used as an
  // accepter anywhere else in the beta seed.
  if (accepter) {
    await (prisma as any).betaInvite.upsert({
      where: { code: BETA_INVITE_CODES.accepted },
      update: {},
      create: {
        code: BETA_INVITE_CODES.accepted, createdById: creator,
        maxUses: 1, useCount: 1, active: true,
        usedById: accepter, usedAt: relativeDate(-5),
      }
    })
  } else {
    console.warn('  Beta invites: individual_ines not found, skipping ACCEPTED scenario.')
  }

  // C — EXPIRED: still active=true (never manually revoked), never used,
  // but expiresAt is in the past — this is what makes it EXPIRED rather
  // than PENDING, same distinction routes/beta.ts's own check must make.
  await (prisma as any).betaInvite.upsert({
    where: { code: BETA_INVITE_CODES.expired },
    update: {},
    create: {
      code: BETA_INVITE_CODES.expired, createdById: creator,
      maxUses: 1, useCount: 0, active: true, expiresAt: relativeDate(-3),
    }
  })

  // D — REVOKED: active=false, never used. This is the closest concept
  // BetaInvite's actual schema supports for "revoked" — there is no
  // separate boolean/enum for it, active:false IS how routes/beta.ts's
  // admin revoke action is implemented (confirmed by reading that route
  // before adding this scenario, not assumed).
  await (prisma as any).betaInvite.upsert({
    where: { code: BETA_INVITE_CODES.revoked },
    update: {},
    create: {
      code: BETA_INVITE_CODES.revoked, createdById: creator,
      maxUses: 1, useCount: 0, active: false,
    }
  })

  console.log('  Beta invites: 4 (PENDING, ACCEPTED, EXPIRED, REVOKED)')
}
