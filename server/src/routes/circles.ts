import { Router, Response, Request } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import { uniqueSlug } from '../lib/slugify'
import {
  requestMembership, addMemberDirectly, approveMembership, declineMembership,
  leaveCircle, removeMember, setMemberRole, isMembershipVisibleToOthers
} from '../lib/circleService'

const router = Router()

// GET /api/circles — public browse. 10.9/10.12 — only DISCOVERABLE +
// ACTIVE circles are ever listed here; PRIVATE/INVITE_ONLY circles are
// reachable only by slug (direct link) or admin, never in this list.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { city } = req.query
    const circles = await (prisma as any).circle.findMany({
      where: { visibility: 'DISCOVERABLE', status: 'ACTIVE', ...(city ? { city: city as string } : {}) },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ circles })
  } catch {
    res.json({ circles: [] })
  }
})

// GET /api/circles/mine — circles the caller currently belongs to.
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.json({ memberships: [] })
  const memberships = await (prisma as any).circleMembership.findMany({
    where: { profileId: myProfileId, status: { in: ['APPROVED', 'REQUESTED'] } },
    include: { circle: true }
  })
  res.json({ memberships })
})

// GET /api/circles/:slug — detail. PRIVATE circles are viewable if you
// know the slug (not listed, but not access-controlled beyond that);
// INVITE_ONLY circles are viewable too (so an invited person can see what
// they're being invited to) — only JOINING is restricted for those.
router.get('/:slug', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle || circle.status === 'ARCHIVED') return res.status(404).json({ error: 'Circle não encontrado.' })

  const myProfileId = await resolveMyProfileId(req.userId!)
  const myMembership = myProfileId
    ? await (prisma as any).circleMembership.findUnique({ where: { circleId_profileId: { circleId: circle.id, profileId: myProfileId } } })
    : null

  const memberCount = await (prisma as any).circleMembership.count({ where: { circleId: circle.id, status: 'APPROVED' } })
  res.json({ ...circle, memberCount, myMembership })
})

// GET /api/circles/:slug/members — roster visible to APPROVED members of
// THIS circle (and admins) only — not the public. This is the circle's
// own internal member list, distinct from whether an individual member's
// badge shows up elsewhere (that's isMembershipVisibleToOthers, 10.12).
router.get('/:slug/members', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle) return res.status(404).json({ error: 'Circle não encontrado.' })

  const myProfileId = await resolveMyProfileId(req.userId!)
  const myMembership = myProfileId
    ? await (prisma as any).circleMembership.findUnique({ where: { circleId_profileId: { circleId: circle.id, profileId: myProfileId } } })
    : null
  if (!myMembership || myMembership.status !== 'APPROVED') {
    return res.status(403).json({ error: 'Só membros deste Circle podem ver a lista.' })
  }

  const members = await (prisma as any).circleMembership.findMany({
    where: { circleId: circle.id, status: 'APPROVED' },
    include: { profile: { select: { id: true, displayName: true, type: true } } }
  })
  const requests = myMembership.role === 'LOCAL_MODERATOR'
    ? await (prisma as any).circleMembership.findMany({
        where: { circleId: circle.id, status: 'REQUESTED' },
        include: { profile: { select: { id: true, displayName: true, type: true } } }
      })
    : []
  res.json({ members, requests })
})

// ─── Membership actions ─────────────────────────────────────────────────────
router.post('/:slug/join', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle) return res.status(404).json({ error: 'Circle não encontrado.' })
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await requestMembership(circle.id, myProfileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.status(201).json(result.membership)
})

router.post('/:slug/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle) return res.status(404).json({ error: 'Circle não encontrado.' })
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await leaveCircle(circle.id, myProfileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.membership)
})

// Local-moderator (or admin) actions — approve/decline/remove/promote.
const requireModOrAdmin = async (req: AuthRequest, circleId: string) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  return { myProfileId }
}

router.post('/:slug/members/:membershipId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle) return res.status(404).json({ error: 'Circle não encontrado.' })
  const { myProfileId } = await requireModOrAdmin(req, circle.id)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await approveMembership(circle.id, req.params.membershipId, myProfileId, false)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.membership)
})

router.post('/:slug/members/:membershipId/decline', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle) return res.status(404).json({ error: 'Circle não encontrado.' })
  const { myProfileId } = await requireModOrAdmin(req, circle.id)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await declineMembership(circle.id, req.params.membershipId, myProfileId, false)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.membership)
})

