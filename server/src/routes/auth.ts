import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { generateTokens, verifyRefreshToken, verifyAccessToken } from '../utils/jwt'
import { notifyAdmins } from '../lib/notify'
import { evaluateAndActivateUser } from '../lib/userActivationService'
import { getPendingReacceptance, recordReacceptance, revokeConsent } from '../lib/legalDocumentService'
import { signMediaUrl } from '../lib/mediaAccessService'
import { requireAuth, AuthRequest } from '../middleware/auth'

const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')

const router = Router()
// BETA.2 fix — both were module-level constants, captured ONCE when this
// file is first imported. That's fine in production (NODE_ENV/BETA_CLOSED
// never change during a running process), but it silently broke every
// test that flips process.env.NODE_ENV or process.env.BETA_CLOSED at
// runtime (auth.test.ts's "does not auto-verify email in production
// mode" and the whole "Auth — beta closed" describe block, which sets
// BETA_CLOSED in beforeAll) — those runtime mutations happen long after
// this module already evaluated the constant, so they had zero effect.
// This was masked for this entire sprint by a separate, now-fixed bug:
// NODE_ENV was ALWAYS actually 'production' on Railway regardless of
// .env.test (see package.json's test script), so isProd was already true
// at module load time and the "does not auto-verify" test's runtime
// flip was a redundant no-op that happened to still pass. Converting
// both to functions, re-evaluated on every call, fixes this for real.
const isProd = () => process.env.NODE_ENV === 'production'
const isBetaClosed = () => process.env.BETA_CLOSED === 'true'

