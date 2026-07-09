// BETA.1 — Beta Seed & Scenario Data orchestrator.
//
// npm run db:seed:beta
//
// Requires the STRUCTURAL seed (npm run db:seed) to have already run —
// intentions/boundaries/gender/orientation slugs are looked up, never
// invented here (BETA.1.1: the two seeds are deliberately separate).
//
// Safety: see guards.ts. This script aborts immediately unless
// BETA_SEED_ENABLED=true (+ BETA_SEED_ALLOW_PRODUCTION=true in production)
// and BETA_SEED_PASSWORD is set. Never prints passwords, tokens, or the
// full DATABASE_URL.
import prisma from '../../src/lib/prisma'
import {
  assertSeedAllowed, printSeedTargetBanner, startRun, finishRun,
  BETA_SEED_NAME, BETA_SEED_VERSION,
} from './guards'
import { createAdminAccounts, createLifecycleAccounts } from './phases/accounts'
import { createIndividualProfiles, createLifecycleProfiles, createCoupleProfiles, createGroupProfile } from './phases/profiles'
import { seedPhotosForProfiles, seedSoftRevealGrant } from './phases/media'
import { seedLikePassMatchScenarios, seedContactBlockPair } from './phases/discoveryMatch'
import { seedPrivateRooms } from './phases/rooms'
import { seedConsentChecks, seedSharedIntentions } from './phases/consent'
import { seedBlockScenario, seedReports, seedVerificationQueue, seedSafetyCheckins } from './phases/safety'
import { seedTravelModes, seedSubscriptions } from './phases/travel'
import { seedGuideArticles, seedEvents, seedCircles } from './phases/content'
import { seedBetaInvites } from './phases/invites'
import { INDIVIDUAL_SCENARIOS, COUPLE_SCENARIOS } from './scenarios'

const checkStructuralSeedRan = async (): Promise<void> => {
  const [intentionCount, boundaryCount, genderCount] = await Promise.all([
    prisma.intention.count(), prisma.boundary.count(), prisma.genderOption.count(),
  ])
  if (intentionCount === 0 || boundaryCount === 0 || genderCount === 0) {
    throw new Error(
      "Catálogos estruturais vazios (intentions/boundaries/genders). Corre 'npm run db:seed' primeiro — o beta seed depende dele e nunca inventa slugs."
    )
  }
}

