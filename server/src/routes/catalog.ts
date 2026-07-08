import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'

const router = Router()

// GET /api/catalog/intentions — active only, for onboarding/discovery
router.get('/intentions', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const intentions = await prisma.intention.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    })
    res.json({ intentions })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/catalog/genders — active only
router.get('/genders', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const genders = await (prisma as any).genderOption.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
    })
    res.json({ genders })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/catalog/orientations — active only. 4.4: mirrors /genders —
// orientation had no catalog and no UI input at all before this.
router.get('/orientations', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const orientations = await (prisma as any).orientationOption.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
    })
    res.json({ orientations })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/catalog/boundaries — active only, grouped by category
router.get('/boundaries', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const boundaries = await (prisma as any).boundary.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }]
    })
    res.json({ boundaries })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Admin CRUD — Sprint 2.5.7 / 2.5.8 ────────────────────────────────────────
// Taxonomias (Intentions/Boundaries) geridas em Admin > Configurações > Perfis.
// Regra: nunca apagar fisicamente uma entrada já usada — só desactivar. Apagar
// só é permitido quando usageCount === 0 (ou com ?force=true, explicitamente).

const intentionSchema = z.object({
  name:        z.string().min(2).max(80),
  slug:        z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  description: z.string().max(300).optional().nullable(),
  category:    z.string().max(60).optional().nullable(),
  sortOrder:   z.number().int().optional(),
  active:      z.boolean().optional(),
})

const boundarySchema = z.object({
  name:           z.string().min(2).max(80),
  slug:           z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  category:       z.string().min(2).max(60),
  description:    z.string().max(300).optional().nullable(),
  isHardBoundary: z.boolean().optional(),
  sensitive:      z.boolean().optional(),
  sortOrder:      z.number().int().optional(),
  active:         z.boolean().optional(),
})

// ── Intentions ──
router.get('/admin/intentions', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const intentions = await prisma.intention.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { profiles: true } } }
  })
  res.json({ intentions: intentions.map((i: any) => ({ ...i, usageCount: i._count.profiles })) })
})

router.post('/admin/intentions', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = intentionSchema.parse(req.body)
    const intention = await prisma.intention.create({ data })
    await logAdminAction(req.userId!, 'CREATE_INTENTION', 'intention', intention.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(intention)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma intenção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin/intentions/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = intentionSchema.partial().parse(req.body)
    const prev = await prisma.intention.findUnique({ where: { id: req.params.id } })
    const intention = await prisma.intention.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_INTENTION', 'intention', intention.id, {
      previousData: prev ? { name: prev.name, active: prev.active } : undefined, newData: data, ipAddress: req.ip
    })
    res.json(intention)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma intenção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/admin/intentions/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const usageCount = await prisma.profileIntention.count({ where: { intentionId: req.params.id } })
  if (usageCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `Esta intenção está em uso por ${usageCount} perfil(is). Desactiva-a em vez de apagar.`,
      code: 'IN_USE', usageCount
    })
  }
  const intention = await prisma.intention.findUnique({ where: { id: req.params.id } })
  await prisma.intention.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_INTENTION', 'intention', req.params.id, {
    previousData: intention ? { name: intention.name, slug: intention.slug } : undefined, ipAddress: req.ip
  })
  res.json({ ok: true })
})

// ── Boundaries ──
router.get('/admin/boundaries', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const boundaries = await (prisma as any).boundary.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { profiles: true } } }
  })
  res.json({ boundaries: boundaries.map((b: any) => ({ ...b, usageCount: b._count.profiles })) })
})

router.post('/admin/boundaries', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = boundarySchema.parse(req.body)
    const boundary = await (prisma as any).boundary.create({ data })
    await logAdminAction(req.userId!, 'CREATE_BOUNDARY', 'boundary', boundary.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(boundary)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um limite com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin/boundaries/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = boundarySchema.partial().parse(req.body)
    const prev = await (prisma as any).boundary.findUnique({ where: { id: req.params.id } })
    const boundary = await (prisma as any).boundary.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_BOUNDARY', 'boundary', boundary.id, {
      previousData: prev ? { name: prev.name, active: prev.active } : undefined, newData: data, ipAddress: req.ip
    })
    res.json(boundary)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um limite com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/admin/boundaries/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const usageCount = await (prisma as any).profileBoundary.count({ where: { boundaryId: req.params.id } })
  if (usageCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `Este limite está em uso por ${usageCount} perfil(is). Desactiva-o em vez de apagar.`,
      code: 'IN_USE', usageCount
    })
  }
  const boundary = await (prisma as any).boundary.findUnique({ where: { id: req.params.id } })
  await (prisma as any).boundary.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_BOUNDARY', 'boundary', req.params.id, {
    previousData: boundary ? { name: boundary.name, slug: boundary.slug } : undefined, ipAddress: req.ip
  })
  res.json({ ok: true })
})

