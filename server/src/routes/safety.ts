import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import { scheduleCheckin, confirmSafe, cancelCheckin } from '../lib/safetyCheckinService'

const router = Router()

const maskEmail = (email?: string | null) =>
  email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : null

const serialize = (c: any) => ({ ...c, safetyEmail: maskEmail(c.safetyEmail) })

// POST /api/safety/checkin — create safety checkin
router.post('/checkin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, scheduledAt, locationHint, safetyEmail } = req.body
    if (!scheduledAt) return res.status(400).json({ error: 'Hora do encontro obrigatória.' })

    // 9.5 — was Profile.userId-only, same bug class fixed across every
    // prior sprint (silently excluded a couple/group's non-creator member).
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const checkin = await scheduleCheckin(profileId, {
      matchId: matchId || null, scheduledAt: new Date(scheduledAt), locationHint, safetyEmail
    })

    res.status(201).json({
      ok: true,
      checkin: serialize(checkin),
      message: safetyEmail
        ? 'Check-in registado. O teu contacto recebe uma notificação se não confirmares a tempo. O Between Us não contacta as autoridades.'
        : 'Check-in registado.'
    })
  } catch (err: any) {
    console.error('[SAFETY CHECKIN]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/safety/checkin/:id/confirm — confirm you're safe
router.put('/checkin/:id/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await (prisma as any).safetyCheckin.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Check-in não encontrado.' })
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId || existing.profileId !== profileId) return res.status(403).json({ error: 'Sem permissão.' })

    const result = await confirmSafe(req.params.id)
    if (!result.ok) return res.status(400).json({ error: result.error })
    res.json({ ok: true, checkin: serialize(result.checkin), message: 'Check-in confirmado. Fica bem! 💚' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/safety/checkin/:id/cancel
router.put('/checkin/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await (prisma as any).safetyCheckin.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Check-in não encontrado.' })
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId || existing.profileId !== profileId) return res.status(403).json({ error: 'Sem permissão.' })

    const result = await cancelCheckin(req.params.id)
    if (!result.ok) return res.status(400).json({ error: result.error })
    res.json({ ok: true, checkin: serialize(result.checkin), message: 'Check-in cancelado.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/safety/checkins/me
router.get('/checkins/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const checkins = await (prisma as any).safetyCheckin.findMany({
      where: { profileId },
      orderBy: { scheduledAt: 'desc' },
      take: 10
    })
    res.json({ checkins: checkins.map(serialize) })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
