import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const toStatus = (c: any) => {
  if (c.alertSent) return 'ALERT_SENT'
  if (c.cancelledAt) return 'CANCELLED'
  if (c.confirmedAt) return 'CONFIRMED'
  return 'SCHEDULED'
}
const maskEmail = (email?: string | null) =>
  email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : null

// POST /api/safety/checkin — create safety checkin
router.post('/checkin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, scheduledAt, locationHint, safetyEmail } = req.body
    if (!scheduledAt) return res.status(400).json({ error: 'Hora do encontro obrigatória.' })

    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const checkin = await (prisma as any).safetyCheckin.create({
      data: {
        profileId: profile.id,
        matchId: matchId || null,
        scheduledAt: new Date(scheduledAt),
        locationHint: locationHint || null,
        safetyEmail: safetyEmail || null,
      }
    })

    res.status(201).json({
      ok: true,
      checkin: { ...checkin, status: toStatus(checkin), safetyEmail: maskEmail(checkin.safetyEmail) },
      message: safetyEmail
        ? 'Check-in registado. O teu contacto recebe um alerta se não confirmares a tempo.'
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
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile || existing.profileId !== profile.id) return res.status(403).json({ error: 'Sem permissão.' })

    const checkin = await (prisma as any).safetyCheckin.update({
      where: { id: req.params.id }, data: { confirmedAt: new Date() }
    })
    res.json({ ok: true, checkin: { ...checkin, status: toStatus(checkin) }, message: 'Check-in confirmado. Fica bem! 💚' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/safety/checkin/:id/cancel
router.put('/checkin/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await (prisma as any).safetyCheckin.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Check-in não encontrado.' })
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile || existing.profileId !== profile.id) return res.status(403).json({ error: 'Sem permissão.' })

    const checkin = await (prisma as any).safetyCheckin.update({
      where: { id: req.params.id }, data: { cancelledAt: new Date() }
    })
    res.json({ ok: true, checkin: { ...checkin, status: toStatus(checkin) }, message: 'Check-in cancelado.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/safety/checkins/me
router.get('/checkins/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const checkins = await (prisma as any).safetyCheckin.findMany({
      where: { profileId: profile.id },
      orderBy: { scheduledAt: 'desc' },
      take: 10
    })
    res.json({ checkins: checkins.map((c: any) => ({ ...c, status: toStatus(c), safetyEmail: maskEmail(c.safetyEmail) })) })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