const main = async () => {
  assertSeedAllowed()
  printSeedTargetBanner('BETA SEED — Between Us scenario dataset')
  await checkStructuralSeedRan()

  const run = await startRun(BETA_SEED_NAME)
  const counts: Record<string, number> = {}

  try {
    console.log('\n[1/13] Admin accounts...')
    const adminIds = await createAdminAccounts()
    counts.adminAccounts = Object.keys(adminIds).length

    console.log('[2/13] Lifecycle accounts...')
    const lifecycleIds = await createLifecycleAccounts()
    counts.lifecycleAccounts = Object.keys(lifecycleIds).length

    console.log('[3/13] Individual + couple + group profiles...')
    const individuals = await createIndividualProfiles()
    await createLifecycleProfiles(lifecycleIds)
    const couples = await createCoupleProfiles()
    const group = await createGroupProfile()
    counts.individualProfiles = INDIVIDUAL_SCENARIOS.length
    counts.coupleProfiles = COUPLE_SCENARIOS.length
    counts.groupProfiles = group ? 1 : 0

    console.log('[4/13] Photos / media...')
    const labelByKey: Record<string, string> = {}
    for (const s of INDIVIDUAL_SCENARIOS) labelByKey[s.key] = s.displayName
    for (const c of COUPLE_SCENARIOS) labelByKey[c.key] = c.displayName
    await seedPhotosForProfiles({ ...individuals, ...couples }, labelByKey)
    // Soft Reveal grants — PENDING/APPROVED/REVOKED/EXPIRED against
    // individual_sofia's PRIVATE_AFTER_APPROVAL photo.
    const sofia = individuals['individual_sofia']
    const requesters = ['individual_marta', 'individual_joana', 'individual_tiago', 'individual_rui']
    const grantStatuses: Array<'PENDING' | 'APPROVED' | 'REVOKED' | 'EXPIRED'> = ['PENDING', 'APPROVED', 'REVOKED', 'EXPIRED']
    if (sofia?.userId) {
      for (let i = 0; i < requesters.length; i++) {
        const requester = individuals[requesters[i]]
        if (requester?.userId) await seedSoftRevealGrant(sofia.profileId, requester.userId, sofia.userId, grantStatuses[i])
      }
    }

    console.log('[5/13] Discovery / Between Score pairs + Like/Pass/Match...')
    const matchIds = await seedLikePassMatchScenarios(individuals, couples)
    await seedContactBlockPair(individuals)
    counts.matches = Object.keys(matchIds).length

    console.log('[6/13] Private Rooms + Room Rules + chat...')
    const roomIds = await seedPrivateRooms(individuals, couples, matchIds)
    counts.privateRooms = Object.keys(roomIds).length

    console.log('[7/13] Consent Checks + Shared Intentions...')
    await seedConsentChecks(individuals, couples, matchIds)
    await seedSharedIntentions(roomIds, individuals, couples)
    counts.consentChecks = 7

    console.log('[8/13] Block + Reports + Evidence...')
    await seedBlockScenario(individuals)
    await seedReports(individuals, roomIds)
    counts.reports = 6

    console.log('[9/13] Verification queue + Safety Check-ins...')
    await seedVerificationQueue(individuals, couples)
    await seedSafetyCheckins(individuals)
    counts.safetyCheckins = 6

    console.log('[10/13] Travel Mode + Subscriptions...')
    await seedTravelModes(individuals, couples)
    await seedSubscriptions(individuals, couples)
    counts.travelModes = 6

    console.log('[11/13] Guide + Events + Circles...')
    await seedGuideArticles(adminIds)
    await seedEvents(individuals, couples)
    await seedCircles(individuals, couples, adminIds)
    counts.guideArticles = 8
    counts.events = 5
    counts.circles = 4

    console.log('[12/13] Beta invites...')
    await seedBetaInvites(individuals)
    counts.betaInvites = 4

    console.log('[13/13] Done.')
    await finishRun(run.id, 'COMPLETED', counts)

    console.log('\n' + '─'.repeat(60))
    console.log(`Beta seed version: ${BETA_SEED_VERSION}`)
    console.log('Accounts:')
    console.log(`  - Admin test accounts: ${counts.adminAccounts}`)
    console.log(`  - Lifecycle test accounts: ${counts.lifecycleAccounts}`)
    console.log(`  - Individual profiles: ${counts.individualProfiles}`)
    console.log(`  - Couple profiles: ${counts.coupleProfiles}`)
    console.log(`  - Group profiles: ${counts.groupProfiles}`)
    console.log('Scenarios:')
    console.log(`  - Matches: ${counts.matches}`)
    console.log(`  - Private Rooms: ${counts.privateRooms}`)
    console.log(`  - Consent Checks: ${counts.consentChecks}`)
    console.log(`  - Reports: ${counts.reports}`)
    console.log(`  - Safety Check-ins: ${counts.safetyCheckins}`)
    console.log(`  - Travel Modes: ${counts.travelModes}`)
    console.log(`  - Events: ${counts.events}`)
    console.log(`  - Circles: ${counts.circles}`)
    console.log(`  - Beta invites: ${counts.betaInvites}`)
    console.log('')
    console.log('Validation command: npm run db:seed:beta:validate')
    console.log('Test account manifest: docs/testing/BETA_TEST_ACCOUNTS.md')
    console.log('─'.repeat(60))
  } catch (err: any) {
    await finishRun(run.id, 'FAILED', counts, err.message)
    throw err
  }
}

main()
  .catch(e => { console.error('[BETA SEED] Falhou:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