const genderSchema = z.object({
  slug:        z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  label:       z.string().min(2).max(60),
  description: z.string().max(300).optional().nullable(),
  sortOrder:   z.number().int().optional(),
  active:      z.boolean().optional(),
})

const orientationSchema = genderSchema // identical shape

// ── Genders ──
router.get('/admin/genders', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const genders = await (prisma as any).genderOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
  const withUsage = await Promise.all(genders.map(async (g: any) => ({
    ...g, usageCount: await prisma.profile.count({ where: { gender: g.slug } })
  })))
  res.json({ genders: withUsage })
})

router.post('/admin/genders', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = genderSchema.parse(req.body)
    const gender = await (prisma as any).genderOption.create({ data })
    await logAdminAction(req.userId!, 'CREATE_GENDER_OPTION', 'gender_option', gender.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(gender)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma opção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin/genders/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = genderSchema.partial().parse(req.body)
    const prev = await (prisma as any).genderOption.findUnique({ where: { id: req.params.id } })
    const gender = await (prisma as any).genderOption.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_GENDER_OPTION', 'gender_option', gender.id, {
      previousData: prev ? { label: prev.label, active: prev.active } : undefined, newData: data, ipAddress: req.ip
    })
    res.json(gender)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma opção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/admin/genders/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const opt = await (prisma as any).genderOption.findUnique({ where: { id: req.params.id } })
  if (!opt) return res.status(404).json({ error: 'Não encontrado.' })
  const usageCount = await prisma.profile.count({ where: { gender: opt.slug } })
  if (usageCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `Esta opção está em uso por ${usageCount} perfil(is). Desactiva-a em vez de apagar.`,
      code: 'IN_USE', usageCount
    })
  }
  await (prisma as any).genderOption.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_GENDER_OPTION', 'gender_option', req.params.id, {
    previousData: { label: opt.label, slug: opt.slug }, ipAddress: req.ip
  })
  res.json({ ok: true })
})

// ── Orientations (4.4) ──
router.get('/admin/orientations', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const orientations = await (prisma as any).orientationOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
  const withUsage = await Promise.all(orientations.map(async (o: any) => ({
    ...o, usageCount: await prisma.profile.count({ where: { orientation: o.slug } })
  })))
  res.json({ orientations: withUsage })
})

router.post('/admin/orientations', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = orientationSchema.parse(req.body)
    const orientation = await (prisma as any).orientationOption.create({ data })
    await logAdminAction(req.userId!, 'CREATE_ORIENTATION_OPTION', 'orientation_option', orientation.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(orientation)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma opção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin/orientations/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = orientationSchema.partial().parse(req.body)
    const prev = await (prisma as any).orientationOption.findUnique({ where: { id: req.params.id } })
    const orientation = await (prisma as any).orientationOption.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_ORIENTATION_OPTION', 'orientation_option', orientation.id, {
      previousData: prev ? { label: prev.label, active: prev.active } : undefined, newData: data, ipAddress: req.ip
    })
    res.json(orientation)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma opção com este slug.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/admin/orientations/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const opt = await (prisma as any).orientationOption.findUnique({ where: { id: req.params.id } })
  if (!opt) return res.status(404).json({ error: 'Não encontrado.' })
  const usageCount = await prisma.profile.count({ where: { orientation: opt.slug } })
  if (usageCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `Esta opção está em uso por ${usageCount} perfil(is). Desactiva-a em vez de apagar.`,
      code: 'IN_USE', usageCount
    })
  }
  await (prisma as any).orientationOption.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_ORIENTATION_OPTION', 'orientation_option', req.params.id, {
    previousData: { label: opt.label, slug: opt.slug }, ipAddress: req.ip
  })
  res.json({ ok: true })
})

export default router