// BETA.2 fix — this limiter is wired directly onto the route (not via the
// app-level noop limiter __tests__/app.ts installs), so integration tests
// that legitimately call /register or /login more than 10 times in one
// file (very common — every test in auth.test.ts/jwtRotation.test.ts
// registers its own user) were getting real 429s instead of the status
// codes they were asserting on. Effectively disable it under test, same
// as the rest of the stack already assumes happens.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'test' ? 100000 : 10,
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
  refCode: z.string().optional(),
  // BETA.3 fix — these three are mandatory RGPD consents (age
  // verification, privacy policy, sensitive-data processing). BETA.2 made
  // them reject an explicit `false` but still allowed the key to be
  // entirely absent, specifically because client/src/pages/RegisterPage.jsx
  // never sent them at all (its step-2 screen only had a single
  // termsAccepted checkbox) — requiring the key would have 400'd every
  // real registration. RegisterPage.jsx now collects all three as their
  // own unchecked-by-default checkboxes (BETA.3), so the soft-optional
  // escape hatch is closed here too: the field must be present AND `true`.
  ageConfirmed: z.boolean({ required_error: 'Tens de confirmar que tens pelo menos 18 anos' }).refine(v => v === true, 'Tens de confirmar que tens pelo menos 18 anos'),
  privacyAccepted: z.boolean({ required_error: 'Tens de aceitar a Política de Privacidade' }).refine(v => v === true, 'Tens de aceitar a Política de Privacidade'),
  sensitiveDataAccepted: z.boolean({ required_error: 'Tens de aceitar o processamento de dados sensíveis' }).refine(v => v === true, 'Tens de aceitar o processamento de dados sensíveis'),
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
  if (!isBetaClosed()) return { ok:true, invite:null }
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
        emailVerifiedAt: isProd() ? null : new Date(),
        status: isProd() ? 'PENDING_VERIFICATION' : 'ACTIVE',
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
    if (data.refCode) {
      const { recordReferral } = await import('../lib/referralService')
      recordReferral(user.id, data.refCode).catch(() => {})
    }
    // Send verification email async — never block the response
    if (isProd()) {
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
      message: isProd() ? 'Conta criada! Verifica o teu email para activar a conta.' : 'Conta criada com sucesso!',
      accessToken, refreshToken,
      user: { id:user.id, email:user.email, status:user.status },
      emailVerificationRequired: isProd()
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
    if (user.status==='BANNED')    return res.status(403).json({ error:'Esta conta foi banida.',           code:'ACCOUNT_BANNED' })
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
//
// Security follow-up (JWT rotation, commit 487b622 exposure) — every
// failure path here now clears the accessToken/refreshToken cookies
// before responding. Before this fix, a failed refresh (expired, invalid
// signature, or — the case that matters most right now — a token signed
// with an OLD, rotated-out JWT_REFRESH_SECRET) left the stale httpOnly
// cookies sitting in the browser. That's harmless for the SPA itself
// (localStorage is the primary token store and the axios interceptor
// already clears + redirects on refresh failure), but it violates the
// explicit contract this audit checks for ("refresh token antigo →
// cookies/tokens locais são limpos") and could bite any non-SPA client
// (or a future server-rendered path) that relies on the cookie alone.
router.post('/refresh', async (req: Request, res: Response) => {
  const rt = req.body?.refreshToken || (req as any).cookies?.refreshToken
  if (!rt) { clearAuthCookies(res); return res.status(401).json({ error: 'Token em falta.' }) }
  try {
    const { userId } = verifyRefreshToken(rt)
    const redis = await getRedis()
    if (redis) {
      const s = await redis.get(`refresh:${userId}`)
      if (!s || s!==hashToken(rt)) { clearAuthCookies(res); return res.status(401).json({ error:'Token inválido.' }) }
    }
    const tokens = generateTokens(userId)
    if (redis) await redis.setEx(`refresh:${userId}`, 30*24*60*60, hashToken(tokens.refreshToken))
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken)
    res.json(tokens)
  } catch {
    // Covers both TokenExpiredError and JsonWebTokenError (invalid
    // signature — the exact case a rotated JWT_REFRESH_SECRET produces
    // for any refresh token issued before the rotation). Either way the
    // token is unusable, so the response is identical and the stale
    // cookies are cleared the same way.
    clearAuthCookies(res)
    res.status(401).json({ error: 'Token expirado.' })
  }
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
        accountName:true, nif:true, avatarPath:true, dateOfBirth:true,
        pushNotificationsEnabled:true, appIconBadgeEnabled:true,
        subscription: { select:{ plan:true, status:true, currentPeriodEnd:true } }
      }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    // BETA.2 (FASE C) — every user now potentially has TWO different
    // things worth returning: their own Individual Profile (owned row,
    // may not exist yet or may still be a DRAFT stub from the backfill
    // script — see backfillIndividualProfiles.ts), and whichever profile
    // they're currently "acting as" (Active Profile Context — could be
    // that same Individual Profile, or a Shared Profile they belong to).
    // `profile` is kept in the response with its historical shape/meaning
    // (the ACTING profile) so existing frontend routing code
    // (postLoginRoute.js, App.jsx's PrivateRoute) doesn't need to change —
    // it just now comes from activeProfileContextService instead of the
    // raw Profile.userId relation, which is what actually fixes the "second
    // couple/group member 404s" class of bug (BETA.2 audit).
    const { getAvailableContexts, resolveActiveProfileId } = await import('../lib/activeProfileContextService')
    const availableProfileContexts = await getAvailableContexts(userId)
    const activeProfileId = await resolveActiveProfileId(userId)
    const activeProfileContext = activeProfileId
      ? availableProfileContexts.find(c => c.profileId === activeProfileId) || null
      : null

    const individualProfileRow = await prisma.profile.findUnique({
      where: { userId },
      select: { id:true, displayName:true, type:true, status:true, city:true }
    })

    const activeProfileRow = activeProfileContext
      ? (activeProfileContext.profileId === individualProfileRow?.id
          ? individualProfileRow
          : await prisma.profile.findUnique({
              where: { id: activeProfileContext.profileId },
              select: { id:true, displayName:true, type:true, status:true, city:true }
            }))
      : null

    // 3.3: flag any legal document the user accepted an outdated version of
    // (or never accepted at all, for documents published after they signed
    // up). Empty array = nothing to do, same shape either way so the client
    // doesn't need a separate "not applicable" branch.
    const pendingLegalReacceptance = await getPendingReacceptance(userId).catch(() => [])
    const avatarPath = await signMediaUrl(user.avatarPath)

    res.json({
      ...user,
      avatarPath,
      pendingLegalReacceptance,
      profile: activeProfileRow,
      individualProfile: individualProfileRow,
      availableProfileContexts,
      activeProfileContext
    })
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})

