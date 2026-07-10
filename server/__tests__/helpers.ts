import bcrypt from 'bcryptjs'
import { generateTokens } from '../src/utils/jwt'
// (test infra fix) — this used to instantiate its OWN `new PrismaClient()`,
// separate from both __tests__/setup.ts's client AND the actual
// application singleton (src/lib/prisma.ts) that every real service
// (matchService, recommendationSignalService, etc.) uses. Since Jest
// resets the module registry per test FILE, that meant up to 3 separate
// PrismaClient instances (each opening its own pooled connections) were
// created per file and never all disconnected — confirmed as the root
// cause of "Too many database connections opened: FATAL: sorry, too many
// clients already" partway through the first real full `npm test` run
// this sprint (after the jest.config.js setupFiles fix let tests execute
// at all). Reusing the app's singleton here means there's only ONE client
// per test file, and setup.ts's existing afterAll now actually
// disconnects it.
import prisma from '../src/lib/prisma'

export interface TestUser {
  id: string
  email: string
  accessToken: string
  refreshToken: string
  profileId?: string
}

export const createTestUser = async (overrides: {
  email?: string
  password?: string
  adminRole?: string | null
  status?: string
} = {}): Promise<TestUser> => {
  const email = overrides.email || `test-${Date.now()}@betweenus.test`
  const passwordHash = await bcrypt.hash(overrides.password || 'Password123!', 10)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      dateOfBirth: new Date('1990-01-01'),
      emailVerifiedAt: new Date(),
      status: (overrides.status || 'ACTIVE') as any,
      adminRole: overrides.adminRole as any || null,
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
      consents: { create: [
        { consentType: 'TERMS', version: '1.0' },
        { consentType: 'PRIVACY_POLICY', version: '1.0' },
        { consentType: 'SENSITIVE_DATA', version: '1.0' },
      ]}
    }
  })

  const { accessToken, refreshToken } = generateTokens(user.id)
  return { id: user.id, email, accessToken, refreshToken }
}

export const createTestProfile = async (userId: string, overrides: {
  status?: string
  type?: string
} = {}): Promise<string> => {
  const profile = await prisma.profile.create({
    data: {
      userId,
      displayName: `User ${userId.slice(0, 6)}`,
      status: (overrides.status || 'APPROVED') as any,
      type: (overrides.type || 'INDIVIDUAL') as any,
      relationshipStatus: 'SINGLE',
      discretionLevel: 'SELECTIVE',
      privacySettings: { create: { visibleInDiscovery: true } }
    }
  })
  return profile.id
}

export const createTestMatch = async (profileOneId: string, profileTwoId: string) => {
  return prisma.match.create({
    data: {
      profileOneId, profileTwoId,
      status: 'ACTIVE', matchedAt: new Date(),
      conversation: { create: { type: 'ONE_TO_ONE' } }
    },
    include: { conversation: true }
  })
}

export const createBetaInvite = async (adminId: string, overrides: {
  maxUses?: number
  active?: boolean
  expiresAt?: Date | null
  useCount?: number
} = {}) => {
  return prisma.betaInvite.create({
    data: {
      code: `TEST${Date.now()}`,
      createdById: adminId,
      maxUses: overrides.maxUses ?? 1,
      active: overrides.active ?? true,
      expiresAt: overrides.expiresAt,
      useCount: overrides.useCount ?? 0,
    }
  })
}

// Recommendation signals are deliberately fire-and-forget in production:
// matchService.createLikeOrMatch/recordPass call
// recordSignal(...).catch(() => {}) WITHOUT awaiting it, so a user-facing
// like/pass action's HTTP response isn't gated on a non-critical
// side-channel write (recordSignal itself does 2 sequential DB round
// trips — see recommendationSignalService.ts) completing first. That's a
// deliberate perf choice for the real endpoint, not a bug — but it means
// a test that awaits the action and then immediately does a single
// synchronous read for the resulting RecommendationSignal row is
// inherently racing that background write over a real network
// connection (Railway's remote Postgres), not a local one. Polling
// briefly (instead of a single read) respects the production
// fire-and-forget design while making the test deterministic regardless
// of DB round-trip latency.
export const waitForCondition = async <T>(
  check: () => Promise<T | null | undefined | false>,
  { timeoutMs = 2000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T | null> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await check()
    if (result) return result
    await new Promise(r => setTimeout(r, intervalMs))
  }
  return null
}

export { prisma }
