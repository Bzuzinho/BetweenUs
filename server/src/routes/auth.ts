import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { generateTokens, verifyRefreshToken, verifyAccessToken } from '../utils/jwt'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' }
})

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
  dateOfBirth: z.string().refine(val => {
    const age = (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    return age >= 18
  }, 'Tens de ter pelo menos 18 anos'),
  termsAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar os termos')
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body)

    // Beta gate: se BETA_CLOSED=true, exigir código de convite
    if (process.env.BETA_CLOSED === 'true') {
      const betaCode = req.body.betaCode
      if (!betaCode) {
        return res.status(403).json({
          error: 'O Between Us está em beta fechado. Precisas de um código de convite.',
          code: 'BETA_REQUIRED'
        })
      }
      // Validate invite code
      const invite = await prisma.betaInvite.findUnique({
        where: { code: betaCode.toUpperCase() }
      })
      if (!invite || !invite.active) {
        return res.status(403).json({
          error: 'Código de convite inválido ou expirado.',
          code: 'BETA_INVALID'
        })
      }
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(403).json({ error: 'Código de convite expirado.', code: 'BETA_EXPIRED' })
      }
      if (invite.useCount >= invite.maxUses) {
        return res.status(403).json({ error: 'Código de convite já esgotado.', code: 'BETA_USED' })
      }
      if (invite.email && invite.email.toLowerCase() !== data.email.toLowerCase()) {
        return res.status(403).json({
          error: 'Este código está reservado para outro email.',
          code: 'BETA_EMAIL_MISMATCH'
        })
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return res.status(409).json({ error: 'Este email já está registado.' })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        dateOfBirth: new Date(data.dateOfBirth),
        // Email auto-verified — no email verification in dev mode
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        consents: {
          create: [
            { consentType: 'TERMS', version: '1.0', acceptedAt: new Date() },
            { consentType: 'PRIVACY_POLICY', version: '1.0', acceptedAt: new Date() },
            { consentType: 'SENSITIVE_DATA', version: '1.0', acceptedAt: new Date() }
          ]
        },
        subscription: {
          create: { plan: 'FREE', status: 'ACTIVE' }
        }
      }
    })

    // Consumir código beta após criar utilizador
    if (process.env.BETA_CLOSED === 'true' && req.body.betaCode) {
      try {
        const invite = await prisma.betaInvite.findUnique({
          where: { code: req.body.betaCode.toUpperCase() }
        })
        if (invite) {
          const newCount = invite.useCount + 1
          await prisma.betaInvite.update({
            where: { code: req.body.betaCode.toUpperCase() },
            data: {
              useCount: { increment: 1 },
              usedByEmail: data.email,
              usedAt: new Date(),
              active: newCount >= invite.maxUses ? false : true
            }
          })
        }
      } catch (e) {
        console.warn('[BETA] Could not redeem invite code:', (e as Error).message)
      }
    }

    // Auto-login after register
    const { accessToken, refreshToken } = generateTokens(user.id)

    // Store refresh token in Redis (non-blocking)
    try {
      const redis = (await import('../lib/redis')).default
      if (!redis.isOpen) await redis.connect()
      await redis.setEx(`refresh:${user.id}`, 30 * 24 * 60 * 60, refreshToken)
    } catch (e) {
      console.warn('[REDIS] Could not store refresh token:', (e as Error).message)
    }

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, status: user.status }
    })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message })
    }
    console.error('[REGISTER ERROR]', err.message, err.stack)
    res.status(500).json({ error: 'Erro interno. Tenta novamente.' })
  }
})

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Email ou password incorretos.' })
    if (user.status === 'BANNED') return res.status(403).json({ error: 'Esta conta foi suspensa.' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Email ou password incorretos.' })

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })

    const { accessToken, refreshToken } = generateTokens(user.id)

    try {
      const redis = (await import('../lib/redis')).default
      if (!redis.isOpen) await redis.connect()
      await redis.setEx(`refresh:${user.id}`, 30 * 24 * 60 * 60, refreshToken)
    } catch (e) {
      console.warn('[REDIS]', (e as Error).message)
    }

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, status: user.status }
    })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[LOGIN ERROR]', err.message)
    res.status(500).json({ error: 'Erro interno. Tenta novamente.' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { userId } = verifyAccessToken(authHeader.split(' ')[1])
      const redis = (await import('../lib/redis')).default
      if (!redis.isOpen) await redis.connect()
      await redis.del(`refresh:${userId}`)
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
    const tokens = generateTokens(userId)
    try {
      const redis = (await import('../lib/redis')).default
      if (!redis.isOpen) await redis.connect()
      await redis.setEx(`refresh:${userId}`, 30 * 24 * 60 * 60, tokens.refreshToken)
    } catch {}
    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Token expirado.' })
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
        id: true, email: true, status: true,
        emailVerifiedAt: true, createdAt: true,
        profile: { select: { id: true, displayName: true, type: true } },
        subscription: { select: { plan: true, status: true } }
      }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

// POST /api/auth/password/forgot — placeholder
router.post('/password/forgot', authLimiter, async (_req: Request, res: Response) => {
  res.json({ message: 'Se este email existe, receberás instruções em breve.' })
})

export default router
