import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/catalog/intentions
router.get('/intentions', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const intentions = await prisma.intention.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    })
    res.json({ intentions })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/catalog/boundaries — grouped by category
router.get('/boundaries', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const boundaries = await (prisma as any).boundary.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    })
    res.json({ boundaries })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
