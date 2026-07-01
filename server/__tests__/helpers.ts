import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateTokens } from '../src/utils/jwt'

const prisma = new PrismaClient()

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

export { prisma }
