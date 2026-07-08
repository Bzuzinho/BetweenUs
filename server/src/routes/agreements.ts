// 6.1/6.2/6.3/6.4 — Modo Acordo API.
//
// Every write route below resolves profileMemberId from the AUTHENTICATED
// user (via resolveMyProfileId + profileAgreementService's internal
// resolveProfileMemberId) — there is no request field that lets a client
// specify whose answer this is. That's what makes "you can never answer
// for your partner" true by construction rather than by convention.
import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import {
  getAgreementSummary, getMyAnswers, submitAnswer, lockAgreement, startNewRound,
} from '../lib/profileAgreementService'

const router = Router()

// GET /api/agreements/questions — the combined catalog a couple/group can
// answer against: active Boundary entries (third-party compatibility
// signals, reused as-is) plus active AgreementQuestion entries (couple-
// internal process questions). Client renders both under one "Modo Acordo"
// form; only the ref shape (boundaryId vs agreementQuestionId) differs.
router.get('/questions', requireAuth, async (_req: AuthRequest, res: Response) => {
  const [boundaries, questions] = await Promise.all([
    prisma.boundary.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    (prisma as any).agreementQuestion.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
  ])
  res.json({
    boundaries: boundaries.map((b: any) => ({ ref: { boundaryId: b.id }, slug: b.slug, label: b.name, category: b.category, isHardBoundary: b.isHardBoundary })),
    questions: questions.map((q: any) => ({ ref: { agreementQuestionId: q.id }, slug: q.slug, label: q.label, category: q.category })),
  })
})

// GET /api/agreements/me — shared/merged summary for the caller's own
// couple/group profile. Never includes per-member answers (see
// profileAgreementService.getAgreementSummary's doc comment).
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const summary = await getAgreementSummary(profileId)
  if (!summary) return res.status(400).json({ error: 'Modo Acordo não se aplica a perfis individuais.' })
  res.json(summary)
})

// GET /api/agreements/me/my-answers — the caller's OWN answers only, to
// prefill their own edit form (fine to show yourself your own choices).
router.get('/me/my-answers', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const mine = await getMyAnswers(profileId, req.userId!)
  if (!mine) return res.status(400).json({ error: 'Modo Acordo não se aplica a perfis individuais, ou não pertences a este perfil.' })
  res.json(mine)
})

const answerSchema = z.object({
  boundaryId: z.string().optional(),
  agreementQuestionId: z.string().optional(),
  preference: z.enum(['YES', 'MAYBE', 'NO']),
})

// PUT /api/agreements/me/answer — submit/update ONE answer for the calling
// member. Deliberately one-at-a-time rather than a bulk replace (unlike
// PUT /profiles/me/boundaries) — 6.4's conflict view needs to react
// question-by-question, and a bulk replace would make it too easy to
// accidentally blow away a partner's already-recorded answers.
router.put('/me/answer', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = answerSchema.parse(req.body)
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const result = await submitAnswer(
      profileId, req.userId!,
      { boundaryId: body.boundaryId, agreementQuestionId: body.agreementQuestionId },
      body.preference
    )
    if (!result.ok) return res.status(400).json({ error: result.error })
    res.json({ ok: true, status: result.status })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[AGREEMENT ANSWER]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/agreements/me/lock — 6.4: locking is explicit and separate
// from reaching ALIGNED. A CONFLICT round can be locked as-is — there is
// no requirement to resolve disagreement first, which would create exactly
// the "pressure toward YES" the spec warns against.
router.post('/me/lock', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const result = await lockAgreement(profileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, status: result.status })
})

// POST /api/agreements/me/new-round — start a fresh version, e.g. to
// reconsider after a LOCKED round.
router.post('/me/new-round', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const result = await startNewRound(profileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, status: result.status })
})

// ── Admin visibility (6.10) ──
// Deliberately mirrors getAgreementSummary's privacy shape: status,
// per-question merged result and alignment flag, counts. NEVER per-member
// answers by default — see the dedicated /admin/:profileId/raw route below
// for the explicit, separately-logged exception path.
router.get('/admin/:profileId', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const summary = await getAgreementSummary(req.params.profileId)
  if (!summary) return res.status(404).json({ error: 'Sem Modo Acordo para este perfil (perfil individual ou inexistente).' })
  res.json(summary)
})

