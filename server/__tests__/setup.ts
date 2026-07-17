// (test infra fix) — this used to instantiate its OWN `new PrismaClient()`,
// a THIRD separate client alongside __tests__/helpers.ts's (now also
// fixed) and the app's singleton (src/lib/prisma.ts). Reusing the same
// singleton here means the $connect/$disconnect below actually manage
// the one client every test file's helpers and every real service use —
// see helpers.ts's comment for the full "Too many database connections
// opened" root-cause writeup.
import prisma from '../src/lib/prisma'

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
    // Sistema de localidades — geo_locations é catálogo (como
    // between_score_configs/intentions/boundaries), mas os testes deste
    // sprint criam as suas próprias localidades sintéticas por teste
    // (nunca dependem do import real do GeoNames), por isso É limpo aqui
    // como dado por-teste — ao contrário dos catálogos admin-managed
    // reais, não há nenhuma expectativa de "seed persistente" para isto
    // nos testes.
    'geo_locations',
    // 3.9: new Sprint 3 tables — must be cleaned between test suites too
    'legal_documents',
    'subscriptions', 'user_consents', 'users',
  ]
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`)
  }
})

export { prisma }
