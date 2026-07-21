import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'

const router = Router()
router.use(requireAuth)

const internalError = (res: Response, code = 'CATALOG_OPERATION_FAILED') =>
  res.status(500).json({ error: 'Erro interno.', code })
const validationError = (res: Response, err: any) =>
  res.status(400).json({ error: err.errors[0].message, code: 'CATALOG_VALIDATION_FAILED', field: err.errors[0].path?.[0] })
const duplicateSlug = (res: Response, error: string) =>
  res.status(409).json({ error, code: 'CATALOG_SLUG_ALREADY_EXISTS' })
const notFound = (res: Response, resource: string, error = 'Não encontrado.') =>
  res.status(404).json({ error, code: 'CATALOG_ITEM_NOT_FOUND', resource })
const inUse = (res: Response, resource: string, usageCount: number, error: string) =>
  res.status(409).json({ error, code: 'CATALOG_ITEM_IN_USE', resource, usageCount })

router.get('/intentions', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const intentions = await prisma.intention.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
    res.json({ intentions })
  } catch { internalError(res, 'INTENTION_CATALOG_LOAD_FAILED') }
})

router.get('/genders', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const genders = await (prisma as any).genderOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
    res.json({ genders })
  } catch { internalError(res, 'GENDER_CATALOG_LOAD_FAILED') }
})

router.get('/orientations', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const orientations = await (prisma as any).orientationOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
    res.json({ orientations })
  } catch { internalError(res, 'ORIENTATION_CATALOG_LOAD_FAILED') }
})

router.get('/boundaries', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const boundaries = await (prisma as any).boundary.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] })
    res.json({ boundaries })
  } catch { internalError(res, 'BOUNDARY_CATALOG_LOAD_FAILED') }
})

const intentionSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  description: z.string().max(300).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
})

const BOUNDARY_RULE_TYPES = ['MUTUAL_ALIGNMENT', 'REQUIRE_TARGET_ACCEPTANCE', 'PERSONAL_PREFERENCE', 'CANDIDATE_CONSTRAINT'] as const
const BOUNDARY_CONSTRAINT_TYPES = ['EXCLUDE_COUPLES', 'COUPLES_ONLY', 'INDIVIDUALS_ONLY', 'VERIFIED_ONLY'] as const

const boundarySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  category: z.string().min(2).max(60),
  description: z.string().max(300).optional().nullable(),
  isHardBoundary: z.boolean().optional(),
  ruleType: z.enum(BOUNDARY_RULE_TYPES).optional(),
  constraintType: z.enum(BOUNDARY_CONSTRAINT_TYPES).optional().nullable(),
  sensitive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
})

const validateRuleTypeConstraint = (ruleType: string, constraintType: string | null | undefined) => {
  if (ruleType === 'CANDIDATE_CONSTRAINT' && !constraintType) {
    return { error: 'ruleType=CANDIDATE_CONSTRAINT exige um constraintType.', code: 'BOUNDARY_CONSTRAINT_REQUIRED' }
  }
  if (ruleType !== 'CANDIDATE_CONSTRAINT' && constraintType) {
    return { error: `constraintType só é válido com ruleType=CANDIDATE_CONSTRAINT (atual: ${ruleType}).`, code: 'BOUNDARY_CONSTRAINT_NOT_ALLOWED' }
  }
  return null
}

router.get('/admin/intentions', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const intentions = await prisma.intention.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { profiles: true } } } })
  res.json({ intentions: intentions.map((item: any) => ({ ...item, usageCount: item._count.profiles })) })
})

router.post('/admin/intentions', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = intentionSchema.parse(req.body)
    const intention = await prisma.intention.create({ data: { name: data.name, slug: data.slug, description: data.description, category: data.category, sortOrder: data.sortOrder, active: data.active } })
    await logAdminAction(req.userId!, 'CREATE_INTENTION', 'intention', intention.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(intention)
  } catch (err: any) {
    if (err.name === 'ZodError') return validationError(res, err)
    if (err.code === 'P2002') return duplicateSlug(res, 'Já existe uma intenção com este slug.')
    internalError(res, 'INTENTION_CREATE_FAILED')
  }
})

