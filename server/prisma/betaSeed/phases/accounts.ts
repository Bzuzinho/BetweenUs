// BETA.1.9/1.10 — creates the 6 admin accounts and 8 lifecycle accounts.
// Every account is upserted by email (idempotent — see BETA.1.7) and
// stamped isTestAccount=true/testScenarioKey=<manifest key>.
import bcrypt from 'bcryptjs'
import prisma from '../../../src/lib/prisma'
import { ADMIN_ACCOUNTS, LIFECYCLE_ACCOUNTS } from '../scenarios'
import { evaluateAndActivateUser } from '../../../src/lib/userActivationService'

// A fixed, clearly-in-the-past adult birthdate — every seeded account uses
// the same one; nothing in this dataset depends on exact age.
const ADULT_DOB = new Date('1992-04-15T00:00:00.000Z')

export const hashSeedPassword = async (): Promise<string> => {
  // BETA.1.4 — required, no fallback (guards.assertSeedAllowed already
  // aborted the whole run if this is unset). Same bcrypt cost (12) as
  // auth.ts's real register/reset-password flows — see routes/auth.ts.
  return bcrypt.hash(process.env.BETA_SEED_PASSWORD!, 12)
}

interface UpsertUserInput {
  email: string
  accountName: string
  testScenarioKey: string
  passwordHash: string
  status?: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BANNED'
  adminRole?: string | null
  emailVerifiedAt?: Date | null
  ageVerifiedAt?: Date | null
  termsAcceptedAt?: Date | null
  privacyAcceptedAt?: Date | null
}

export const upsertTestUser = async (input: UpsertUserInput) => {
  const data = {
    accountName: input.accountName,
    passwordHash: input.passwordHash,
    isTestAccount: true,
    testScenarioKey: input.testScenarioKey,
    status: input.status ?? 'ACTIVE',
    adminRole: (input.adminRole as any) ?? null,
    emailVerifiedAt: input.emailVerifiedAt === undefined ? new Date() : input.emailVerifiedAt,
    ageVerifiedAt: input.ageVerifiedAt === undefined ? new Date() : input.ageVerifiedAt,
    termsAcceptedAt: input.termsAcceptedAt === undefined ? new Date() : input.termsAcceptedAt,
    privacyAcceptedAt: input.privacyAcceptedAt === undefined ? new Date() : input.privacyAcceptedAt,
  }
  return prisma.user.upsert({
    where: { email: input.email },
    update: data,
    create: { email: input.email, dateOfBirth: ADULT_DOB, ...data },
  })
}

export const createAdminAccounts = async (): Promise<Record<string, string>> => {
  const passwordHash = await hashSeedPassword()
  const ids: Record<string, string> = {}
  for (const a of ADMIN_ACCOUNTS) {
    const user = await upsertTestUser({
      email: a.email, accountName: a.accountName, testScenarioKey: a.key,
      passwordHash, status: 'ACTIVE', adminRole: a.adminRole,
    })
    ids[a.key] = user.id
  }
  console.log(`  Admin accounts: ${ADMIN_ACCOUNTS.length}`)
  return ids
}

export const createLifecycleAccounts = async (): Promise<Record<string, string>> => {
  const passwordHash = await hashSeedPassword()
  const ids: Record<string, string> = {}

  // One branch per lifecycle state, so each state's construction is easy
  // to audit independently rather than one large parametrized helper.
  for (const acc of LIFECYCLE_ACCOUNTS) {
    let user
    switch (acc.key) {
      case 'lifecycle_pending_email':
        user = await upsertTestUser({
          email: acc.email, accountName: acc.accountName, testScenarioKey: acc.key,
          passwordHash, status: 'PENDING_VERIFICATION', emailVerifiedAt: null, ageVerifiedAt: null,
        })
        break
      case 'lifecycle_pending_age':
        user = await upsertTestUser({
          email: acc.email, accountName: acc.accountName, testScenarioKey: acc.key,
          passwordHash, status: 'PENDING_VERIFICATION', emailVerifiedAt: new Date(), ageVerifiedAt: null,
        })
        await (prisma as any).verification.upsert({
          where: { userId: user.id },
          update: { type: 'SELFIE', status: 'PENDING' },
          create: { userId: user.id, type: 'SELFIE', status: 'PENDING' },
        })
        break
      case 'lifecycle_active':
        user = await upsertTestUser({
          email: acc.email, accountName: acc.accountName, testScenarioKey: acc.key,
          passwordHash, status: 'PENDING_VERIFICATION', emailVerifiedAt: new Date(),
        })
        // BETA.1 — real activation path, not a hand-set status=ACTIVE:
        // userActivationService.evaluateAndActivateUser is the ONLY
        // sanctioned way PENDING_VERIFICATION -> ACTIVE happens (see
        // ALLOWED_STATUS_TRANSITIONS's comment) — the seed must not
        // bypass it even for its own convenience.
        await evaluateAndActivateUser(user.id)
        user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
        break
      case 'lifecycle_suspended':
        user = await upsertTestUser({
          email: acc.email, accountName: acc.accountName, testScenarioKey: acc.key,
          passwordHash, status: 'SUSPENDED',
        })
        break
      case 'lifecycle_banned':
        user = await upsertTestUser({
          email: acc.email, accountName: acc.accountName, testScenarioKey: acc.key,
          passwordHash, status: 'BANNED',
        })
        break
      case 'lifecycle_profile_pending':
      case 'lifecycle_profile_rejected':
      case 'lifecycle_profile_hidden':
        user = await upsertTestUser({
          email: acc.email, accountName: acc.accountName, testScenarioKey: acc.key,
          passwordHash, status: 'ACTIVE',
        })
        break
      default:
        continue
    }
    ids[acc.key] = user.id
  }

  console.log(`  Lifecycle accounts: ${LIFECYCLE_ACCOUNTS.length}`)
  return ids
}