// POST /api/auth/active-profile — BETA.2 (FASE C) Profile Switcher backend.
// Body: { profileId }. Only succeeds if the caller actually belongs to
// that profile (activeProfileContextService re-validates, never trusts the
// client blindly) — see its switchActiveProfile().
router.post('/active-profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.body
    if (!profileId) return res.status(400).json({ error: 'profileId é obrigatório.' })
    const { switchActiveProfile } = await import('../lib/activeProfileContextService')
    const context = await switchActiveProfile(req.userId!, profileId)
    if (!context) return res.status(403).json({ error: 'Não pertences a esse perfil.' })
    res.json({ activeProfileContext: context })
  } catch (err: any) {
    console.error('[ACTIVE PROFILE SWITCH]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/auth/consents/reaccept — accept the currently published version
// of a legal document (used after a pendingLegalReacceptance prompt)
router.post('/consents/reaccept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { consentType } = req.body
    if (!consentType) return res.status(400).json({ error: 'consentType obrigatório.' })
    const consent = await recordReacceptance(req.userId!, consentType, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })
    res.json({ ok: true, consent })
  } catch (err: any) {
    // Closed Beta audit (FASE 2.4) — recordReacceptance's own validation
    // errors are safe, hand-written messages, but a Prisma constraint
    // error would otherwise also reach here unfiltered in production.
    console.error('[CONSENT REACCEPT]', err.message)
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'Erro ao registar aceitação.' : (err.message || 'Erro ao registar aceitação.') })
  }
})

// POST /api/auth/consents/revoke — withdraws an OPTIONAL consent
// (MARKETING/LOCATION/CONTACT_HASHING). TERMS/PRIVACY_POLICY/SENSITIVE_DATA
// are mandatory to use the app and are not revocable here — see
// REVOCABLE_CONSENT_TYPES in legalDocumentService.ts. Closes a non-blocking
// RGPD QA finding: revoking was previously impossible via the API.
router.post('/consents/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { consentType } = req.body
    if (!consentType) return res.status(400).json({ error: 'consentType obrigatório.' })
    const result = await revokeConsent(req.userId!, consentType)
    res.json({ ok: true, ...result })
  } catch (err: any) {
    // Closed Beta audit (FASE 2.4) — same reasoning as /consents/reaccept above.
    console.error('[CONSENT REVOKE]', err.message)
    res.status(400).json({ error: process.env.NODE_ENV === 'production' ? 'Erro ao revogar consentimento.' : (err.message || 'Erro ao revogar consentimento.') })
  }
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
    const devPayload = !isProd() ? { devToken: verifyToken, devUrl:`${process.env.CLIENT_URL}/verify-email?userId=${userId}&token=${encodeURIComponent(verifyToken)}` } : {}
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
    // Sprint 2.5.5: no longer forces status='ACTIVE' unconditionally — see
    // lib/userActivationService.ts. A stale confirm link must not be able to
    // undo a BANNED/SUSPENDED action.
    const user = await prisma.user.update({ where: { id:userId }, data: { emailVerifiedAt:new Date() } })
    const activation = await evaluateAndActivateUser(userId)
    import('../lib/email').then(({ sendWelcomeEmail }) => sendWelcomeEmail(user.email).catch(()=>{}))
    res.json({ ok:true, message: activation.activated ? 'Email verificado! A tua conta está activa.' : 'Email verificado.', activation })
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


// ─── PUT /api/auth/account — account-level data (accountName/NIF), distinct from Profile
const accountUpdateSchema = z.object({
  accountName: z.string().trim().min(2).max(80).optional().nullable(),
  nif:         z.string().trim().regex(/^\d{9}$/, 'NIF deve ter 9 dígitos.').optional().nullable(),
})

