import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { VAPID_PUBLIC_KEY } from '../lib/webpush'

const router = Router()
const SUPPORTED_LANGUAGES = new Set(['pt-PT', 'en', 'fr'])

// GET /api/push/vapid-key — public VAPID key for frontend
router.get('/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

// Language preference lives at account level. It is grouped in this already
// mounted authenticated router to keep the change isolated from auth flows.
router.get('/language', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ preferredLanguage: string }>>`
      SELECT "preferredLanguage" FROM "User" WHERE id = ${req.userId!} LIMIT 1
    `
    res.json({ preferredLanguage: rows[0]?.preferredLanguage || 'pt-PT' })
  } catch (err: any) {
    console.error('[LANGUAGE GET]', err.message)
    res.status(500).json({ error: 'Erro ao carregar o idioma.' })
  }
})

router.put('/language', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const preferredLanguage = String(req.body?.preferredLanguage || '')
    if (!SUPPORTED_LANGUAGES.has(preferredLanguage)) {
      return res.status(400).json({ error: 'Idioma não suportado.' })
    }
    await prisma.$executeRaw`
      UPDATE "User"
      SET "preferredLanguage" = ${preferredLanguage}, "updatedAt" = NOW()
      WHERE id = ${req.userId!}
    `
    res.json({ ok: true, preferredLanguage })
  } catch (err: any) {
    console.error('[LANGUAGE PUT]', err.message)
    res.status(500).json({ error: 'Erro ao guardar o idioma.' })
  }
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
