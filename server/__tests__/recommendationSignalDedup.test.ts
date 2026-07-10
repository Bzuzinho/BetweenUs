// 11.5.6 — deduplication policy tests. Without these, high-frequency
// low-intent actions (repeat profile views, double-click likes/blocks,
// retried leave calls) would silently inflate the signals that feed both
// the ranker's cold-start/aggregation logic and the guardrail comparison
// (blockRate/safeExitRate) used for the recommendDisable decision.
import { prisma, createTestUser, createTestProfile, createTestMatch, waitForCondition } from './helpers'
import { recordProfileViewSignal } from '../src/lib/recommendationSignalService'
import { createLikeOrMatch, recordPass } from '../src/lib/matchService'

describe('RecommendationSignal dedup — PROFILE_VIEW (11.5.6)', () => {
  it('at most one PROFILE_VIEW signal per (viewer, target) pair per day, even across many calls', async () => {
    const viewer = await createTestUser({ email: 'dedup-view-viewer@test.com' })
    const target = await createTestUser({ email: 'dedup-view-target@test.com' })
    const viewerId = await createTestProfile(viewer.id)
    const targetId = await createTestProfile(target.id)

    for (let i = 0; i < 5; i++) {
      await recordProfileViewSignal(viewerId, targetId)
    }

    const rows = await (prisma as any).recommendationSignal.findMany({
      where: { actorProfileId: viewerId, targetProfileId: targetId, signalType: 'PROFILE_VIEW' }
    })
    expect(rows.length).toBe(1)
  })
})

describe('RecommendationSignal dedup — LIKE / PASS (11.5.6)', () => {
  it('calling createLikeOrMatch twice for the same pair only records one LIKE signal', async () => {
    const a = await createTestUser({ email: 'dedup-like-a@test.com' })
    const b = await createTestUser({ email: 'dedup-like-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await createLikeOrMatch(aId, bId)
    await createLikeOrMatch(aId, bId) // repeat — e.g. a client retry

    // Only the first call fires a fire-and-forget recordSignal write (see
    // helpers.ts's waitForCondition comment) — wait for that one write to
    // land before asserting the repeat call didn't add a second row.
    await waitForCondition(() => (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: aId, targetProfileId: bId, signalType: 'LIKE' } }))
    const rows = await (prisma as any).recommendationSignal.findMany({
      where: { actorProfileId: aId, targetProfileId: bId, signalType: 'LIKE' }
    })
    expect(rows.length).toBe(1)
  })

  it('calling recordPass twice for the same pair only records one PASS signal', async () => {
    const a = await createTestUser({ email: 'dedup-pass-a@test.com' })
    const b = await createTestUser({ email: 'dedup-pass-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await recordPass(aId, bId)
    await recordPass(aId, bId)

    await waitForCondition(() => (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: aId, targetProfileId: bId, signalType: 'PASS' } }))
    const rows = await (prisma as any).recommendationSignal.findMany({
      where: { actorProfileId: aId, targetProfileId: bId, signalType: 'PASS' }
    })
    expect(rows.length).toBe(1)
  })
})
