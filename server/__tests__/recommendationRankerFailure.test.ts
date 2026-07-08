// 11.5.5 — "falha do ranker não quebra discovery": if anything inside the
// heuristic ranker throws (a bug in scoring/diversity/exploration), the
// Discovery response must still succeed with the untouched Layer 1+2
// ranking rather than surfacing a 500 to the user. Mocks the ranker
// factory directly rather than trying to organically trigger a real bug,
// since the whole point is this holds regardless of WHY the ranker failed.
jest.mock('../src/lib/heuristicRecommendationRanker', () => ({
  createHeuristicRanker: () => ({
    modelVersion: 'TEST_BROKEN_RANKER',
    rank: async () => { throw new Error('simulated ranker failure') },
  }),
}))

import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'
import { applyRecommendations } from '../src/lib/recommendationOrchestrator'

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

describe('Ranker failure isolation (11.5.5)', () => {
  it('applyRecommendations falls back to the original items + CONTROL cohort when the ranker throws', async () => {
    process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE = 'true'
    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'true'

    const fakeItems: any[] = [{ profile: { id: 'a' }, betweenScore: 50 }, { profile: { id: 'b' }, betweenScore: 40 }]
    const result = await applyRecommendations('viewer-x', fakeItems)

    expect(result.items).toBe(fakeItems) // same reference — untouched, not even re-mapped
    expect(result.cohort).toBe('CONTROL')
    expect(result.recommendationApplied).toBe(false)
  })

  it('GET /api/discovery still returns 200 when the ranker is broken', async () => {
    process.env.INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE = 'true'
    process.env.INTELLIGENT_RECOMMENDATIONS_ENABLED = 'true'

    const viewer = await createTestUser({ email: 'ranker-fail-viewer@test.com' })
    const viewerId = await createTestProfile(viewer.id)
    await withPhoto(viewerId)
    const other = await createTestUser({ email: 'ranker-fail-other@test.com' })
    const otherId = await createTestProfile(other.id)
    await withPhoto(otherId)

    const res = await request(app).get('/api/discovery').set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.profiles.map((p: any) => p.id)).toContain(otherId)
  })
})
