import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
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

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres'),
  dateOfBirth: z.string().refine(val => {
    const dob = new Date(val)
    if (isNaN(dob.getTime())) return false
    return (Date.now() - dob.getTime()) / (365.25*24*60*60*1000) >= 18
  }, 'Tens de ter pelo menos 18 anos para te registar'),
  termsAccepted: z.boolean().refine(v => v === true, 'Tens de aceitar os Termos de Utilização'),
  betaCode: z.string().optional(),
  ageConfirmed: z.boolean().optional(),
  privacyAccepted: z.boolean().optional(),
  sensitiveDataAccepted: z.boolean().optional(),
  communityGuidelinesAccepted: z.boolean().optional(),
  locationConsent: z.boolean().optional().default(false),
  marketingConsent: z.boolean().optional().default(false),
  contactHashingConsent: z.boolean().optional().default(false),
})

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')

const getRedis = async () => {
  try { const r = (await import('../lib/redis')).default; if (!r.isOpen) await r.connect(); return r }
  catch { return null }
}

const setAuthCookies = (res: Response, at: string, rt: string) => {
  const isPrd = process.env.NODE_ENV === 'production'
  res.cookie('accessToken',  at, { httpOnly:true, secure:isPrd, sameSite:'lax', maxAge:15*60*1000, path:'/' })
  res.cookie('refreshToken', rt, { httpOnly:true, secure:isPrd, sameSite:'lax', maxAge:30*24*60*60*1000, path:'/' })
}
const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', {path:'/'})
  res.clearCookie('refreshToken', {path:'/'})
}

const validateBetaCode = async (code: string|undefined, email: string) => {
  if (!BETA_CLOSED) return { ok:true, invite:null }
  if (!code) return { ok:false, error:'O Between Us está em beta fechado. Precisas de um código de convite.', errCode:'BETA_REQUIRED' }
  const invite = await prisma.betaInvite.findUnique({ where: { code: code.toUpperCase() } })
  if (!invite || !invite.active) return { ok:false, error:'Código de convite inválido.', errCode:'BETA_INVALID' }
  if (invite.expiresAt && invite.expiresAt < new Date()) return { ok:false, error:'Este código expirou.', errCode:'BETA_EXPIRED' }
  if (invite.useCount >= invite.maxUses) return { ok:false, error:'Código esgotado.', errCode:'BETA_EXHAUSTED' }
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) return { ok:false, error:'Código reservado para outro email.', errCode:'BETA_EMAIL_MISMATCH' }
  return { ok:true, invite }
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
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    const user = await prisma.user.create({
      data: {
        email: data.email, passwordHash,
        dateOfBirth: new Date(data.dateOfBirth),
        emailVerifiedAt: isProd ? null : new Date(),
        status: isProd ? 'PENDING_VERIFICATION' : 'ACTIVE',
        termsAcceptedAt: new Date(), privacyAcceptedAt: new Date(),
        consents: { create: [
          { consentType:'TERMS',          version:'1.0', ipAddress, userAgent },
          { consentType:'PRIVACY_POLICY', version:'1.0', ipAddress, userAgent },
          { consentType:'SENSITIVE_DATA', version:'1.0', ipAddress, userAgent },
          ...(data.locationConsent       ? [{ consentType:'LOCATION'        as any, version:'1.0', ipAddress, userAgent }] : []),
          ...(data.marketingConsent      ? [{ consentType:'MARKETING'       as any, version:'1.0', ipAddress, userAgent }] : []),
          ...(data.contactHashingConsent ? [{ consentType:'CONTACT_HASHING' as any, version:'1.0', ipAddress, userAgent }] : []),
        ]},
        subscription: { create: { plan:'FREE', status:'ACTIVE' } }
      }
    })
    if (betaCheck.invite) {
      const inv = betaCheck.invite
      const newUseCount = inv.useCount + 1
      await prisma.betaInvite.update({ where: { id: inv.id }, data: {
        useCount: { increment:1 },
        usedById: inv.maxUses===1 ? user.id : undefined,
        usedAt:   inv.maxUses===1 ? new Date() : undefined,
        active:   newUseCount >= inv.maxUses ? false : inv.active
      }})
    }
    // Send verification email async — never block the response
    if (isProd) {
      const verifyToken = randomBytes(32).toString('hex')
      const redis = await getRedis()
      if (redis) await redis.setEx(`email_verify:${user.id}`, 3600, hashToken(verifyToken))
      import('../lib/email').then(({ sendVerificationEmail }) => {
        sendVerificationEmail(user.email, user.id, verifyToken)
          .then(() => console.log('[EMAIL] Verification sent:', user.email))
          .catch(e => console.error('[EMAIL] Failed:', e.message))
      })
    } else {
      import('../lib/email').then(({ sendWelcomeEmail }) => sendWelcomeEmail(user.email).catch(()=>{}))
    }
    const { accessToken, refreshToken } = generateTokens(user.id)
    const redis = await getRedis()
    if (redis) await redis.setEx(`refresh:${user.id}`, 30*24*60*60, hashToken(refreshToken))
    setAuthCookies(res, accessToken, refreshToken)
    res.status(201).json({
      message: isProd ? 'Conta criada! Verifica o teu email para activar a conta.' : 'Conta criada com sucesso!',
      accessToken, refreshToken,
      user: { id:user.id, email:user.email, status:user.status },
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
    const { email, password } = z.object({ email:z.string().email(), password:z.string().min(1) }).parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Email ou password incorretos.' })
    if (user.status==='BANNED')    return res.status(403).json({ error:'Esta conta foi suspensa.',         code:'ACCOUNT_BANNED' })
    if (user.status==='SUSPENDED') return res.status(403).json({ error:'Conta temporariamente suspensa.', code:'ACCOUNT_SUSPENDED' })
    if (user.status==='DELETED')   return res.status(403).json({ error:'Esta conta foi eliminada.',       code:'ACCOUNT_DELETED' })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Email ou password incorretos.' })
    await prisma.user.update({ where: { id:user.id }, data: { lastSeenAt: new Date() } })
    const { accessToken, refreshToken } = generateTokens(user.id)
    const redis = await getRedis()
    if (redis) await redis.setEx(`refresh:${user.id}`, 30*24*60*60, hashToken(refreshToken))
    setAuthCookies(res, accessToken, refreshToken)
    res.json({ accessToken, refreshToken, user:{ id:user.id, email:user.email, status:user.status, adminRole:user.adminRole }, emailVerified:!!user.emailVerifiedAt })
  } catch (err: any) {
    if (err.name==='ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (token) {
    try { const { userId } = verifyAccessToken(token); const r = await getRedis(); if (r) await r.del(`refresh:${userId}`) } catch {}
  }
  clearAuthCookies(res)
  res.json({ message: 'Sessão terminada.' })
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const rt = req.body?.refreshToken || (req as any).cookies?.refreshToken
  if (!rt) return res.status(401).json({ error: 'Token em falta.' })
  try {
    const { userId } = verifyRefreshToken(rt)
    const redis = await getRedis()
    if (redis) { const s = await redis.get(`refresh:${userId}`); if (!s || s!==hashToken(rt)) return res.status(401).json({ error:'Token inválido.' }) }
    const tokens = generateTokens(userId)
    if (redis) await redis.setEx(`refresh:${userId}`, 30*24*60*60, hashToken(tokens.refreshToken))
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken)
    res.json(tokens)
  } catch { res.status(401).json({ error: 'Token expirado.' }) }
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:true, email:true, status:true, adminRole:true, emailVerifiedAt:true, createdAt:true, ageVerifiedAt:true,
        profile: { select:{ id:true, displayName:true, type:true, status:true, city:true } },
        subscription: { select:{ plan:true, status:true, currentPeriodEnd:true } }
      }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    res.json(user)
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})

