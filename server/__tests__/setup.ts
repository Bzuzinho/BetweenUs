import { PrismaClient } from '@prisma/client'

// Expose prisma globally so test files can import it
const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Clean slate between test suites
afterEach(async () => {
  // Order matters — delete in reverse dependency order
  const tables = [
    'admin_actions', 'beta_invites', 'photo_access_requests',
    'profile_photos', 'consent_checks', 'safety_checkins',
    'couple_match_approvals', 'messages', 'conversations',
    'matches', 'profile_actions', 'profile_boundaries',
    'profile_intentions', 'privacy_settings',
    'blocked_contact_hashes', 'travel_modes', 'verifications',
    'reports', 'couple_profiles', 'profiles',
    // 3.9: new Sprint 3 tables — must be cleaned between test suites too
    'legal_documents',
    'subscriptions', 'user_consents', 'users',
  ]
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`)
  }
})

export { prisma }
