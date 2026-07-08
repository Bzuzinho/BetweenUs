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
    'reports',
    // 4.11: new Sprint 4 per-test/per-user tables — NOT the catalog tables
    // themselves (gender_options/orientation_options/private_interests are
    // admin-managed catalogs like intentions/boundaries already were, not
    // per-test data, so they're deliberately left alone here). Must come
    // before couple_profiles/profiles/users since they reference them.
    'profile_private_interests', 'profile_members', 'onboarding_progress',
    // 5.11 — CompatibilityScore is per-profile-pair cached data, cleaned
    // between tests like every other per-test table. between_score_configs
    // is NOT cleaned here for the same reason gender_options/intentions/
    // boundaries aren't - it's an admin-managed settings row, not per-test
    // data (tests that need custom weights create their own row explicitly).
    'compatibility_scores',
    // 10.14 — Sprint 10 per-test tables. event_attendances/circle_memberships
    // reference profiles so must precede it; events/circles themselves also
    // precede 'profiles'/'users' respectively for the same FK reason.
    'event_attendances', 'events', 'circle_memberships', 'circles', 'guide_articles',
    // 11.14 — Sprint 11 per-test tables. Both loosely reference profiles
    // (no FK — see schema.prisma's RecommendationSignal comment), so
    // ordering relative to 'profiles' doesn't matter for FK reasons, but
    // they're still per-test data that must not leak between tests.
    'recommendation_signals', 'recommendation_ranking_logs',
    'couple_profiles', 'profiles',
    // 3.9: new Sprint 3 tables — must be cleaned between test suites too
    'legal_documents',
    'subscriptions', 'user_consents', 'users',
  ]
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`)
  }
})

export { prisma }
