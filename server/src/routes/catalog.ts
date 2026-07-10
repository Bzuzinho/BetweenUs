import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'

const router = Router()

// BETA.2 fix — none of the /admin/* routes below (genders, orientations,
// intentions, boundaries, profile-type-config — 22 routes total) had
// requireAuth in their chain, only requireAdmin(...). requireAdmin
// itself never parses the JWT; it assumes req.userId is already set by
// an earlier middleware (exactly how admin.ts's router works, via its
// own `router.use(requireAuth)` at the top — see src/routes/admin.ts).
// Without that, requireAdmin's own `prisma.user.findUnique({ where: {
// id: req.userId! } })` ran with id: undefined and threw, producing a
// 500 on every admin catalog route regardless of the caller's actual
// role (surfaced by genderCatalog.test.ts's two hard-delete tests).
// Matching admin.ts's convention here. The public /intentions, /genders,
// /orientations, /boundaries routes below already call requireAuth
// individually — that's now redundant but harmless (idempotent), so left
// as-is rather than touched for no reason.
router.use(requireAuth)

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

// Discovery validation follow-up — ruleType/constraintType exposed to the
// admin catalog for the first time (previously only settable via
// seed.ts/direct DB writes). BOUNDARY_RULE_TYPES/BOUNDARY_CONSTRAINT_TYPES
// mirror schema.prisma's enums exactly — never invented here.
const BOUNDARY_RULE_TYPES = ['MUTUAL_ALIGNMENT', 'REQUIRE_TARGET_ACCEPTANCE', 'PERSONAL_PREFERENCE', 'CANDIDATE_CONSTRAINT'] as const
const BOUNDARY_CONSTRAINT_TYPES = ['EXCLUDE_COUPLES', 'COUPLES_ONLY', 'INDIVIDUALS_ONLY', 'VERIFIED_ONLY'] as const

const boundarySchema = z.object({
  name:           z.string().min(2).max(80),
  slug:           z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  category:       z.string().min(2).max(60),
  description:    z.string().max(300).optional().nullable(),
  isHardBoundary: z.boolean().optional(),
  ruleType:       z.enum(BOUNDARY_RULE_TYPES).optional(),
  constraintType: z.enum(BOUNDARY_CONSTRAINT_TYPES).optional().nullable(),
  sensitive:      z.boolean().optional(),
  sortOrder:      z.number().int().optional(),
  active:         z.boolean().optional(),
})

// Discovery validation follow-up — CANDIDATE_CONSTRAINT requires a
// constraintType (otherwise the row is a silent no-op — see
// candidateConstraintService.ts's `if (!b.constraintType) continue`), and
// every OTHER ruleType must have constraintType null (it would never be
// read, but a stray value there is confusing/misleading in the admin UI
// and could look like it does something when it's dead data). Takes the
// EFFECTIVE (merged) values — PUT is a partial update, so this must be
// called after merging the incoming patch onto the existing row, never on
// the raw patch alone.
const validateRuleTypeConstraint = (ruleType: string, constraintType: string | null | undefined): string | null => {
  if (ruleType === 'CANDIDATE_CONSTRAINT' && !constraintType) {
    return 'ruleType=CANDIDATE_CONSTRAINT exige um constraintType.'
  }
  if (ruleType !== 'CANDIDATE_CONSTRAINT' && constraintType) {
    return `constraintType só é válido com ruleType=CANDIDATE_CONSTRAINT (atual: ${ruleType}).`
  }
  return null
}

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
    // Pre-existing bug, newly surfaced (masked until now by other compile
    // errors failing these same 22 suites first): under the strict main
    // tsconfig.json this compiles clean, but jest.config.js's ts-jest
    // transform runs with `{ strict: false }`, and under that config TS
    // widens `data`'s required fields (name/slug) to optional when
    // checked against Prisma's IntentionCreateInput XOR type — passing
    // `data` straight through as the whole `data:` value tripped it.
    // Rebuilding the object explicitly (name/slug reference data.name/
    // data.slug directly, which zod's schema DOES type as required
    // strings either way) sidesteps the inference gap.
    const intention = await prisma.intention.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category,
        sortOrder: data.sortOrder,
        active: data.active,
      }
    })
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
    const effectiveRuleType = data.ruleType || 'MUTUAL_ALIGNMENT' // matches schema.prisma's @default
    const constraintErr = validateRuleTypeConstraint(effectiveRuleType, data.constraintType)
    if (constraintErr) return res.status(400).json({ error: constraintErr })
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
    if (!prev) return res.status(404).json({ error: 'Limite não encontrado.' })
    // Discovery validation follow-up — validated against the MERGED
    // (effective) state, not the raw patch: a PUT that only sends
    // { constraintType: 'VERIFIED_ONLY' } is only valid if the row's
    // CURRENT (or concurrently-updated) ruleType is CANDIDATE_CONSTRAINT.
    const effectiveRuleType = data.ruleType ?? prev.ruleType
    const effectiveConstraintType = data.constraintType !== undefined ? data.constraintType : prev.constraintType
    const constraintErr = validateRuleTypeConstraint(effectiveRuleType, effectiveConstraintType)
    if (constraintErr) return res.status(400).json({ error: constraintErr })
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

// ─── Profile Type Config (BETA.2.9) ───────────────────────────────────────────
// Presentational metadata only — see schema.prisma's ProfileTypeConfig
// comment. No POST/DELETE: the 3 structural types (INDIVIDUAL/COUPLE/
// GROUP) are fixed, ProfileTypePolicy's own header comment explains why
// admin cannot invent a 4th one through this or any other route.
const profileTypeConfigSchema = z.object({
  label:       z.string().min(1).max(60).optional(),
  description: z.string().max(300).optional().nullable(),
  active:      z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
})

router.get('/admin/profile-type-config', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const configs = await (prisma as any).profileTypeConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json({ profileTypeConfigs: configs })
})

router.put('/admin/profile-type-config/:type', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    if (!['INDIVIDUAL', 'COUPLE', 'GROUP'].includes(req.params.type)) {
      return res.status(400).json({ error: 'Tipo estrutural desconhecido.' })
    }
    const data = profileTypeConfigSchema.parse(req.body)
    const existing = await (prisma as any).profileTypeConfig.findUnique({ where: { type: req.params.type } })
    if (!existing) return res.status(404).json({ error: 'Não encontrado — corre npm run db:seed primeiro.' })
    const updated = await (prisma as any).profileTypeConfig.update({ where: { type: req.params.type }, data })
    await logAdminAction(req.userId!, 'UPDATE_PROFILE_TYPE_CONFIG', 'profile_type_config', req.params.type, {
      previousData: { label: existing.label, active: existing.active }, newData: data, ipAddress: req.ip
    })
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