router.put('/admin/intentions/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = intentionSchema.partial().parse(req.body)
    const prev = await prisma.intention.findUnique({ where: { id: req.params.id } })
    if (!prev) return notFound(res, 'intention', 'Intenção não encontrada.')
    const intention = await prisma.intention.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_INTENTION', 'intention', intention.id, { previousData: { name: prev.name, active: prev.active }, newData: data, ipAddress: req.ip })
    res.json(intention)
  } catch (err: any) {
    if (err.name === 'ZodError') return validationError(res, err)
    if (err.code === 'P2002') return duplicateSlug(res, 'Já existe uma intenção com este slug.')
    internalError(res, 'INTENTION_UPDATE_FAILED')
  }
})

router.delete('/admin/intentions/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const intention = await prisma.intention.findUnique({ where: { id: req.params.id } })
  if (!intention) return notFound(res, 'intention', 'Intenção não encontrada.')
  const usageCount = await prisma.profileIntention.count({ where: { intentionId: req.params.id } })
  if (usageCount > 0 && req.query.force !== 'true') return inUse(res, 'intention', usageCount, `Esta intenção está em uso por ${usageCount} perfil(is). Desactiva-a em vez de apagar.`)
  await prisma.intention.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_INTENTION', 'intention', req.params.id, { previousData: { name: intention.name, slug: intention.slug }, ipAddress: req.ip })
  res.json({ ok: true })
})

router.get('/admin/boundaries', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const boundaries = await (prisma as any).boundary.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { profiles: true } } } })
  res.json({ boundaries: boundaries.map((item: any) => ({ ...item, usageCount: item._count.profiles })) })
})

router.post('/admin/boundaries', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = boundarySchema.parse(req.body)
    const constraintError = validateRuleTypeConstraint(data.ruleType || 'MUTUAL_ALIGNMENT', data.constraintType)
    if (constraintError) return res.status(400).json(constraintError)
    const boundary = await (prisma as any).boundary.create({ data })
    await logAdminAction(req.userId!, 'CREATE_BOUNDARY', 'boundary', boundary.id, { newData: data, ipAddress: req.ip })
    res.status(201).json(boundary)
  } catch (err: any) {
    if (err.name === 'ZodError') return validationError(res, err)
    if (err.code === 'P2002') return duplicateSlug(res, 'Já existe um limite com este slug.')
    internalError(res, 'BOUNDARY_CREATE_FAILED')
  }
})

router.put('/admin/boundaries/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = boundarySchema.partial().parse(req.body)
    const prev = await (prisma as any).boundary.findUnique({ where: { id: req.params.id } })
    if (!prev) return notFound(res, 'boundary', 'Limite não encontrado.')
    const constraintError = validateRuleTypeConstraint(data.ruleType ?? prev.ruleType, data.constraintType !== undefined ? data.constraintType : prev.constraintType)
    if (constraintError) return res.status(400).json(constraintError)
    const boundary = await (prisma as any).boundary.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_BOUNDARY', 'boundary', boundary.id, { previousData: { name: prev.name, active: prev.active }, newData: data, ipAddress: req.ip })
    res.json(boundary)
  } catch (err: any) {
    if (err.name === 'ZodError') return validationError(res, err)
    if (err.code === 'P2002') return duplicateSlug(res, 'Já existe um limite com este slug.')
    internalError(res, 'BOUNDARY_UPDATE_FAILED')
  }
})

router.delete('/admin/boundaries/:id', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const boundary = await (prisma as any).boundary.findUnique({ where: { id: req.params.id } })
  if (!boundary) return notFound(res, 'boundary', 'Limite não encontrado.')
  const usageCount = await (prisma as any).profileBoundary.count({ where: { boundaryId: req.params.id } })
  if (usageCount > 0 && req.query.force !== 'true') return inUse(res, 'boundary', usageCount, `Este limite está em uso por ${usageCount} perfil(is). Desactiva-o em vez de apagar.`)
  await (prisma as any).boundary.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_BOUNDARY', 'boundary', req.params.id, { previousData: { name: boundary.name, slug: boundary.slug }, ipAddress: req.ip })
  res.json({ ok: true })
})

const optionSchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/, 'Slug deve usar apenas minúsculas, números e underscore.'),
  label: z.string().min(2).max(60),
  description: z.string().max(300).optional().nullable(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
})

