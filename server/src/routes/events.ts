import { Router, Response, Request } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import { serializeEventForViewer } from '../lib/eventVenuePolicy'
import {
  isPrivateEventsEnabled, checkOrganizerEligibility, runEventTransition,
  requestAttendance, approveAttendance, declineAttendance, cancelAttendance
} from '../lib/eventService'

const router = Router()

const featureGate = (req: AuthRequest, res: Response, next: () => void) => {
  if (!isPrivateEventsEnabled()) return res.status(403).json({ error: 'Eventos privados estão temporariamente desativados.' })
  next()
}

// Looks up the caller's own attendance status for one event — the ONLY
// viewer-specific input eventVenuePolicy needs (see that file's header).
const myAttendanceStatus = async (eventId: string, profileId: string | null): Promise<string | null> => {
  if (!profileId) return null
  const a = await (prisma as any).eventAttendance.findUnique({ where: { eventId_profileId: { eventId, profileId } } })
  return a?.status || null
}

// GET /api/events — public list, PUBLISHED only. 10.13 UX: city/date
// cards — city/country filters are the discovery axis for now (no
// geolocation, matches the rest of the app's "approximate location" rule).
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city, country } = req.query
    const myProfileId = await resolveMyProfileId(req.userId!)

    const events = await (prisma as any).event.findMany({
      where: {
        status: 'PUBLISHED',
        ...(city ? { city: city as string } : {}),
        ...(country ? { country: country as string } : {}),
      },
      orderBy: { startsAt: 'asc' }
    })

    const serialized = await Promise.all(events.map(async (e: any) => {
      const status = await myAttendanceStatus(e.id, myProfileId)
      return serializeEventForViewer(e, {
        viewerAttendanceStatus: status,
        isOrganizer: e.organizerProfileId === myProfileId
      })
    }))

    res.json({ events: serialized })
  } catch {
    res.json({ events: [] })
  }
})

// GET /api/events/mine — organizer's own events, any status.
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.json({ events: [] })
  const events = await (prisma as any).event.findMany({
    where: { organizerProfileId: myProfileId },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ events })
})

// GET /api/events/:id — detail. Published for anyone; DRAFT/PENDING_REVIEW
// only visible to the organizer (or admin, via the /admin routes below).
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const event = await (prisma as any).event.findUnique({ where: { id: req.params.id } })
  if (!event) return res.status(404).json({ error: 'Evento não encontrado.' })

  const myProfileId = await resolveMyProfileId(req.userId!)
  const isOrganizer = event.organizerProfileId === myProfileId

  if (event.status !== 'PUBLISHED' && !isOrganizer) {
    return res.status(404).json({ error: 'Evento não encontrado.' })
  }

  const status = await myAttendanceStatus(event.id, myProfileId)
  res.json({ ...serializeEventForViewer(event, { viewerAttendanceStatus: status, isOrganizer }), myAttendanceStatus: status, isOrganizer })
})

const createSchema = z.object({
  title:                z.string().min(3).max(120),
  description:          z.string().min(10).max(5000),
  city:                 z.string().min(1).max(100),
  country:              z.string().min(1).max(100),
  venueDetail:          z.string().max(300).optional(),
  venueVisibility:      z.enum(['PUBLIC_CITY_ONLY', 'APPROVED_ATTENDEES', 'REVEAL_24H_BEFORE']).default('PUBLIC_CITY_ONLY'),
  startsAt:             z.string().datetime(),
  endsAt:               z.string().datetime().optional(),
  capacity:             z.number().int().positive().optional(),
  verificationRequired: z.boolean().default(true),
  approvalRequired:     z.boolean().default(true),
})

// POST /api/events — create as DRAFT. 10.8 — feature flag + organizer
// verification gate both enforced here, not just at submit time, so an
// ineligible user can't even start drafting a false sense of readiness.
router.post('/', requireAuth, featureGate, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body)
    const eligibility = await checkOrganizerEligibility(req.userId!)
    if (!eligibility.eligible) return res.status(403).json({ error: eligibility.reason })

    if (data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
      return res.status(400).json({ error: 'A data de fim deve ser depois da data de início.' })
    }

    const event = await (prisma as any).event.create({
      data: { ...data, startsAt: new Date(data.startsAt), endsAt: data.endsAt ? new Date(data.endsAt) : null, organizerProfileId: eligibility.profileId, status: 'DRAFT' }
    })
    res.status(201).json(event)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

const assertOwnEvent = async (eventId: string, userId: string) => {
  const myProfileId = await resolveMyProfileId(userId)
  const event = await (prisma as any).event.findUnique({ where: { id: eventId } })
  if (!event) return { ok: false as const, code: 404, error: 'Evento não encontrado.' }
  if (event.organizerProfileId !== myProfileId) return { ok: false as const, code: 403, error: 'Apenas o organizador pode fazer isto.' }
  return { ok: true as const, event, myProfileId }
}

// PUT /api/events/:id — organizer edits, only while DRAFT (a PUBLISHED
// event's terms shouldn't shift under attendees who already committed;
// REJECT already sends it back to DRAFT precisely so it becomes editable
// again).
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const guard = await assertOwnEvent(req.params.id, req.userId!)
  if (!guard.ok) return res.status(guard.code).json({ error: guard.error })
  if (guard.event.status !== 'DRAFT') return res.status(400).json({ error: 'Só é possível editar um evento em rascunho.' })

  try {
    const data = createSchema.partial().parse(req.body)
    const updated = await (prisma as any).event.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}), ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}) }
    })
    res.json(updated)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/events/:id/submit — DRAFT -> PENDING_REVIEW.