// POST /api/auth/email/verify — resend verification email (same fix as verifications.ts)
router.post('/email/verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
    let userId: string|undefined
    if (token) { try { userId = verifyAccessToken(token).userId } catch {} }
    if (!userId && req.body.email) {
      const u = await prisma.user.findUnique({ where: { email: req.body.email } })
      userId = u?.id
    }
    if (!userId) return res.status(400).json({ error: 'Não foi possível identificar o utilizador.' })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    if (user.emailVerifiedAt) return res.status(409).json({ error: 'Email já verificado.' })
    const verifyToken = randomBytes(32).toString('hex')
    const redis = await getRedis()
    if (redis) { await redis.del(`email_verify:${userId}`); await redis.setEx(`email_verify:${userId}`, 3600, hashToken(verifyToken)) }
    // Non-blocking send
    import('../lib/email').then(({ sendVerificationEmail }) => {
      sendVerificationEmail(user.email, userId!, verifyToken)
        .then(() => console.log('[EMAIL] Verify resent:', user.email))
        .catch(e => console.error('[EMAIL] Resend failed:', e.message))
    })
    const devPayload = !isProd ? { devToken: verifyToken, devUrl:`${process.env.CLIENT_URL}/verify-email?userId=${userId}&token=${encodeURIComponent(verifyToken)}` } : {}
    res.json({ ok:true, message:'Email de verificação enviado.', ...devPayload })
  } catch (err: any) { res.status(500).json({ error: 'Erro ao enviar email.' }) }
})

// POST /api/auth/email/confirm
router.post('/email/confirm', async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body
    if (!token || !userId) return res.status(400).json({ error: 'Token e userId obrigatórios.' })
    const redis = await getRedis()
    if (redis) {
      const stored = await redis.get(`email_verify:${userId}`)
      if (!stored || stored !== hashToken(token)) return res.status(400).json({ error: 'Token inválido ou expirado.' })
      await redis.del(`email_verify:${userId}`)
    }
    const user = await prisma.user.update({ where: { id:userId }, data: { emailVerifiedAt:new Date(), status:'ACTIVE' } })
    import('../lib/email').then(({ sendWelcomeEmail }) => sendWelcomeEmail(user.email).catch(()=>{}))
    res.json({ ok:true, message:'Email verificado! A tua conta está activa.' })
  } catch { res.status(500).json({ error: 'Erro interno.' }) }
})