router.post('/:slug/members/:membershipId/remove', requireAuth, async (req: AuthRequest, res: Response) => {
  const circle = await (prisma as any).circle.findUnique({ where: { slug: req.params.slug } })
  if (!circle) return res.status(404).json({ error: 'Circle não encontrado.' })
  const { myProfileId } = await requireModOrAdmin(req, circle.id)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await removeMember(circle.id, req.params.membershipId, myProfileId, false)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.membership)
})

// GET /api/circles/badge/:profileId — 10.12: the ONLY route that exposes
// which Circles a profile belongs to outside that circle's own member
// list, and it's gated by isMembershipVisibleToOthers first.
router.get('/badge/:profileId', requireAuth, async (req: AuthRequest, res: Response) => {
  const visible = await isMembershipVisibleToOthers(req.params.profileId)
  if (!visible) return res.json({ circles: [] })

  const memberships = await (prisma as any).circleMembership.findMany({
    where: { profileId: req.params.profileId, status: 'APPROVED' },
    include: { circle: { select: { id: true, slug: true, name: true } } }
  })
  res.json({ circles: memberships.map((m: any) => m.circle) })
})

// ─── Admin — 10.11: the ONLY place a Circle is ever created. ──────────────
const createSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  city:        z.string().max(100).optional(),
  country:     z.string().max(100).optional(),
  visibility:  z.enum(['DISCOVERABLE', 'PRIVATE', 'INVITE_ONLY']).default('DISCOVERABLE'),
  status:      z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).default('DRAFT'),
  slug:        z.string().optional(),
})

router.get('/admin/all', requireAuth, requireAdmin('circle.manage'), async (req: AuthRequest, res: Response) => {
  const circles = await (prisma as any).circle.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ circles })
})

router.post('/admin', requireAuth, requireAdmin('circle.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body)
    const existingSlugs = new Set(((await (prisma as any).circle.findMany({ select: { slug: true } })) as any[]).map(c => c.slug))
    const slug = data.slug ? data.slug : uniqueSlug(data.name, existingSlugs)

    const circle = await (prisma as any).circle.create({ data: { ...data, slug, createdByAdminId: req.userId } })
    await logAdminAction(req.userId!, 'CREATE_CIRCLE', 'circle', circle.id, { newData: { name: data.name, slug }, ipAddress: req.ip })
    res.status(201).json(circle)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(400).json({ error: 'Slug já em uso.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/admin/:id', requireAuth, requireAdmin('circle.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.partial().parse(req.body)
    const circle = await (prisma as any).circle.update({ where: { id: req.params.id }, data })
    await logAdminAction(req.userId!, 'UPDATE_CIRCLE', 'circle', circle.id, { newData: data, ipAddress: req.ip })
    res.json(circle)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.post('/admin/:id/members', requireAuth, requireAdmin('circle.manage'), async (req: AuthRequest, res: Response) => {
  const { profileId } = z.object({ profileId: z.string().uuid() }).parse(req.body)
  const result = await addMemberDirectly(req.params.id, profileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  await logAdminAction(req.userId!, 'ADD_CIRCLE_MEMBER', 'circle', req.params.id, { newData: { profileId }, ipAddress: req.ip })
  res.status(201).json(result.membership)
})

router.post('/admin/:id/members/:membershipId/role', requireAuth, requireAdmin('circle.manage'), async (req: AuthRequest, res: Response) => {
  const { role } = z.object({ role: z.enum(['MEMBER', 'LOCAL_MODERATOR']) }).parse(req.body)
  const result = await setMemberRole(req.params.id, req.params.membershipId, role)
  if (!result.ok) return res.status(400).json({ error: result.error })
  await logAdminAction(req.userId!, 'SET_CIRCLE_MEMBER_ROLE', 'circle', req.params.id, { newData: { membershipId: req.params.membershipId, role }, ipAddress: req.ip })
  res.json(result.membership)
})

router.delete('/admin/:id', requireAuth, requireAdmin('circle.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const circle = await (prisma as any).circle.findUnique({ where: { id: req.params.id } })
    await (prisma as any).circle.delete({ where: { id: req.params.id } })
    await logAdminAction(req.userId!, 'DELETE_CIRCLE', 'circle', req.params.id, { previousData: circle ? { name: circle.name } : undefined, ipAddress: req.ip })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
