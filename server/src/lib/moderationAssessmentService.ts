// 9.8/9.9/9.10/9.11 — AI-assisted moderation, kept strictly advisory.
//
// No AI/LLM SDK exists anywhere else in this codebase and this sandbox
// has no network access to a real provider, so `provider` is built as a
// small, swappable interface: DEFAULT_PROVIDER below is a deterministic,
// clearly-documented placeholder (NOT a real model call) that produces
// output in the right shape so the surrounding machinery — minimization,
// Zod validation, the kill switch, persistence, and the human-in-the-loop
// wiring — is fully real and testable today. Swapping in a real provider
// later is exactly one function (assess()) away; nothing else in this
// file, moderation.ts, or the admin dashboard needs to change.
import { z } from 'zod'
import prisma from './prisma'
import { computeReportPriority, ReportReasonValue } from './reportPriorityService'

// 9.8 — kill switch. Deliberately DEFAULT-OFF (opposite polarity from
// e.g. GROUP_PROFILES_ENABLED, which defaults on) — sending report
// content to any assessment layer, even a local stub, is exactly the
// kind of thing that should require an explicit opt-in, not an explicit
// opt-out.
export const isAiModerationEnabled = (): boolean => process.env.AI_MODERATION_ENABLED === 'true'

// 9.9 — the ONLY fields that ever leave this function. Explicitly no
// NIF, no real name, no full date of birth, no unrelated private photos,
// no full message history (only the specific evidence already attached
// to THIS report, and even then content only — no senderUserId/
// profileId is included, since categorization needs the content, not
// who's attached to it), no unrelated private interests.
export interface MinimizedModerationInput {
  reportReason: string
  relevantEvidence: Array<{ type: string; excerpt: string }>
  priorReportCount: number
  riskSignals: string[]
}

const excerptForEvidence = (e: { type: string; data: any }): string => {
  switch (e.type) {
    case 'MESSAGE_SNAPSHOT':
      return String(e.data?.body || '').slice(0, 500)
    case 'PROFILE_SNAPSHOT':
      return `profile type=${e.data?.type || 'unknown'} status=${e.data?.status || 'unknown'}`
    case 'MEDIA_REFERENCE':
      return `media visibility=${e.data?.visibilityLevel || 'unknown'} moderation=${e.data?.moderationStatus || 'unknown'}`
    case 'ROOM_CONTEXT':
      return `room type=${e.data?.roomType || 'unknown'} status=${e.data?.status || 'unknown'} members=${(e.data?.memberUserIds || []).length}`
    default:
      return String(e.data?.label || 'system event')
  }
}

export const buildMinimizedInput = async (reportId: string): Promise<MinimizedModerationInput | null> => {
  const report = await prisma.report.findUnique({ where: { id: reportId } })
  if (!report) return null

  const evidence = await (prisma as any).reportEvidence.findMany({ where: { reportId } })
  const priorReportCount = report.reportedUserId
    ? await prisma.report.count({ where: { reportedUserId: report.reportedUserId, id: { not: reportId }, status: { in: ['PENDING', 'REVIEWING', 'ESCALATED'] } } })
    : 0

  const riskSignals: string[] = [report.reason]
  if (priorReportCount >= 2) riskSignals.push('RECIDIVISM')

  return {
    reportReason: report.reason,
    relevantEvidence: evidence.map((e: any) => ({ type: e.type, excerpt: excerptForEvidence(e) })),
    priorReportCount,
    riskSignals,
  }
}

// 9.10 — validated output shape. Any assessment that doesn't match this
// exactly is discarded (see runModerationAssessment) — an invalid AI
// output is treated the same as no AI output at all, never surfaced to a
// moderator as if it were trustworthy.
export const ModerationOutputSchema = z.object({
  categories: z.array(z.string()),
  severity: z.number().min(0).max(1),
  summary: z.string().max(1000),
  recommendedPriority: z.number().min(0).max(10),
  riskSignals: z.array(z.string()),
})
export type ModerationOutput = z.infer<typeof ModerationOutputSchema>

export interface ModerationProvider {
  name: string
  model: string
  promptVersion: string
  assess: (input: MinimizedModerationInput) => Promise<unknown>
}

