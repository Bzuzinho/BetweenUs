// 11.14 — recommendation reasons map to fixed, neutral microcopy (never
// "AI thinks..." framing, never a raw boundary/intention/private-interest
// value), and the ranker's candidate input/output never carries a
// sensitive payload (message body, private photo, NIF, contact hash, raw
// boundary/private-interest selections).
import { explainRecommendationReasons } from '../src/lib/recommendationExplanationService'
import { getCandidates } from '../src/lib/discoveryService'
import { createHeuristicRanker } from '../src/lib/heuristicRecommendationRanker'
import { prisma, createTestUser, createTestProfile } from './helpers'

async function withPhoto(profileId: string) {
  await prisma.profilePhoto.create({
    data: { profileId, storagePath: `test/${profileId}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' }
  })
}

describe('RecommendationExplanationService — reason codes -> microcopy', () => {
  it('maps every known reason code to a fixed, neutral phrase', () => {
    const phrases = explainRecommendationReasons([
      'HIGH_COMPATIBILITY', 'SIMILAR_INTENTIONS', 'BOUNDARY_ALIGNMENT',
      'SIMILAR_DISCRETION', 'TRAVEL_OVERLAP', 'NEW_COMPATIBLE_PROFILE',
    ])
    expect(phrases).toHaveLength(6)
    for (const phrase of phrases) {
      expect(phrase).not.toMatch(/AI thinks|artificial intelligence|algorithm/i)
    }
  })

  it('never invents a phrase for an unknown code (fixed allow-list only)', () => {
    // @ts-expect-error deliberately invalid code to prove the allow-list is closed
    const phrases = explainRecommendationReasons(['NOT_A_REAL_CODE'])
    expect(phrases).toEqual([])
  })
})

describe('Sensitive payload — structural check (11.6)', () => {
  it('the ranker output never contains message bodies, photo paths, NIF, or raw boundary/interest data', async () => {
    const viewer = await createTestUser({ email: 'nosensitive-viewer@test.com' })
    const viewerId = await createTestProfile(viewer.id)
    await withPhoto(viewerId)
    const candidate = await createTestUser({ email: 'nosensitive-candidate@test.com' })
    const candidateId = await createTestProfile(candidate.id)
    await withPhoto(candidateId)

    const { items } = await getCandidates(viewerId, {}, null, 50)
    const ranker = createHeuristicRanker()
    const ranked = await ranker.rank(viewerId, items, { source: 'DISCOVERY_FEED' })

    const serialized = JSON.stringify(ranked)
    const forbiddenKeys = ['body', 'storagePath', 'blurredPath', 'nif', 'selfieStoragePath', 'contactHash', 'passwordHash']
    for (const key of forbiddenKeys) {
      expect(serialized.toLowerCase()).not.toContain(key.toLowerCase())
    }
    // Only the documented output shape should be present.
    const allowedKeys = ['candidateProfileId', 'recommendationScore', 'reasonCodes', 'modelVersion', 'isExploration', 'currentRank', 'recommendationRank']
    for (const entry of ranked) {
      expect(Object.keys(entry).sort()).toEqual([...allowedKeys].sort())
    }
  })

  it('RecommendationSignal.metadata never carries a message body or free-text field', async () => {
    const rows = await (prisma as any).recommendationSignal.findMany({ where: { metadata: { not: null } } })
    for (const row of rows) {
      const keys = Object.keys(row.metadata || {})
      for (const key of keys) {
        expect(['conversationId', 'roomId', 'photoId', 'distinctDayCount']).toContain(key)
      }
    }
  })
})
