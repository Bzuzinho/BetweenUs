// 4.8 — Private Interests ("fetiches privados")
//
// Deliberately its own router/model, not folded into intentions or
// catalog.ts's boundaries — the whole point is that these selections are
// NEVER exposed publicly in detail. GET /me returns the caller's own
// selections (they can see their own, obviously); every other consumer
// only ever gets an aggregate count via /alignment/:profileId, never the
// list of which interests matched.
import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { countAlignedPrivateInterests } from '../lib/privateInterestService'

const router = Router()

// GET /api/private-interests — active catalog, for the selection UI
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  const interests = await (prisma as any).privateInterest.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
  })
  res.json({ interests })
})

// GET /api/private-interests/me — the caller's OWN selections (full detail
// is fine here — you're allowed to see your own choices)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! }, select: { id: true } })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const selections = await (prisma as any).profilePrivateInterest.findMany({
    where: { profileId: profile.id },
    include: { interest: true }
  })
  res.json({ selections })
})

// PUT /api/private-interests/me — replace the caller's selections
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId! }, select: { id: true } })
  if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const { selections } = req.body
  if (!Array.isArray(selections)) return res.status(400).json({ error: 'Formato inválido.' })

  await (prisma as any).profilePrivateInterest.deleteMany({ where: { profileId: profile.id } })
  await (prisma as any).profilePrivateInterest.createMany({
    data: selections
      .filter((s: any) => s.interestId && ['YES', 'MAYBE', 'NO'].includes(s.preference))
      .map((s: any) => ({ profileId: profile.id, interestId: s.interestId, preference: s.preference }))
  })
  res.json({ ok: true })
})

// GET /api/private-interests/alignment/:profileId — aggregate ONLY. This
// is the "4 private interests aligned" the spec asks for — never the list
// of which ones, never even to the two people it's about, without a
// future explicit-consent reveal flow.
router.get('/alignment/:profileId', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! }, select: { id: true } })
  if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const alignedCount = await countAlignedPrivateInterests(myProfile.id, req.params.profileId)
  res.json({ alignedCount })
})

// ── Admin catalog CRUD ──
const interestSchema = z.object({
  slug:        z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  label:       z.string().min(2).max(60),
  category:    z.string().max(60).optional().nullable(),
  description: z.string().max(300).optional().nullable(),
  sortOrder:   z.number().int().optional(),
  active:      z.boolean().optional(),
})

router.get('/admin', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const interests = await (prisma as any).privateInterest.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
  const withUsage = await Promise.all(interests.map(async (i: any) => ({
    ...i, usageCount: await (prisma as any).profilePrivateInterest.count({ where: { interestId: i.id } })
  })))
  res.json({ interests: withUsage })
})

router.post('/admin', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = interestSchema.parse(req.body)
    const interest = await (prisma as any).privateInterest.create({ data })
    await logAdminAction(req.userId!, 'CREATE_PRIVATE_INTEREST', 'private_interest', interest.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(interest)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma opção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = interestSchema.partial().parse(req.body)
    const prev = await (prisma as any).privateInterest.findUnique({ where: { id: req.params.id } })
    const interest = await (prisma as any).privateInterest.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_PRIVATE_INTEREST', 'private_interest', interest.id, {
      previousData: prev ? { label: prev.label, active: prev.active } : undefined, newData: data, ipAddress: req.ip
    })
    res.json(interest)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/admin/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const opt = await (prisma as any).privateInterest.findUnique({ where: { id: req.params.id } })
  if (!opt) return res.status(404).json({ error: 'Não encontrado.' })
  const usageCount = await (prisma as any).profilePrivateInterest.count({ where: { interestId: opt.id } })
  if (usageCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({ error: `Em uso por ${usageCount} perfil(is). Desactiva em vez de apagar.`, code: 'IN_USE', usageCount })
  }
  await (prisma as any).privateInterest.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_PRIVATE_INTEREST', 'private_interest', req.params.id, {
    previousData: { label: opt.label, slug: opt.slug }, ipAddress: req.ip
  })
  res.json({ ok: true })
})

export default router