// POST /api/auth/password/forgot
router.post('/password/forgot', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email:z.string().email() }).parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (user && user.status!=='BANNED' && user.status!=='DELETED') {
      const resetToken = randomBytes(32).toString('hex')
      const redis = await getRedis()
      if (redis) { await redis.del(`pwd_reset:${user.id}`); await redis.setEx(`pwd_reset:${user.id}`, 3600, hashToken(resetToken)) }
      import('../lib/email').then(({ sendPasswordResetEmail }) => {
        sendPasswordResetEmail(user.email, user.id, resetToken).catch(e => console.error('[EMAIL RESET]', e.message))
      })
    }
    res.json({ message: 'Se este email existe, receberás um link para repor a password.' })
  } catch (err: any) {
    if (err.name==='ZodError') return res.status(400).json({ error: 'Email inválido.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/auth/password/reset
router.post('/password/reset', authLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, token, password } = z.object({ userId:z.string().uuid(), token:z.string().min(1), password:z.string().min(8) }).parse(req.body)
    const redis = await getRedis()
    if (redis) {
      const stored = await redis.get(`pwd_reset:${userId}`)
      if (!stored || stored!==hashToken(token)) return res.status(400).json({ error: 'Link inválido ou expirado.' })
      await redis.del(`pwd_reset:${userId}`)
    }
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id:userId }, data: { passwordHash } })
    if (redis) await redis.del(`refresh:${userId}`)
    clearAuthCookies(res)
    res.json({ ok:true, message:'Password reposta. Podes entrar com a nova password.' })
  } catch (err: any) {
    if (err.name==='ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/auth/account
router.delete('/account', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password obrigatória para confirmar.' })
    const user = await prisma.user.findUnique({ where: { id:userId } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Password incorrecta.' })
    await prisma.user.update({ where:{ id:userId }, data:{ status:'DELETED', email:`deleted-${userId}@deleted.betweenus`, passwordHash:'DELETED', dateOfBirth:new Date('1900-01-01'), emailVerifiedAt:null, lastSeenAt:null } })
    const redis = await getRedis()
    if (redis) await redis.del(`refresh:${userId}`)
    clearAuthCookies(res)
    res.json({ ok:true, message:'Conta eliminada. Os teus dados serão removidos nos próximos 30 dias.' })
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})

// GET /api/auth/export
router.get('/export', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id:userId },
      select: { id:true, email:true, dateOfBirth:true, createdAt:true, status:true,
        profile: { select:{ displayName:true, bio:true, gender:true, orientation:true, relationshipStatus:true, city:true, country:true, createdAt:true, intentions:{ include:{ intention:true } } } },
        consents: { select:{ consentType:true, version:true, acceptedAt:true } },
        subscription: { select:{ plan:true, status:true } }
      }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    res.setHeader('Content-Disposition','attachment; filename="betweenus-data-export.json"')
    res.setHeader('Content-Type','application/json')
    res.json({ exportedAt:new Date().toISOString(), exportVersion:'1.0', data:user })
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})

// DELETE /api/auth/sessions
router.delete('/sessions', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const redis = await getRedis()
    if (redis) await redis.del(`refresh:${userId}`)
    clearAuthCookies(res)
    res.json({ message: 'Todas as sessões foram terminadas.' })
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})


// ─── PUT /api/auth/account — update account-level data (name, NIF) ────────────
router.put('/account', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const { accountName, nif } = req.body
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(accountName !== undefined && { accountName: accountName?.trim() || null }),
        ...(nif !== undefined && { nif: nif?.trim() || null }),
      },
      select: { id:true, email:true, accountName:true, nif:true, status:true, adminRole:true }
    })
    res.json({ ok:true, user: updated })
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})

// ─── POST /api/auth/avatar — upload account avatar ───────────────────────────
import multer from 'multer'
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } })

router.post('/avatar', avatarUpload.single('avatar'), async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    if (!req.file) return res.status(400).json({ error: 'Ficheiro obrigatório.' })

    let avatarUrl: string | null = null
    if (process.env.STORAGE_ENDPOINT) {
      const { uploadFile } = await import('../lib/storage')
      const ext = req.file.originalname.split('.').pop() || 'jpg'
      const filename = `avatars/${userId}-${Date.now()}.${ext}`
      const result = await uploadFile(req.file.buffer, filename, req.file.mimetype)
      avatarUrl = result.url
    } else {
      // Dev: store as base64 data URL for testing
      avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    }

    await prisma.user.update({ where: { id: userId }, data: { avatarPath: avatarUrl } })
    res.json({ ok:true, avatarPath: avatarUrl })
  } catch (err: any) {
    console.error('[AVATAR]', err.message)
    res.status(500).json({ error: 'Erro ao fazer upload.' })
  }
})

export default router
