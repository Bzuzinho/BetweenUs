import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

// GET /api/beta/validate/:code — public, used by frontend before registration
router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const invite = await prisma.betaInvite.findUnique({
      where: { code: req.params.code.toUpperCase() }
    })

    if (!invite || !invite.active) {
      return res.status(404).json({ valid: false, error: 'Convite inválido ou expirado.' })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ valid: false, error: 'Convite expirado.' })
    }
    if (invite.useCount >= invite.maxUses) {
      return res.status(400).json({ valid: false, error: 'Convite já atingiu o limite de usos.' })
    }

    res.json({ valid: true, code: invite.code, email: invite.email || undefined })
  } catch (err: any) {
    res.status(500).json({ valid: false, error: 'Erro interno.' })
  }
})

// Point 5: POST /api/beta/use/:code is DEPRECATED.
// The actual consumption of an invite now happens exclusively inside
// POST /api/auth/register, to avoid creating an account before the
// invite is validated/consumed. This endpoint is kept only to avoid
// breaking old clients, but always returns 410 Gone.
router.post('/use/:code', async (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'Este endpoint foi descontinuado. O convite é validado automaticamente no registo.',
    code: 'DEPRECATED'
  })
})

export default router
