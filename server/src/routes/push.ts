import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { VAPID_PUBLIC_KEY } from '../lib/webpush'

const router = Router()

// GET /api/push/vapid-key — public VAPID key for frontend
router.get('/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

// POST /api/push/subscribe — save push subscription
router.post('/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Subscription inválida.' })
    }
    const userAgent = req.headers['user-agent'] || ''
    await (prisma as any).pushSubscription.upsert({
      where: { endpoint },
      update: { userId: req.userId!, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      create: { userId: req.userId!, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent }
    })
    console.log('[PUSH] Subscription saved for user:', req.userId)
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[PUSH SUBSCRIBE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body
    if (endpoint) {
      await (prisma as any).pushSubscription.deleteMany({ where: { endpoint, userId: req.userId! } })
    }
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router
