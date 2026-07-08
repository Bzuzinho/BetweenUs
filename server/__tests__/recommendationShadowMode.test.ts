// 11.14 — Shadow mode has no visible effect on the Discovery response,
// writes RecommendationRankingLog rows while it's on, and the kill switch
// (INTELLIGENT_RECOMMENDATIONS_ENABLED=false) leaves every viewer on the
// CONTROL/current-ranking path regardless of their cohort hash.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'
import { effectiveCohort, assignCohort } from '../src/lib/recommendationAbTestService'

async function withPhoto(profileId: string) {
  await prisma.profilePhoto.create({
    data: { profileId, storagePath: `test/${profileId}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' }
  })
}

const ORIGINAL_SHADOW = process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE
const ORIGINAL_ENABLED = process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED

afterEach(() => {
  process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE = ORIGINAL_SHADOW
  process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = ORIGINAL_ENABLED
})

describe('Shadow mode — no visible effect on Discovery (11.5)', () => {
  it('the Discovery response is identical whether shadow mode is on or off', async () => {
    const viewer = await createTestUser({ email: 'shadow-viewer@test.com' })
    const viewerId = await createTestProfile(viewer.id)
    await withPhoto(viewerId)

    for (let i = 0; i < 5; i++) {
      const u = await createTestUser({ email: `shadow-c${i}@test.com` })
      const id = await createTestProfile(u.id)
      await withPhoto(id)
    }

    process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE = 'false'
    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'false'
    const off = await request(app).get('/api/discovery').set('Authorization', `Bearer ${viewer.accessToken}`)

    process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE = 'true'
    const on = await request(app).get('/api/discovery').set('Authorization', `Bearer ${viewer.accessToken}`)

    expect(off.status).toBe(200)
    expect(on.status).toBe(200)
    const offIds = off.body.profiles.map((p: any) => p.id)
    const onIds = on.body.profiles.map((p: any) => p.id)
    expect(onIds).toEqual(offIds) // same order, same set — shadow mode is invisible
  })

  it('shadow mode writes RecommendationRankingLog rows', async () => {
    const viewer = await createTestUser({ email: 'shadow-log-viewer@test.com' })
    const viewerId = await createTestProfile(viewer.id)
    await withPhoto(viewerId)
    const other = await createTestUser({ email: 'shadow-log-other@test.com' })
    const otherId = await createTestProfile(other.id)
    await withPhoto(otherId)

    process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE = 'true'
    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'false'
    const res = await request(app).get('/api/discovery').set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.status).toBe(200)

    // Best-effort logging runs after the response is built; give it a tick.
    await new Promise(r => setTimeout(r, 50))
    const logs = await (prisma as any).recommendationRankingLog.findMany({ where: { viewerProfileId: viewerId } })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some((l: any) => l.candidateProfileId === otherId)).toBe(true)
  })
})

describe('Kill switch (11.14)', () => {
  it('effectiveCohort always returns CONTROL when INTELLIGENT_RECOMMENDATIONS_ENABLED is off, regardless of hash bucket', async () => {
    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'false'
    // Try several ids — at least one would hash to RECOMMENDATION_V1 if
    // the flag were respected as "on".
    const ids = ['profile-a', 'profile-b', 'profile-c', 'profile-d', 'profile-e']
    for (const id of ids) {
      expect(effectiveCohort(id)).toBe('CONTROL')
    }
  })

  it('flipping the flag off reverts a RECOMMENDATION_V1-hashed profile to CONTROL behavior', async () => {
    // Find an id that hashes to RECOMMENDATION_V1 when the experiment is
    // (hypothetically) enabled, then verify the kill switch overrides it.
    let v1Id: string | null = null
    for (let i = 0; i < 200; i++) {
      const candidate = `probe-${i}`
      if (assignCohort(candidate) === 'RECOMMENDATION_V1') { v1Id = candidate; break }
    }
    expect(v1Id).not.toBeNull()

    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'true'
    expect(effectiveCohort(v1Id!)).toBe('RECOMMENDATION_V1')

    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'false'
    expect(effectiveCohort(v1Id!)).toBe('CONTROL')
  })
})
