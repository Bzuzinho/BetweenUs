import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { z } from 'zod'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { generateTokens, verifyRefreshToken, verifyAccessToken } from '../utils/jwt'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' }
})

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
  dateOfBirth: z.string().refine(val => {
    const age = (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    return age >= 18
  }, 'Tens de ter pelo menos 18 anos'),
  termsAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar os termos'),
  betaCode: z.string().optional()
})

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const getRedis = async () => {
  try {
    const redis = (await import('../lib/redis')).default
    if (!redis.isOpen) await redis.connect()
    return redis
  } catch { return null }
}

const isProd = process.env.NODE_ENV === 'production'
const BETA_CLOSED = process.env.BETA_CLOSED === 'true'

// Point 4: validate beta invite inside register — single source of truth
const validateBetaCode = async (code: string | undefined, email: string) => {
  if (!BETA_CLOSED) return { ok: true, invite: null }

  if (!code) {
    return { ok: false, error: 'O Between Us está em beta fechado. Precisas de um convite.', errCode: 'BETA_REQUIRED' }
  }

  const invite = await prisma.betaInvite.findUnique({ where: { code: code.toUpperCase() } })

  if (!invite || !invite.active) {
    return { ok: false, error: 'Convite inválido ou expirado.', errCode: 'BETA_INVALID' }
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: 'Este convite expirou.', errCode: 'BETA_EXPIRED' }
  }
  if (invite.useCount >= invite.maxUses) {
    return { ok: false, error: 'Este convite já atingiu o limite de utilizações.', errCode: 'BETA_EXHAUSTED' }
  }
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: 'Este convite está reservado para outro email.', errCode: 'BETA_EMAIL_MISMATCH' }
  }

  return { ok: true, invite }
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return res.status(409).json({ error: 'Este email já está registado.' })

    // Point 4: beta validated here, single source of truth
    const betaCheck = await validateBetaCode(data.betaCode, data.email)
    if (!betaCheck.ok) {
      return res.status(403).json({ error: betaCheck.error, code: betaCheck.errCode })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: {
        email: data.email, passwordHash,
        dateOfBirth: new Date(data.dateOfBirth),
        emailVerifiedAt: new Date(), // dev: auto-verify; replace once SMTP active
        status: 'ACTIVE',
        termsAcceptedAt: new Date(), privacyAcceptedAt: new Date(),
        consents: { create: [
          { consentType: 'TERMS', version: '1.0' },
          { consentType: 'PRIVACY_POLICY', version: '1.0' },
          { consentType: 'SENSITIVE_DATA', version: '1.0' }
        ]},
        subscription: { create: { plan: 'FREE', status: 'ACTIVE' } }
      }
    })

    // Point 4: consume invite atomically after account creation succeeds
    if (betaCheck.invite) {
      const inv = betaCheck.invite
      const newUseCount = inv.useCount + 1
      await prisma.betaInvite.update({
        where: { id: inv.id },
        data: {
          useCount: { increment: 1 },
          usedById: inv.maxUses === 1 ? user.id : undefined,
          usedAt: inv.maxUses === 1 ? new Date() : undefined,
          active: newUseCount >= inv.maxUses ? false : inv.active
        }
      })
    }

    const { accessToken, refreshToken } = generateTokens(user.id)

    const redis = await getRedis()
    if (redis) await redis.setEx(`refresh:${user.id}`, 30 * 24 * 60 * 60, hashToken(refreshToken))

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, status: user.status }
    })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[REGISTER]', err.message)
    res.status(500).json({ error: 'Erro interno. Tenta novamente.' })
  }
})

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(), password: z.string().min(1)
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Email ou password incorretos.' })
    if (user.status === 'BANNED') return res.status(403).json({ error: 'Esta conta foi suspensa.' })
    if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Conta temporariamente suspensa.' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Email ou password incorretos.' })

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })

    const { accessToken, refreshToken } = generateTokens(user.id)

    const redis = await getRedis()
    if (redis) await redis.setEx(`refresh:${user.id}`, 30 * 24 * 60 * 60, hashToken(refreshToken))

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, status: user.status, adminRole: user.adminRole }
    })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[LOGIN]', err.message)
    res.status(500).json({ error: 'Erro interno. Tenta novamente.' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { userId } = verifyAccessToken(authHeader.split(' ')[1])
      const redis = await getRedis()
      if (redis) await redis.del(`refresh:${userId}`)
    } catch {}
  }
  res.json({ message: 'Sessão terminada.' })
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ error: 'Token em falta.' })
  try {
    const { userId } = verifyRefreshToken(refreshToken)
    const redis = await getRedis()
    if (redis) {
      const storedHash = await redis.get(`refresh:${userId}`)
      if (!storedHash || storedHash !== hashToken(refreshToken)) {
        return res.status(401).json({ error: 'Token inválido ou revogado.' })
      }
    }
    const tokens = generateTokens(userId)
    if (redis) await redis.setEx(`refresh:${userId}`, 30 * 24 * 60 * 60, hashToken(tokens.refreshToken))
    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Token expirado ou inválido.' })
  }
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(authHeader.split(' ')[1])
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, status: true, adminRole: true,
        emailVerifiedAt: true, createdAt: true,
        profile: { select: { id: true, displayName: true, type: true, status: true, city: true } },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } }
      }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

router.post('/password/forgot', authLimiter, async (_req: Request, res: Response) => {
  res.json({ message: 'Se este email existe, receberás instruções em breve.' })
})

router.delete('/sessions', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(authHeader.split(' ')[1])
    const redis = await getRedis()
    if (redis) await redis.del(`refresh:${userId}`)
    res.json({ message: 'Todas as sessões foram terminadas.' })
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

export default router
