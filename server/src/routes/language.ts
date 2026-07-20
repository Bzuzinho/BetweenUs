import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const languageSchema = z.object({
  preferredLanguage: z.enum(['pt-PT', 'en', 'fr']),
})

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ preferredLanguage: string }>>`
      SELECT "preferredLanguage" FROM "User" WHERE id = ${req.userId!} LIMIT 1
    `
    res.json({ preferredLanguage: rows[0]?.preferredLanguage || 'pt-PT' })
  } catch (error) {
    console.error('[LANGUAGE GET]', error)
    res.status(500).json({ error: 'Unable to load language preference.' })
  }
})

router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { preferredLanguage } = languageSchema.parse(req.body)
    await prisma.$executeRaw`
      UPDATE "User"
      SET "preferredLanguage" = ${preferredLanguage}, "updatedAt" = NOW()
      WHERE id = ${req.userId!}
    `
    res.json({ ok: true, preferredLanguage })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Unsupported language.' })
    }
    console.error('[LANGUAGE PUT]', error)
    res.status(500).json({ error: 'Unable to save language preference.' })
  }
})

export default router
