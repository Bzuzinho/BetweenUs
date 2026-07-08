// 9.13 — AI moderation: kill switch, invalid output discarded, a valid
// assessment gets persisted, and human-decision audit (agreement stats).
import { prisma, createTestUser, createTestProfile } from './helpers'
import {
  runModerationAssessment, buildMinimizedInput, computeAgreementStats, ModerationOutputSchema
} from '../src/lib/moderationAssessmentService'

const withAiEnabled = async (fn: () => Promise<void>) => {
  const prev = process.env.AI_MODERATION_ENABLED
  process.env.AI_MODERATION_ENABLED = 'true'
  try { await fn() } finally { process.env.AI_MODERATION_ENABLED = prev }
}

describe('AI moderation — kill switch (9.8)', () => {
  it('defaults to disabled: runModerationAssessment no-ops', async () => {
    const prev = process.env.AI_MODERATION_ENABLED
    delete process.env.AI_MODERATION_ENABLED
    try {
      const userA = await createTestUser({ email: 'ai-off-a@test.com' })
      const report = await prisma.report.create({ data: { reporterUserId: userA.id, reason: 'SPAM', status: 'PENDING', priority: 1 } })
      const result = await runModerationAssessment(report.id)
      expect(result.assessment).toBeNull()
      expect(result.reason).toBe('DISABLED')

      const stored = await (prisma as any).moderationAssessment.findMany({ where: { reportId: report.id } })
      expect(stored.length).toBe(0)
    } finally { process.env.AI_MODERATION_ENABLED = prev }
  })
})

describe('AI moderation — input minimization (9.9)', () => {
  it('never includes NIF, real name, or unrelated fields — only reason/evidence excerpts/counts/signals', async () => {
    const userA = await createTestUser({ email: 'ai-min-a@test.com' })
    const userB = await createTestUser({ email: 'ai-min-b@test.com' })
    await createTestProfile(userB.id)
    const report = await prisma.report.create({
      data: { reporterUserId: userA.id, reportedUserId: userB.id, reason: 'HARASSMENT', status: 'PENDING', priority: 8 }
    })
    await (prisma as any).reportEvidence.create({ data: { reportId: report.id, type: 'MESSAGE_SNAPSHOT', data: { body: 'conteúdo relevante', senderUserId: userA.id } } })

    const input = await buildMinimizedInput(report.id)
    expect(input).not.toBeNull()
    expect(Object.keys(input!).sort()).toEqual(['priorReportCount', 'relevantEvidence', 'reportReason', 'riskSignals'].sort())
    // evidence excerpt strips the raw evidence object down to type+excerpt — no senderUserId key present
    expect(input!.relevantEvidence[0]).not.toHaveProperty('senderUserId')
    expect(input!.relevantEvidence[0]).toHaveProperty('excerpt')
  })
})

describe('AI moderation — output validation (9.10)', () => {
  it('an invalid provider output is discarded, never persisted, never throws', async () => {
    await withAiEnabled(async () => {
      const userA = await createTestUser({ email: 'ai-invalid-a@test.com' })
      const report = await prisma.report.create({ data: { reporterUserId: userA.id, reason: 'SPAM', status: 'PENDING', priority: 1 } })

      const badProvider = {
        name: 'bad', model: 'x', promptVersion: '1',
        assess: async () => ({ categories: 'not-an-array', severity: 5 }) // wrong shape + out of range
      }
      const result = await runModerationAssessment(report.id, badProvider)
      expect(result.assessment).toBeNull()
      expect(result.reason).toBe('INVALID_OUTPUT')

      const stored = await (prisma as any).moderationAssessment.findMany({ where: { reportId: report.id } })
      expect(stored.length).toBe(0)
    })
  })

  it('a provider throwing an error never blocks — returns null cleanly', async () => {
    await withAiEnabled(async () => {
      const userA = await createTestUser({ email: 'ai-throw-a@test.com' })
      const report = await prisma.report.create({ data: { reporterUserId: userA.id, reason: 'SPAM', status: 'PENDING', priority: 1 } })

      const throwingProvider = { name: 'x', model: 'x', promptVersion: '1', assess: async () => { throw new Error('network down') } }
      const result = await runModerationAssessment(report.id, throwingProvider)
      expect(result.assessment).toBeNull()
      expect(result.reason).toBe('PROVIDER_ERROR')
    })
  })

  it('ModerationOutputSchema rejects severity outside 0-1', () => {
    const bad = ModerationOutputSchema.safeParse({ categories: [], severity: 5, summary: '', recommendedPriority: 1, riskSignals: [] })
    expect(bad.success).toBe(false)
  })
})

describe('AI moderation — a valid assessment (9.8/9.11)', () => {
  it('persists provider/model/promptVersion/result/confidence when enabled and output is valid', async () => {
    await withAiEnabled(async () => {
      const userA = await createTestUser({ email: 'ai-valid-a@test.com' })
      const userB = await createTestUser({ email: 'ai-valid-b@test.com' })
      const report = await prisma.report.create({
        data: { reporterUserId: userA.id, reportedUserId: userB.id, reason: 'THREAT', status: 'PENDING', priority: 10 }
      })

      const result = await runModerationAssessment(report.id) // DEFAULT_PROVIDER
      expect(result.assessment).not.toBeNull()
      expect(result.assessment.provider).toBe('stub')
      expect(result.assessment.result.recommendedPriority).toBe(10) // THREAT = máxima
      expect(result.assessment.confidence).toBeGreaterThan(0)

      const stored = await (prisma as any).moderationAssessment.findFirst({ where: { reportId: report.id } })
      expect(stored).not.toBeNull()
    })
  })
})

describe('AI moderation — human-in-the-loop audit (9.11)', () => {
  it('computeAgreementStats compares AI recommendation vs the human-set final priority on resolved reports', async () => {
    await withAiEnabled(async () => {
      const userA = await createTestUser({ email: 'ai-agree-a@test.com' })

      // Case 1: AI recommended MAXIMUM (THREAT), human agreed (kept priority 10, RESOLVED)
      const report1 = await prisma.report.create({ data: { reporterUserId: userA.id, reason: 'THREAT', status: 'PENDING', priority: 10 } })
      await runModerationAssessment(report1.id)
      await prisma.report.update({ where: { id: report1.id }, data: { status: 'RESOLVED' } })

      // Case 2: AI recommended MINIMAL (SPAM), human overrode to a much higher priority before dismissing
      const report2 = await prisma.report.create({ data: { reporterUserId: userA.id, reason: 'SPAM', status: 'PENDING', priority: 1 } })
      await runModerationAssessment(report2.id)
      await prisma.report.update({ where: { id: report2.id }, data: { status: 'RESOLVED', priority: 10 } })

      const stats = await computeAgreementStats()
      expect(stats.totalResolvedWithAssessment).toBeGreaterThanOrEqual(2)
      expect(stats.agreementCount).toBeGreaterThanOrEqual(1)
      expect(stats.overrideCount).toBeGreaterThanOrEqual(1)
      expect(stats.agreementRate).not.toBeNull()
    })
  })
})
