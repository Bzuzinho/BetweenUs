import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { z } from 'zod'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { generateTokens, verifyRefreshToken, verifyAccessToken } from '../utils/jwt'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'
const BETA_CLOSED = process.env.BETA_CLOSED === 'true'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' }
})

// T4: granular consent fields — all required except optional ones
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
  dateOfBirth: z.string().refine(val => {
    const age = (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    return age >= 18
  }, 'Tens de ter pelo menos 18 anos'),
  // T4: required consents — all must be explicitly true
  ageConfirmed: z.boolean().refine(v => v === true, 'Tens de confirmar que tens 18 ou mais anos'),
  termsAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar os Termos de Utilização'),
  privacyAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar a Política de Privacidade'),
  sensitiveDataAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar o tratamento de dados sensíveis'),
  communityGuidelinesAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar as Directrizes da Comunidade'),
  // T4: optional consents
  locationConsent: z.boolean().optional().default(false),
  marketingConsent: z.boolean().optional().default(false),
  contactHashingConsent: z.boolean().optional().default(false),
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

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: ACCESS_COOKIE_MAX_AGE, path: '/'
  })
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: REFRESH_COOKIE_MAX_AGE, path: '/'
  })
}

const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
}

const validateBetaCode = async (code: string | undefined, email: string) => {
  if (!BETA_CLOSED) return { ok: true, invite: null }
  if (!code) return { ok: false, error: 'O Between Us está em beta fechado. Precisas de um convite.', errCode: 'BETA_REQUIRED' }
  const invite = await prisma.betaInvite.findUnique({ where: { code: code.toUpperCase() } })
  if (!invite || !invite.active) return { ok: false, error: 'Convite inválido ou expirado.', errCode: 'BETA_INVALID' }
  if (invite.expiresAt && invite.expiresAt < new Date()) return { ok: false, error: 'Este convite expirou.', errCode: 'BETA_EXPIRED' }
  if (invite.useCount >= invite.maxUses) return { ok: false, error: 'Este convite já atingiu o limite de utilizações.', errCode: 'BETA_EXHAUSTED' }
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

    const betaCheck = await validateBetaCode(data.betaCode, data.email)
    if (!betaCheck.ok) return res.status(403).json({ error: betaCheck.error, code: betaCheck.errCode })

    const passwordHash = await bcrypt.hash(data.password, 12)

    // T4: capture IP and userAgent for consent records
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    const consentVersion = '1.0'

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        dateOfBirth: new Date(data.dateOfBirth),
        // T5: emailVerifiedAt NOT set automatically in production
        // In dev, auto-verify to avoid needing SMTP. In prod, must be verified via email link.
        emailVerifiedAt: isProd ? null : new Date(),
        status: isProd ? 'PENDING_VERIFICATION' : 'ACTIVE',
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        // T4: granular consents with IP + userAgent
        consents: {
          create: [
            { consentType: 'TERMS', version: consentVersion, ipAddress, userAgent },
            { consentType: 'PRIVACY_POLICY', version: consentVersion, ipAddress, userAgent },
            { consentType: 'SENSITIVE_DATA', version: consentVersion, ipAddress, userAgent },
            ...(data.locationConsent
              ? [{ consentType: 'LOCATION' as any, version: consentVersion, ipAddress, userAgent }]
              : []),
            ...(data.marketingConsent
              ? [{ consentType: 'MARKETING' as any, version: consentVersion, ipAddress, userAgent }]
              : []),
            ...(data.contactHashingConsent
              ? [{ consentType: 'CONTACT_HASHING' as any, version: consentVersion, ipAddress, userAgent }]
              : []),
          ]
        },
        subscription: { create: { plan: 'FREE', status: 'ACTIVE' } }
      }
    })

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

    // T5: In production, send verification email (not implemented yet — see RC-1)
    // TODO: await sendVerificationEmail(user.email, user.id)

    const { accessToken, refreshToken } = generateTokens(user.id)
    const redis = await getRedis()
    if (redis) await redis.setEx(`refresh:${user.id}`, 30 * 24 * 60 * 60, hashToken(refreshToken))

    setAuthCookies(res, accessToken, refreshToken)
    res.status(201).json({
      message: isProd
        ? 'Conta criada! Verifica o teu email para activar a conta.'
        : 'Conta criada com sucesso!',
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, status: user.status },
      emailVerificationRequired: isProd
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
    if (user.status === 'BANNED') return res.status(403).json({ error: 'Esta conta foi suspensa.', code: 'ACCOUNT_BANNED' })
    if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Conta temporariamente suspensa.', code: 'ACCOUNT_SUSPENDED' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Email ou password incorretos.' })

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })

    const { accessToken, refreshToken } = generateTokens(user.id)
    const redis = await getRedis()
    if (redis) await redis.setEx(`refresh:${user.id}`, 30 * 24 * 60 * 60, hashToken(refreshToken))

    setAuthCookies(res, accessToken, refreshToken)
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
  const cookieToken = (req as any).cookies?.accessToken
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken
  if (token) {
    try {
      const { userId } = verifyAccessToken(token)
      const redis = await getRedis()
      if (redis) await redis.del(`refresh:${userId}`)
    } catch {}
  }
  clearAuthCookies(res)
  res.json({ message: 'Sessão terminada.' })
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.body?.refreshToken || (req as any).cookies?.refreshToken
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
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken)
    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Token expirado ou inválido.' })
  }
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  const cookieToken = (req as any).cookies?.accessToken
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
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

// T13: DELETE /api/auth/account — RGPD Art. 17 right to erasure
router.delete('/account', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  const cookieToken = (req as any).cookies?.accessToken
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password obrigatória para confirmar a eliminação.' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Password incorrecta.' })

    // Soft delete: mark as DELETED, anonymise PII
    // Hard delete scheduled by background job within 30 days
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        email: `deleted-${userId}@deleted.betweenus`,
        passwordHash: 'DELETED',
        dateOfBirth: new Date('1900-01-01'),
        emailVerifiedAt: null,
        lastSeenAt: null,
      }
    })

    // Revoke all sessions immediately
    const redis = await getRedis()
    if (redis) await redis.del(`refresh:${userId}`)
    clearAuthCookies(res)

    res.json({ ok: true, message: 'Conta eliminada. Os teus dados serão removidos nos próximos 30 dias.' })
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

// T13: GET /api/auth/export — RGPD Art. 20 data portability
router.get('/export', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  const cookieToken = (req as any).cookies?.accessToken
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, dateOfBirth: true, createdAt: true, status: true,
        profile: {
          select: {
            displayName: true, bio: true, gender: true, orientation: true,
            relationshipStatus: true, city: true, country: true, createdAt: true,
            intentions: { include: { intention: true } },
          }
        },
        consents: { select: { consentType: true, version: true, acceptedAt: true } },
        subscription: { select: { plan: true, status: true } },
        reportsReceived: { select: { reason: true, status: true, createdAt: true } }
      }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    res.setHeader('Content-Disposition', 'attachment; filename="betweenus-data-export.json"')
    res.setHeader('Content-Type', 'application/json')
    res.json({
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      data: user
    })
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

router.post('/password/forgot', authLimiter, async (_req: Request, res: Response) => {
  res.json({ message: 'Se este email existe, receberás instruções em breve.' })
})

router.delete('/sessions', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  const cookieToken = (req as any).cookies?.accessToken
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const redis = await getRedis()
    if (redis) await redis.del(`refresh:${userId}`)
    clearAuthCookies(res)
    res.json({ message: 'Todas as sessões foram terminadas.' })
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

export default router
