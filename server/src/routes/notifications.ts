import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/notifications — list mine, newest first
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await (prisma as any).notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    const unreadCount = notifications.filter((n: any) => !n.readAt).length
    res.json({ notifications, unreadCount })
  } catch (err: any) {
    console.error('[NOTIFICATIONS LIST]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma as any).notification.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { readAt: new Date() }
    })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma as any).notification.updateMany({
      where: { userId: req.userId!, readAt: null },
      data: { readAt: new Date() }
    })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
