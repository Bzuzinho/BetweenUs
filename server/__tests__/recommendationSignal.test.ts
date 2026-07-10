// 11.14 — RecommendationSignal capture, aggregation damping, and the "no
// sensitive payload" structural guarantee.
import { prisma, createTestUser, createTestProfile, createTestMatch, waitForCondition } from './helpers'
import { recordSignal, getAggregatedSignalQuality, evaluateSustainedConversation, evaluateConversationStarted } from '../src/lib/recommendationSignalService'
import { createLikeOrMatch, recordPass } from '../src/lib/matchService'

describe('RecommendationSignal — capture', () => {
  it('records a signal with the weight resolved from the active config', async () => {
    const a = await createTestUser({ email: 'sig-a@test.com' })
    const b = await createTestUser({ email: 'sig-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await recordSignal(aId, bId, 'MAYBE')

    const row = await (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: aId, targetProfileId: bId, signalType: 'MAYBE' } })
    expect(row).toBeTruthy()
    expect(row.weight).toBe(0.3) // DEFAULT_SIGNAL_WEIGHTS.MAYBE
  })

  it('never signals about oneself', async () => {
    const a = await createTestUser({ email: 'sig-self@test.com' })
    const aId = await createTestProfile(a.id)
    await recordSignal(aId, aId, 'LIKE')
    const count = await (prisma as any).recommendationSignal.count({ where: { actorProfileId: aId, targetProfileId: aId } })
    expect(count).toBe(0)
  })

  it('createLikeOrMatch records LIKE, and MATCH in both directions on reciprocity', async () => {
    const a = await createTestUser({ email: 'sig-like-a@test.com' })
    const b = await createTestUser({ email: 'sig-like-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await createLikeOrMatch(aId, bId)
    const likeRow = await waitForCondition(() => (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: aId, targetProfileId: bId, signalType: 'LIKE' } }))
    expect(likeRow).toBeTruthy()

    await createLikeOrMatch(bId, aId) // reciprocal -> match
    const matchAtoB = await waitForCondition(() => (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: aId, targetProfileId: bId, signalType: 'MATCH' } }))
    const matchBtoA = await waitForCondition(() => (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: bId, targetProfileId: aId, signalType: 'MATCH' } }))
    expect(matchAtoB).toBeTruthy()
    expect(matchBtoA).toBeTruthy()
  })

  it('recordPass records a PASS signal', async () => {
    const a = await createTestUser({ email: 'sig-pass-a@test.com' })
    const b = await createTestUser({ email: 'sig-pass-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await recordPass(aId, bId)
    const row = await waitForCondition(() => (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: aId, targetProfileId: bId, signalType: 'PASS' } }))
    expect(row).toBeTruthy()
  })
})

describe('RecommendationSignal — SUSTAINED_CONVERSATION / CONVERSATION_STARTED (11.1)', () => {
  it('fires CONVERSATION_STARTED once both sides have sent a message, and never re-fires', async () => {
    const a = await createTestUser({ email: 'sig-conv-a@test.com' })
    const b = await createTestUser({ email: 'sig-conv-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)

    await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: a.id, body: 'oi', messageType: 'TEXT' } })
    await evaluateConversationStarted(match.conversation.id)
    let count = await (prisma as any).recommendationSignal.count({ where: { signalType: 'CONVERSATION_STARTED' } })
    expect(count).toBe(0) // only one sender so far

    await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: b.id, body: 'olá', messageType: 'TEXT' } })
    await evaluateConversationStarted(match.conversation.id)
    count = await (prisma as any).recommendationSignal.count({ where: { signalType: 'CONVERSATION_STARTED' } })
    expect(count).toBe(2) // one row per direction

    // Re-running must not duplicate.
    await evaluateConversationStarted(match.conversation.id)
    count = await (prisma as any).recommendationSignal.count({ where: { signalType: 'CONVERSATION_STARTED' } })
    expect(count).toBe(2)
  })

  it('fires SUSTAINED_CONVERSATION only once >=3 distinct days of messages exist, with metadata (never message body)', async () => {
    const a = await createTestUser({ email: 'sig-sustained-a@test.com' })
    const b = await createTestUser({ email: 'sig-sustained-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)

    const days = [
      new Date('2026-01-01T10:00:00Z'), new Date('2026-01-02T10:00:00Z'),
    ]
    for (const d of days) {
      await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: a.id, body: 'segredo do dia', messageType: 'TEXT', createdAt: d } })
    }
    await evaluateSustainedConversation(match.conversation.id)
    let count = await (prisma as any).recommendationSignal.count({ where: { signalType: 'SUSTAINED_CONVERSATION' } })
    expect(count).toBe(0) // only 2 distinct days so far

    await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: b.id, body: 'terceiro dia', messageType: 'TEXT', createdAt: new Date('2026-01-03T10:00:00Z') } })
    await evaluateSustainedConversation(match.conversation.id)
    const rows = await (prisma as any).recommendationSignal.findMany({ where: { signalType: 'SUSTAINED_CONVERSATION' } })
    expect(rows.length).toBe(2) // one per direction

    // Metadata carries only a day count + the conversation id, never the message body.
    for (const row of rows) {
      expect(row.metadata).toEqual({ conversationId: match.conversation.id, distinctDayCount: 3 })
      expect(JSON.stringify(row.metadata)).not.toMatch(/segredo|terceiro/)
    }
  })
})

describe('RecommendationSignal — aggregation avoids rich-get-richer (11.7)', () => {
  it('a profile with zero received signals is treated as neutral (cold start)', async () => {
    const user = await createTestUser({ email: 'sig-cold@test.com' })
    const profileId = await createTestProfile(user.id)
    const quality = await getAggregatedSignalQuality(profileId)
    expect(quality.isColdStart).toBe(true)
    expect(quality.score).toBe(0)
  })

  it('a single REPORT is heavily damped, not applied at full weight', async () => {
    const a = await createTestUser({ email: 'sig-damp-a@test.com' })
    const b = await createTestUser({ email: 'sig-damp-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await recordSignal(aId, bId, 'REPORT')
    const quality = await getAggregatedSignalQuality(bId)
    expect(quality.score).toBeGreaterThan(-15) // not the full raw weight
    expect(quality.score).toBeLessThan(0)      // still meaningfully negative
  })

  it('PASS never contributes to a candidate global aggregate', async () => {
    const a = await createTestUser({ email: 'sig-nopass-a@test.com' })
    const b = await createTestUser({ email: 'sig-nopass-b@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)

    await recordPass(aId, bId)
    const quality = await getAggregatedSignalQuality(bId)
    expect(quality.isColdStart).toBe(true) // PASS excluded entirely from GLOBAL_AGGREGATE_TYPES
  })
})