// 9.8 — placeholder provider. Deterministic (no external call, no
// network, no API key) so it's safe to run in any environment including
// this sandbox and CI. Its recommendation intentionally starts from the
// SAME rule engine as ReportPriorityService (9.4) — it's a legitimate
// starting point for a real model to eventually improve on, not a random
// number. Replace `assess` with a real HTTP call to a provider when one
// is actually wired up; nothing else needs to change.
export const DEFAULT_PROVIDER: ModerationProvider = {
  name: 'stub',
  model: 'rule-engine-mirror-v1',
  promptVersion: '2026-07-stub-1',
  assess: async (input: MinimizedModerationInput): Promise<ModerationOutput> => {
    const { priority, tier } = computeReportPriority({
      reason: input.reportReason as ReportReasonValue,
      openReportCountForTarget: input.priorReportCount,
    })
    const severity = Math.min(1, priority / 10)
    return {
      categories: [input.reportReason],
      severity,
      summary: `Denúncia por ${input.reportReason.toLowerCase()}${input.priorReportCount > 0 ? ` — alvo com ${input.priorReportCount} denúncia(s) em aberto` : ''}.`,
      recommendedPriority: priority,
      riskSignals: input.riskSignals,
    }
  }
}

interface RunResult {
  assessment: any | null
  reason?: 'DISABLED' | 'NO_REPORT' | 'PROVIDER_ERROR' | 'INVALID_OUTPUT'
}

// 9.8-9.11 — the single entry point. Never throws: a disabled flag, a
// missing report, a provider error, or an invalid output all resolve to
// `{ assessment: null }` so a caller can always proceed with human
// moderation regardless of what happened here (spec 9.10: "nunca bloquear
// moderação humana por erro IA").
export const runModerationAssessment = async (reportId: string, provider: ModerationProvider = DEFAULT_PROVIDER): Promise<RunResult> => {
  if (!isAiModerationEnabled()) return { assessment: null, reason: 'DISABLED' }

  const input = await buildMinimizedInput(reportId)
  if (!input) return { assessment: null, reason: 'NO_REPORT' }

  let raw: unknown
  try {
    raw = await provider.assess(input)
  } catch (err: any) {
    console.error('[MODERATION AI]', err.message)
    return { assessment: null, reason: 'PROVIDER_ERROR' }
  }

  const parsed = ModerationOutputSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('[MODERATION AI] invalid output shape, discarding', parsed.error.message)
    return { assessment: null, reason: 'INVALID_OUTPUT' }
  }

  const assessment = await (prisma as any).moderationAssessment.create({
    data: {
      reportId, provider: provider.name, model: provider.model, promptVersion: provider.promptVersion,
      result: parsed.data, confidence: parsed.data.severity,
    }
  })

  return { assessment }
}

export const getLatestAssessment = async (reportId: string) => {
  return (prisma as any).moderationAssessment.findFirst({ where: { reportId }, orderBy: { createdAt: 'desc' } })
}

// 9.11 — human-in-the-loop measurement. Buckets both the AI's
// recommendedPriority and the report's final (human-set) priority into
// the same tiers ReportPriorityService uses, and compares. "Override" =
// human's final priority tier differs from what the AI recommended.
// False-positive reviews are approximated as: AI flagged HIGH/MAXIMUM
// severity but the human ultimately DISMISSED the report — an
// identifiable proxy, not a claim of certainty, and documented as such.
const tierFor = (priority: number): string => {
  if (priority >= 10) return 'MAXIMUM'
  if (priority >= 8) return 'HIGH'
  if (priority >= 7) return 'ELEVATED'
  if (priority >= 5) return 'MODERATE'
  if (priority >= 3) return 'LOW'
  if (priority >= 1) return 'MINIMAL'
  return 'NONE'
}

export const computeAgreementStats = async () => {
  const assessed = await (prisma as any).moderationAssessment.findMany({
    include: { report: { select: { id: true, priority: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Only the latest assessment per report counts.
  const latestByReport = new Map<string, any>()
  for (const a of assessed) {
    if (!latestByReport.has(a.reportId)) latestByReport.set(a.reportId, a)
  }

  let agreementCount = 0
  let overrideCount = 0
  let possibleFalsePositives = 0
  const resolvedOnly = [...latestByReport.values()].filter(a => ['RESOLVED', 'DISMISSED'].includes(a.report.status))

  for (const a of resolvedOnly) {
    const aiTier = tierFor(a.result?.recommendedPriority ?? 0)
    const humanTier = tierFor(a.report.priority)
    if (aiTier === humanTier) agreementCount++
    else overrideCount++

    const aiSeverityHigh = (a.result?.severity ?? 0) >= 0.8
    if (aiSeverityHigh && a.report.status === 'DISMISSED') possibleFalsePositives++
  }

  return {
    totalAssessed: latestByReport.size,
    totalResolvedWithAssessment: resolvedOnly.length,
    agreementCount,
    overrideCount,
    agreementRate: resolvedOnly.length > 0 ? agreementCount / resolvedOnly.length : null,
    possibleFalsePositives,
  }
}