router.put('/account', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || (req as any).cookies?.accessToken
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId } = verifyAccessToken(token)
    const data = accountUpdateSchema.parse(req.body)

    const updateData: any = {}
    if (data.accountName !== undefined) updateData.accountName = data.accountName || null
    if (data.nif !== undefined)         updateData.nif = data.nif || null

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id:true, email:true, accountName:true, nif:true, avatarPath:true }
    })

    res.json({ ok: true, message: 'Dados de conta guardados.', user })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(401).json({ error: 'Token inválido.' })
  }
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

    // 3.1 follow-up: avatars now go through the same private-storage path
    // as profile photos/selfies — the bucket is private by definition, and
    // "public" is a viewer-facing access level (see mediaAccessPolicy.ts),
    // not an R2 ACL. avatarPath stores an object key; every read path signs
    // it fresh (see GET /me below, admin.ts GET /users and GET /users/:id).
    let avatarValue: string | null = null
    if (process.env.STORAGE_ENDPOINT) {
      const { uploadPrivateFile } = await import('../lib/storage')
      const ext = req.file.originalname.split('.').pop() || 'jpg'
      const filename = `avatars/${userId}-${Date.now()}.${ext}`
      const result = await uploadPrivateFile(req.file.buffer, filename, req.file.mimetype)
      avatarValue = result.key
    } else {
      // Dev: store as base64 data URL for testing — signMediaUrl passes
      // data: URIs through unchanged, same as it does for legacy public URLs.
      avatarValue = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    }

    await prisma.user.update({ where: { id: userId }, data: { avatarPath: avatarValue } })
    const { signMediaUrl } = await import('../lib/mediaAccessService')
    res.json({ ok:true, avatarPath: await signMediaUrl(avatarValue) })
  } catch (err: any) {
    console.error('[AVATAR]', err.message)
    res.status(500).json({ error: 'Erro ao fazer upload.' })
  }
})


// ─── POST /api/auth/otp — generate one-time login link (SUPER_ADMIN emergency) ─
// Returns a URL that logs in a specific user once, without password
// ONLY callable from admin panel, stored in Redis with 15min TTL
router.post('/otp', async (req: Request, res: Response) => {
  // Verify the caller is authenticated as SUPER_ADMIN
  const callerToken = req.headers.authorization?.split(' ')[1]
  if (!callerToken) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const { userId: callerId } = verifyAccessToken(callerToken)
    const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { adminRole: true } })
    if (caller?.adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN.' })

    const { targetEmail } = req.body
    if (!targetEmail) return res.status(400).json({ error: 'targetEmail obrigatório.' })

    const target = await prisma.user.findUnique({ where: { email: targetEmail } })
    if (!target) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    const { randomBytes } = await import('crypto')
    const otp = randomBytes(24).toString('hex')

    const redis = await getRedis()
    if (!redis) return res.status(503).json({ error: 'Redis não disponível.' })

    // Store OTP with 15 minute TTL, one-time use
    await redis.setEx(`otp:${otp}`, 900, target.id)

    const loginUrl = `${CLIENT_URL}/otp-login?token=${otp}`
    res.json({ ok: true, loginUrl, expiresIn: '15 minutes',
      warning: 'Este link faz login automático. Partilha APENAS com o utilizador em causa.' })
  } catch { res.status(401).json({ error: 'Token inválido.' }) }
})

// ─── GET /api/auth/otp-login — use one-time token to authenticate ─────────────
router.get('/otp-login', async (req: Request, res: Response) => {
  const { token } = req.query as { token: string }
  if (!token) return res.status(400).json({ error: 'Token obrigatório.' })
  try {
    const redis = await getRedis()
    if (!redis) return res.status(503).json({ error: 'Redis não disponível.' })
    const userId = await redis.get(`otp:${token}`)
    if (!userId) return res.status(400).json({ error: 'Link inválido ou expirado.' })
    // One-time use — delete immediately
    await redis.del(`otp:${token}`)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.status === 'BANNED' || user.status === 'DELETED') {
      return res.status(403).json({ error: 'Conta não disponível.' })
    }
    const { accessToken, refreshToken } = generateTokens(userId)
    const newHash = createHash('sha256').update(refreshToken).digest('hex')
    const redis2 = await getRedis()
    if (redis2) await redis2.setEx(`refresh:${userId}`, 30 * 24 * 60 * 60, newHash)
    setAuthCookies(res, accessToken, refreshToken)
    res.json({ ok: true, accessToken, refreshToken,
      user: { id: user.id, email: user.email, status: user.status, adminRole: user.adminRole } })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
