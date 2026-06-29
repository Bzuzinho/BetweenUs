import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/beta/validate/:code — validate invite code (public)
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
    if (invite.email) {
      return res.json({ valid: true, email: invite.email, code: invite.code })
    }

    res.json({ valid: true, code: invite.code })
  } catch (err: any) {
    res.status(500).json({ valid: false, error: 'Erro interno.' })
  }
})

// POST /api/beta/use/:code — use an invite code during registration
router.post('/use/:code', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const invite = await prisma.betaInvite.findUnique({
      where: { code: req.params.code.toUpperCase() }
    })

    if (!invite || !invite.active) {
      return res.status(404).json({ error: 'Convite inválido.' })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Convite expirado.' })
    }
    if (invite.useCount >= invite.maxUses) {
      return res.status(400).json({ error: 'Convite esgotado.' })
    }

    // Mark invite as used
    await prisma.betaInvite.update({
      where: { id: invite.id },
      data: {
        useCount: { increment: 1 },
        usedById: invite.maxUses === 1 ? req.userId : undefined,
        usedAt: invite.maxUses === 1 ? new Date() : undefined
      }
    })

    res.json({ ok: true, message: 'Convite beta aceite. Bem-vindo/a!' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
