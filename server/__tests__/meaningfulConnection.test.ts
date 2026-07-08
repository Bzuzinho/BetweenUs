// 11.14/11.3 — MeaningfulConnectionService: the definition, applied
// literally. Match ACTIVE + mutual conversation + >=3 distinct active
// days + no block + no report.
import { prisma, createTestUser, createTestProfile, createTestMatch } from './helpers'
import { evaluateMeaningfulConnection } from '../src/lib/meaningfulConnectionService'

describe('MeaningfulConnectionService', () => {
  it('is not meaningful when the match is not ACTIVE', async () => {
    const a = await createTestUser({ email: 'mcr-a1@test.com' })
    const b = await createTestUser({ email: 'mcr-b1@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)
    await prisma.match.update({ where: { id: match.id }, data: { status: 'PENDING' } })

    const result = await evaluateMeaningfulConnection(match.id)
    expect(result?.isMeaningful).toBe(false)
  })

  it('is not meaningful with only one-sided messages (no mutual conversation)', async () => {
    const a = await createTestUser({ email: 'mcr-a2@test.com' })
    const b = await createTestUser({ email: 'mcr-b2@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)

    for (const d of ['2026-01-01', '2026-01-02', '2026-01-03']) {
      await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: a.id, body: 'oi', messageType: 'TEXT', createdAt: new Date(`${d}T10:00:00Z`) } })
    }

    const result = await evaluateMeaningfulConnection(match.id)
    expect(result?.mutualConversation).toBe(false)
    expect(result?.isMeaningful).toBe(false)
  })

  it('is not meaningful with fewer than 3 distinct active days', async () => {
    const a = await createTestUser({ email: 'mcr-a3@test.com' })
    const b = await createTestUser({ email: 'mcr-b3@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)

    await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: a.id, body: 'oi', messageType: 'TEXT', createdAt: new Date('2026-01-01T10:00:00Z') } })
    await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: b.id, body: 'olá', messageType: 'TEXT', createdAt: new Date('2026-01-01T11:00:00Z') } })

    const result = await evaluateMeaningfulConnection(match.id)
    expect(result?.distinctActiveDays).toBe(1)
    expect(result?.isMeaningful).toBe(false)
  })

  it('is meaningful: ACTIVE + mutual + 3 distinct days + no block/report', async () => {
    const a = await createTestUser({ email: 'mcr-a4@test.com' })
    const b = await createTestUser({ email: 'mcr-b4@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)

    const days = ['2026-01-01', '2026-01-02', '2026-01-03']
    for (const d of days) {
      await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: a.id, body: 'oi', messageType: 'TEXT', createdAt: new Date(`${d}T10:00:00Z`) } })
      await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: b.id, body: 'olá', messageType: 'TEXT', createdAt: new Date(`${d}T11:00:00Z`) } })
    }

    const result = await evaluateMeaningfulConnection(match.id)
    expect(result?.isMeaningful).toBe(true)
  })

  it('a block between the two profiles disqualifies an otherwise-meaningful connection', async () => {
    const a = await createTestUser({ email: 'mcr-a5@test.com' })
    const b = await createTestUser({ email: 'mcr-b5@test.com' })
    const aId = await createTestProfile(a.id)
    const bId = await createTestProfile(b.id)
    const match = await createTestMatch(aId, bId)

    const days = ['2026-01-01', '2026-01-02', '2026-01-03']
    for (const d of days) {
      await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: a.id, body: 'oi', messageType: 'TEXT', createdAt: new Date(`${d}T10:00:00Z`) } })
      await prisma.message.create({ data: { conversationId: match.conversation.id, senderUserId: b.id, body: 'olá', messageType: 'TEXT', createdAt: new Date(`${d}T11:00:00Z`) } })
    }
    await prisma.profileAction.create({ data: { actorProfileId: aId, targetProfileId: bId, action: 'BLOCK' } })

    const result = await evaluateMeaningfulConnection(match.id)
    expect(result?.wasBlocked).toBe(true)
    expect(result?.isMeaningful).toBe(false)
  })
})