const optionRoutes = (path: 'genders' | 'orientations', modelName: 'genderOption' | 'orientationOption', field: 'gender' | 'orientation', resource: 'gender' | 'orientation') => {
  const model = (prisma as any)[modelName]
  router.get(`/admin/${path}`, requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
    const options = await model.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
    const withUsage = await Promise.all(options.map(async (item: any) => ({ ...item, usageCount: await prisma.profile.count({ where: { [field]: item.slug } }) })))
    res.json({ [path]: withUsage })
  })
  router.post(`/admin/${path}`, requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
    try {
      const data = optionSchema.parse(req.body)
      const option = await model.create({ data })
      await logAdminAction(req.userId!, `CREATE_${resource.toUpperCase()}_OPTION`, `${resource}_option`, option.id, { newData: data, ipAddress: req.ip })
      res.status(201).json(option)
    } catch (err: any) {
      if (err.name === 'ZodError') return validationError(res, err)
      if (err.code === 'P2002') return duplicateSlug(res, 'Já existe uma opção com este slug.')
      internalError(res, `${resource.toUpperCase()}_OPTION_CREATE_FAILED`)
    }
  })
  router.put(`/admin/${path}/:id`, requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
    try {
      const data = optionSchema.partial().parse(req.body)
      const prev = await model.findUnique({ where: { id: req.params.id } })
      if (!prev) return notFound(res, resource)
      const option = await model.update({ where: { id: req.params.id }, data })
      await logAdminAction(req.userId!, `UPDATE_${resource.toUpperCase()}_OPTION`, `${resource}_option`, option.id, { previousData: { label: prev.label, active: prev.active }, newData: data, ipAddress: req.ip })
      res.json(option)
    } catch (err: any) {
      if (err.name === 'ZodError') return validationError(res, err)
      if (err.code === 'P2002') return duplicateSlug(res, 'Já existe uma opção com este slug.')
      internalError(res, `${resource.toUpperCase()}_OPTION_UPDATE_FAILED`)
    }
  })
  router.delete(`/admin/${path}/:id`, requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
    const option = await model.findUnique({ where: { id: req.params.id } })
    if (!option) return notFound(res, resource)
    const usageCount = await prisma.profile.count({ where: { [field]: option.slug } })
    if (usageCount > 0 && req.query.force !== 'true') return inUse(res, resource, usageCount, `Esta opção está em uso por ${usageCount} perfil(is). Desactiva-a em vez de apagar.`)
    await model.delete({ where: { id: req.params.id } })
    await logAdminAction(req.userId!, `DELETE_${resource.toUpperCase()}_OPTION`, `${resource}_option`, req.params.id, { previousData: { label: option.label, slug: option.slug }, ipAddress: req.ip })
    res.json({ ok: true })
  })
}

optionRoutes('genders', 'genderOption', 'gender', 'gender')
optionRoutes('orientations', 'orientationOption', 'orientation', 'orientation')

const profileTypeConfigSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  description: z.string().max(300).optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

router.get('/admin/profile-type-config', requireAdmin('catalog'), async (_req: AuthRequest, res: Response) => {
  const configs = await (prisma as any).profileTypeConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json({ profileTypeConfigs: configs })
})

router.put('/admin/profile-type-config/:type', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    if (!['INDIVIDUAL', 'COUPLE', 'GROUP'].includes(req.params.type)) return res.status(400).json({ error: 'Tipo estrutural desconhecido.', code: 'PROFILE_TYPE_UNKNOWN' })
    const data = profileTypeConfigSchema.parse(req.body)
    const existing = await (prisma as any).profileTypeConfig.findUnique({ where: { type: req.params.type } })
    if (!existing) return notFound(res, 'profile_type', 'Não encontrado — corre npm run db:seed primeiro.')
    const updated = await (prisma as any).profileTypeConfig.update({ where: { type: req.params.type }, data })
    await logAdminAction(req.userId!, 'UPDATE_PROFILE_TYPE_CONFIG', 'profile_type_config', req.params.type, { previousData: { label: existing.label, active: existing.active }, newData: data, ipAddress: req.ip })
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return validationError(res, err)
    internalError(res, 'PROFILE_TYPE_CONFIG_UPDATE_FAILED')
  }
})

export default router
