import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Gerar código de convite curto (ex: BTUS-A3F7)
const generateCode = (): string => {
  const hash = createHash('sha256').update(uuidv4()).digest('hex')
  return `BTUS-${hash.slice(0, 4).toUpperCase()}${hash.slice(4, 8).toUpperCase()}`
}

// Middleware: apenas admins
const requireAdmin = async (req: AuthRequest, res: Response, next: Function) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user || !adminEmails.includes(user.email)) {
    return res.status(403).json({ error: 'Sem permissão de admin.' })
  }
  next()
}

// ─── PÚBLICO ─────────────────────────────────────────────────────────────────

// GET /api/beta/check/:code — verificar se um código é válido (antes do registo)
router.get('/check/:code', async (req: Request, res: Response) => {
  const betaEnabled = process.env.BETA_CLOSED === 'true'
  if (!betaEnabled) {
    return res.json({ valid: true, betaOpen: true })
  }

  try {
    const invite = await prisma.betaInvite.findUnique({
      where: { code: req.params.code.toUpperCase() }
    })

    if (!invite || !invite.active) {
      return res.status(404).json({ valid: false, error: 'Código inválido ou expirado.' })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ valid: false, error: 'Código expirado.' })
    }
    if (invite.useCount >= invite.maxUses) {
      return res.status(409).json({ valid: false, error: 'Código já foi utilizado.' })
    }
    if (invite.email && invite.email !== req.query.email) {
      return res.status(403).json({
        valid: false, error: 'Este código está reservado para outro email.'
      })
    }

    res.json({
      valid: true,
      betaOpen: false,
      note: invite.email ? `Reservado para ${invite.email}` : null
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao verificar código.' })
  }
})

// POST /api/beta/redeem — usar código durante o registo
// Called internally by auth/register when BETA_CLOSED=true
router.post('/redeem', async (req: Request, res: Response) => {
  const { code, email } = req.body

  if (!code || !email) {
    return res.status(400).json({ error: 'Código e email são obrigatórios.' })
  }

  try {
    const invite = await prisma.betaInvite.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!invite || !invite.active) {
      return res.status(404).json({ valid: false, error: 'Código inválido.' })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ valid: false, error: 'Código expirado.' })
    }
    if (invite.useCount >= invite.maxUses) {
      return res.status(409).json({ valid: false, error: 'Código já esgotado.' })
    }
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        valid: false, error: 'Este código está reservado para outro email.'
      })
    }
    if (invite.usedByEmail?.toLowerCase() === email.toLowerCase()) {
      return res.status(409).json({ valid: false, error: 'Já usaste este código.' })
    }

    // Marcar como usado
    await prisma.betaInvite.update({
      where: { code: code.toUpperCase() },
      data: {
        useCount: { increment: 1 },
        usedByEmail: invite.useCount === 0 ? email : invite.usedByEmail,
        usedAt: invite.useCount === 0 ? new Date() : invite.usedAt,
        active: invite.useCount + 1 >= invite.maxUses ? false : true
      }
    })

    res.json({ valid: true, message: 'Código aceite. Bem-vindo ao Between Us Beta!' })
  } catch (err: any) {
    console.error('[BETA REDEEM]', err.message)
    res.status(500).json({ error: 'Erro ao usar código.' })
  }
})

// ─── ADMIN ───────────────────────────────────────────────────────────────────

// GET /api/beta/invites — listar todos os convites (admin)
router.get('/invites', requireAuth, requireAdmin as any,
  async (_req: AuthRequest, res: Response) => {
  try {
    const invites = await prisma.betaInvite.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json({ invites })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/beta/invites — criar convite(s) (admin)
router.post('/invites', requireAuth, requireAdmin as any,
  async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,           // opcional: reservar para um email específico
      count = 1,       // quantos códigos gerar (max 50)
      maxUses = 1,     // quantas vezes cada código pode ser usado
      expiresInDays,   // dias até expirar (opcional)
      note             // nota interna
    } = req.body

    const qty = Math.min(Math.max(1, Number(count)), 50)
    const expiresAt = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : null

    const created = []
    for (let i = 0; i < qty; i++) {
      const invite = await prisma.betaInvite.create({
        data: {
          code: generateCode(),
          email: email || null,
          maxUses: Number(maxUses),
          expiresAt,
          note: note || null,
          createdBy: req.userId!,
          active: true
        }
      })
      created.push(invite)
    }

    res.status(201).json({
      created,
      count: created.length,
      codes: created.map(i => i.code)
    })
  } catch (err: any) {
    console.error('[BETA CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar convites.' })
  }
})

// PUT /api/beta/invites/:id — desativar/reativar convite (admin)
router.put('/invites/:id', requireAuth, requireAdmin as any,
  async (req: AuthRequest, res: Response) => {
  try {
    const { active, expiresInDays, note } = req.body
    const updated = await prisma.betaInvite.update({
      where: { id: req.params.id },
      data: {
        ...(active !== undefined && { active }),
        ...(expiresInDays !== undefined && {
          expiresAt: expiresInDays
            ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
            : null
        }),
        ...(note !== undefined && { note })
      }
    })
    res.json({ invite: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/beta/invites/:id — apagar convite (admin)
router.delete('/invites/:id', requireAuth, requireAdmin as any,
  async (_req: AuthRequest, res: Response) => {
  try {
    await prisma.betaInvite.delete({ where: { id: _req.params.id } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/beta/stats — estatísticas do beta (admin)
router.get('/stats', requireAuth, requireAdmin as any,
  async (_req: AuthRequest, res: Response) => {
  try {
    const [total, used, active, totalUsers] = await Promise.all([
      prisma.betaInvite.count(),
      prisma.betaInvite.count({ where: { useCount: { gt: 0 } } }),
      prisma.betaInvite.count({ where: { active: true } }),
      prisma.user.count({ where: { status: { not: 'DELETED' } } })
    ])

    res.json({
      invites: { total, used, active, unused: total - used },
      users: { total: totalUsers }
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
