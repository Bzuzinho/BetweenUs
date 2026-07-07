/**
 * 5.11 — Performance test dataset + discovery benchmark.
 *
 * Generates a synthetic dataset (default 10,000 profiles, each with
 * intentions/boundaries/privacy settings/location) and times
 * DiscoveryService.getCandidates() against it, so the numbers in the
 * Sprint 5 delivery report are measured, not guessed.
 *
 * This could NOT be executed in the sandbox this was written in (no
 * reachable Postgres instance) - it's written to be run against a real
 * database, e.g.:
 *
 *   npm run db:seed-performance -- 10000
 *   npm run db:seed-performance -- 10000 --explain   (also EXPLAIN ANALYZEs
 *                                                      the candidate-pool query)
 *
 * Deliberately destructive-adjacent: creates real rows tagged with a
 * `perf-test-` email prefix so they can be identified and cleared
 * separately - does NOT touch existing data, but should only be run
 * against a disposable/staging database, never production.
 */
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'

const TAG = 'perf-test-'
const CITIES = ['Lisboa', 'Porto', 'Coimbra', 'Faro', 'Braga', 'Aveiro', 'Setúbal', 'Évora']
const INTENTION_SLUGS = ['seek_third', 'seek_couple', 'seek_single', 'casual_encounter', 'polyamory', 'still_exploring']
const BOUNDARY_SLUGS = ['no_couples', 'couples_only', 'open_to_meeting', 'slow_pace', 'fast_pace', 'verified_only']
const RELATIONSHIP_STATUSES = ['SINGLE', 'OPEN', 'POLYAMOROUS', 'COUPLE_CURIOUS', 'COUPLE_LIBERAL']

const randomOf = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomLat = () => 38.5 + Math.random() * 3 // rough Portugal bounding box
const randomLng = () => -9.5 + Math.random() * 3

async function ensureCatalogRow(model: 'intention' | 'boundary', slug: string) {
  if (model === 'intention') {
    return (prisma as any).intention.upsert({
      where: { slug }, update: {}, create: { slug, name: slug.replace(/_/g, ' '), active: true }
    })
  }
  return (prisma as any).boundary.upsert({
    where: { slug }, update: {},
    create: { slug, name: slug.replace(/_/g, ' '), category: 'relationship_type', active: true, isHardBoundary: slug.startsWith('no_') || slug.endsWith('_only') }
  })
}

async function main() {
  const count = Number(process.argv[2]) || 10000
  const shouldExplain = process.argv.includes('--explain')

  console.log(`[PERF SEED] Generating ${count} profiles tagged "${TAG}..."`)
  const passwordHash = await bcrypt.hash('PerfTest123!', 4) // low cost factor — this is throwaway data, speed matters more here

  const intentionRows = await Promise.all(INTENTION_SLUGS.map(s => ensureCatalogRow('intention', s)))
  const boundaryRows = await Promise.all(BOUNDARY_SLUGS.map(s => ensureCatalogRow('boundary', s)))

  const BATCH = 500
  for (let batchStart = 0; batchStart < count; batchStart += BATCH) {
    const batchSize = Math.min(BATCH, count - batchStart)
    const users = await Promise.all(Array.from({ length: batchSize }, async (_, i) => {
      const idx = batchStart + i
      return prisma.user.create({
        data: {
          email: `${TAG}${idx}@example.test`,
          passwordHash,
          dateOfBirth: new Date('1990-01-01'),
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
          profile: {
            create: {
              displayName: `Perf User ${idx}`,
              type: 'INDIVIDUAL',
              status: 'APPROVED',
              relationshipStatus: randomOf(RELATIONSHIP_STATUSES) as any,
              discretionLevel: 'SELECTIVE',
              city: randomOf(CITIES),
              country: 'Portugal',
              locationLat: randomLat(),
              locationLng: randomLng(),
              privacySettings: { create: { visibleInDiscovery: true } },
              photos: { create: { storagePath: `perf-test/${idx}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' } },
              intentions: { create: [{ intentionId: randomOf(intentionRows).id, preference: 'YES' }] },
              boundaries: { create: [{ boundaryId: randomOf(boundaryRows).id, preference: 'YES' }] },
            }
          }
        },
        select: { id: true }
      })
    }))
    if (batchStart % 2000 === 0) console.log(`[PERF SEED] ...${batchStart + batchSize}/${count}`)
  }

  console.log('[PERF SEED] Done. Running benchmark...')

  const viewer = await prisma.user.findFirst({ where: { email: `${TAG}0@example.test` }, include: { profile: true } })
  if (!viewer?.profile) { console.error('[PERF SEED] Could not find a seeded viewer profile.'); return }

  const { getCandidates } = await import('../lib/discoveryService')
  const runs = 3
  const timings: number[] = []
  for (let i = 0; i < runs; i++) {
    const start = Date.now()
    const result = await getCandidates(viewer.profile.id, {}, null, 20)
    const elapsed = Date.now() - start
    timings.push(elapsed)
    console.log(`[PERF SEED] Run ${i + 1}: ${elapsed}ms, ${result.items.length} items, nextCursor=${result.nextCursor ? 'present' : 'null'}`)
  }
  console.log(`[PERF SEED] Average: ${(timings.reduce((a, b) => a + b, 0) / runs).toFixed(0)}ms over ${runs} runs`)

  if (shouldExplain) {
    console.log('[PERF SEED] EXPLAIN ANALYZE of the Step 1 candidate-pool query shape:')
    const plan = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT p.id FROM profiles p
      JOIN users u ON u.id = p."userId"
      WHERE p.status = 'APPROVED' AND u.status = 'ACTIVE' AND u."adminRole" IS NULL
      ORDER BY p."createdAt" DESC, p.id ASC
      LIMIT 500;
    `)
    console.log(plan)
  }

  console.log(`[PERF SEED] To clean up: DELETE FROM users WHERE email LIKE '${TAG}%';`)
}

main()
  .catch(e => { console.error('[PERF SEED] Failed:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