// GET /api/agreements/admin/:profileId/raw — the ONE place per-member
// answers are ever exposed, and only to admins, and only ever logged as an
// explicit admin action (6.10: "visibilidade admin-only... sem expor
// respostas individuais de agreement por default" — this route is the
// deliberate non-default exception, not a bypass of that rule).
router.get('/admin/:profileId/raw', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const agreement = await (prisma as any).profileAgreement.findFirst({
    where: { profileId: req.params.profileId }, orderBy: { version: 'desc' },
    include: {
      answers: {
        include: {
          boundary: { select: { name: true, slug: true } },
          agreementQuestion: { select: { label: true, slug: true } },
          profileMember: { select: { userId: true, isCreator: true, user: { select: { email: true } } } },
        }
      }
    }
  })
  if (!agreement) return res.status(404).json({ error: 'Sem Modo Acordo para este perfil.' })
  await logAdminAction(req.userId!, 'VIEW_AGREEMENT_RAW_ANSWERS', 'profile_agreement', agreement.id, { ipAddress: req.ip })
  res.json({
    id: agreement.id, version: agreement.version, status: agreement.status,
    answers: agreement.answers.map((a: any) => ({
      member: { userId: a.profileMember.userId, isCreator: a.profileMember.isCreator, email: a.profileMember.user?.email },
      question: a.boundary?.name || a.agreementQuestion?.label,
      ref: a.boundaryId ? { boundaryId: a.boundaryId } : { agreementQuestionId: a.agreementQuestionId },
      preference: a.preference,
    }))
  })
})

// ── Admin catalog CRUD for AgreementQuestion (6.2, same pattern as
// private-interests admin CRUD) ──
const questionSchema = z.object({
  slug:        z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  label:       z.string().min(2).max(120),
  description: z.string().max(300).optional().nullable(),
  category:    z.string().max(60).optional().nullable(),
  sortOrder:   z.number().int().optional(),
  active:      z.boolean().optional(),
})

router.get('/admin-catalog/questions', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const questions = await (prisma as any).agreementQuestion.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
  const withUsage = await Promise.all(questions.map(async (q: any) => ({
    ...q, usageCount: await (prisma as any).profileAgreementAnswer.count({ where: { agreementQuestionId: q.id } })
  })))
  res.json({ questions: withUsage })
})

router.post('/admin-catalog/questions', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = questionSchema.parse(req.body)
    const question = await (prisma as any).agreementQuestion.create({ data })
    await logAdminAction(req.userId!, 'CREATE_AGREEMENT_QUESTION', 'agreement_question', question.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(question)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma pergunta com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin-catalog/questions/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = questionSchema.partial().parse(req.body)
    const prev = await (prisma as any).agreementQuestion.findUnique({ where: { id: req.params.id } })
    const question = await (prisma as any).agreementQuestion.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_AGREEMENT_QUESTION', 'agreement_question', question.id, {
      previousData: prev ? { label: prev.label, active: prev.active } : undefined, newData: data, ipAddress: req.ip
    })
    res.json(question)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/admin-catalog/questions/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const q = await (prisma as any).agreementQuestion.findUnique({ where: { id: req.params.id } })
  if (!q) return res.status(404).json({ error: 'Não encontrado.' })
  const usageCount = await (prisma as any).profileAgreementAnswer.count({ where: { agreementQuestionId: q.id } })
  if (usageCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({ error: `Em uso por ${usageCount} resposta(s). Desactiva em vez de apagar.`, code: 'IN_USE', usageCount })
  }
  await (prisma as any).agreementQuestion.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_AGREEMENT_QUESTION', 'agreement_question', req.params.id, {
    previousData: { label: q.label, slug: q.slug }, ipAddress: req.ip
  })
  res.json({ ok: true })
})

export default router
