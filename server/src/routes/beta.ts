import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { sendBetaApplicationNotification } from '../lib/betaApplicationEmail'
import { notifyAdmins } from '../lib/notify'

const router = Router()
const BETA_APPLICATIONS_ENABLED = process.env.BETA_APPLICATIONS_ENABLED !== 'false'

const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tenta novamente mais tarde.' }
})

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase()
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254

router.post('/applications', applicationLimiter, async (req: Request, res: Response) => {
  if (!BETA_APPLICATIONS_ENABLED) {
    return res.status(410).json({ error: 'Os pedidos de acesso beta estão encerrados.' })
  }

  const email = normalizeEmail(req.body?.email)
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Introduz um endereço de email válido.' })
  }

  try {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "beta_applications" WHERE LOWER("email") = ${email} LIMIT 1
    `

    if (existing.length === 0) {
      const id = uuidv4()
      const createdAt = new Date()
      try {
        await prisma.$executeRaw`
          INSERT INTO "beta_applications" ("id", "email", "status", "source", "createdAt", "updatedAt")
          VALUES (${id}, ${email}, 'PENDING', 'LANDING_PAGE', ${createdAt}, ${createdAt})
        `

        // A beta application is administrative work, not just an email.
        // Persist the event for the admin bell and let the central notifier
        // deliver web push only to admins who have push enabled.
        await notifyAdmins(
          'new_beta_application',
          'Novo pedido de acesso beta',
          `${email} pediu acesso através do website.`,
          { betaApplicationId: id, email, tab: 'affiliations', subtab: 'beta-access' }
        )

        sendBetaApplicationNotification(email, createdAt).catch(err => {
          console.error('[BETA APPLICATION EMAIL]', err.message)
        })
      } catch (err: any) {
        if (err?.code !== 'P2002' && err?.meta?.code !== '23505' && err?.code !== '23505') throw err
      }
    }

    return res.status(202).json({ ok: true, message: 'Thank you. Your beta request has been received.' })
  } catch (err: any) {
    console.error('[BETA APPLICATION]', err.message)
    return res.status(500).json({ error: 'Não foi possível registar o pedido. Tenta novamente.' })
  }
})

router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const invite = await prisma.betaInvite.findUnique({ where: { code: req.params.code.toUpperCase() } })
    if (!invite || !invite.active) return res.status(404).json({ valid: false, error: 'Convite inválido ou expirado.' })
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ valid: false, error: 'Convite expirado.' })
    if (invite.useCount >= invite.maxUses) return res.status(400).json({ valid: false, error: 'Convite já atingiu o limite de usos.' })
    res.json({ valid: true, code: invite.code, email: invite.email || undefined })
  } catch {
    res.status(500).json({ valid: false, error: 'Erro interno.' })
  }
})

router.post('/use/:code', async (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Este endpoint foi descontinuado. O convite é validado automaticamente no registo.', code: 'DEPRECATED' })
})

export default router