router.post('/:id/submit', requireAuth, featureGate, async (req: AuthRequest, res: Response) => {
  const guard = await assertOwnEvent(req.params.id, req.userId!)
  if (!guard.ok) return res.status(guard.code).json({ error: guard.error })

  const eligibility = await checkOrganizerEligibility(req.userId!)
  if (!eligibility.eligible) return res.status(403).json({ error: eligibility.reason })

  const result = await runEventTransition(req.params.id, 'SUBMIT')
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, status: result.status })
})

// POST /api/events/:id/cancel — organizer cancels their own event, any
// non-terminal state.
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const guard = await assertOwnEvent(req.params.id, req.userId!)
  if (!guard.ok) return res.status(guard.code).json({ error: guard.error })

  const result = await runEventTransition(req.params.id, 'CANCEL')
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, status: result.status })
})

// POST /api/events/:id/complete — organizer marks their own event done.
router.post('/:id/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  const guard = await assertOwnEvent(req.params.id, req.userId!)
  if (!guard.ok) return res.status(guard.code).json({ error: guard.error })

  const result = await runEventTransition(req.params.id, 'COMPLETE')
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, status: result.status })
})

// ─── Attendance ─────────────────────────────────────────────────────────────
// POST /api/events/:id/attend — request to attend (auto-approved if the
// event doesn't require approval — see eventService.requestAttendance).
router.post('/:id/attend', requireAuth, featureGate, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await requestAttendance(req.params.id, myProfileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.status(201).json(result.attendance)
})

// POST /api/events/:id/attend/cancel — attendee cancels their own request.
router.post('/:id/attend/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await cancelAttendance(req.params.id, myProfileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.attendance)
})

// GET /api/events/:id/attendees — organizer-only, sees pending + approved
// requests with profile summaries.
router.get('/:id/attendees', requireAuth, async (req: AuthRequest, res: Response) => {
  const guard = await assertOwnEvent(req.params.id, req.userId!)
  if (!guard.ok) return res.status(guard.code).json({ error: guard.error })

  const attendances = await (prisma as any).eventAttendance.findMany({
    where: { eventId: req.params.id },
    include: { profile: { select: { id: true, displayName: true, type: true } } },
    orderBy: { requestedAt: 'asc' }
  })
  res.json({ attendances })
})

// POST /api/events/:id/attendance/:attendanceId/approve
router.post('/:id/attendance/:attendanceId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await approveAttendance(req.params.id, req.params.attendanceId, myProfileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.attendance)
})

// POST /api/events/:id/attendance/:attendanceId/decline
router.post('/:id/attendance/:attendanceId/decline', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (!myProfileId) return res.status(400).json({ error: 'É necessário ter um perfil.' })

  const result = await declineAttendance(req.params.id, req.params.attendanceId, myProfileId)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.attendance)
})

// ─── Admin moderation (10.8 — mandatory approval this phase) ───────────────
router.get('/admin/queue', requireAuth, requireAdmin('events'), async (req: AuthRequest, res: Response) => {
  const events = await (prisma as any).event.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { organizerProfile: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'asc' }
  })
  res.json({ events })
})

router.get('/admin/all', requireAuth, requireAdmin('events'), async (req: AuthRequest, res: Response) => {
  const events = await (prisma as any).event.findMany({
    include: { organizerProfile: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ events })
})

router.post('/admin/:id/approve', requireAuth, requireAdmin('events'), async (req: AuthRequest, res: Response) => {
  const result = await runEventTransition(req.params.id, 'APPROVE')
  if (!result.ok) return res.status(400).json({ error: result.error })
  await logAdminAction(req.userId!, 'APPROVE_EVENT', 'event', req.params.id, { ipAddress: req.ip })
  res.json({ ok: true, status: result.status })
})

router.post('/admin/:id/reject', requireAuth, requireAdmin('events'), async (req: AuthRequest, res: Response) => {
  const result = await runEventTransition(req.params.id, 'REJECT')
  if (!result.ok) return res.status(400).json({ error: result.error })
  await logAdminAction(req.userId!, 'REJECT_EVENT', 'event', req.params.id, { reason: req.body?.reason, ipAddress: req.ip })
  res.json({ ok: true, status: result.status })
})

router.post('/admin/:id/suspend', requireAuth, requireAdmin('events'), async (req: AuthRequest, res: Response) => {
  const result = await runEventTransition(req.params.id, 'SUSPEND')
  if (!result.ok) return res.status(400).json({ error: result.error })
  await logAdminAction(req.userId!, 'SUSPEND_EVENT', 'event', req.params.id, { reason: req.body?.reason, ipAddress: req.ip })
  res.json({ ok: true, status: result.status })
})

router.post('/admin/:id/resume', requireAuth, requireAdmin('events'), async (req: AuthRequest, res: Response) => {
  const result = await runEventTransition(req.params.id, 'RESUME')
  if (!result.ok) return res.status(400).json({ error: result.error })
  await logAdminAction(req.userId!, 'RESUME_EVENT', 'event', req.params.id, { ipAddress: req.ip })
  res.json({ ok: true, status: result.status })
})

export default router
