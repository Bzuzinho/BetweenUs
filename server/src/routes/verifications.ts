import { Router, Response, Request } from 'express'
import multer from 'multer'
import { createHash, randomBytes } from 'crypto'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { uploadPrivateFile, deleteFile } from '../lib/storage'
import { resolveVerificationSelfieUrl, isStorageKey } from '../lib/mediaAccessService'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { evaluateAndActivateUser } from '../lib/userActivationService'
import { notifyAdmins } from '../lib/notify'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Apenas imagens são permitidas.'))
  }
})

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: { error: 'Demasiados pedidos. Aguarda 15 minutos.' }
})

// GET /api/verifications/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const v = await prisma.verification.findUnique({
    where: { userId: req.userId! },
    select: { id: true, type: true, status: true, reviewedAt: true, expiresAt: true, createdAt: true }
  })
  res.json(v || { status: 'NONE' })
})

// POST /api/verifications/submit — selfie upload
router.post('/submit', requireAuth, upload.single('selfie'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Selfie obrigatória.' })
    const existing = await prisma.verification.findUnique({ where: { userId: req.userId! } })
    if (existing?.status === 'APPROVED') return res.status(409).json({ error: 'Perfil já verificado.' })
    if (existing?.status === 'PENDING')  return res.status(409).json({ error: 'Verificação já em curso.' })
    // 3.1: verification selfies are the most sensitive asset in the app —
    // always private, never a public ACL. Only reachable via the admin
    // signed-url endpoint below, and deleted immediately after review.
    let selfieKey: string | undefined
    if (isProd && process.env.STORAGE_ENDPOINT) {
      const filename = `verify-${req.userId}-${Date.now()}.jpg`
      const result = await uploadPrivateFile(req.file.buffer, `verifications/${filename}`, req.file.mimetype)
      selfieKey = result.key
    }
    await prisma.verification.upsert({
      where: { userId: req.userId! },
      update: { status: 'PENDING', selfieStoragePath: selfieKey || null, reviewedAt: null, expiresAt: new Date(Date.now() + 30*24*60*60*1000) },
      create: { userId: req.userId!, type: 'selfie', status: isProd ? 'PENDING' : 'APPROVED', selfieStoragePath: selfieKey || null, expiresAt: new Date(Date.now() + 30*24*60*60*1000) }
    })
    if (!isProd) {
      await prisma.user.update({ where: { id: req.userId! }, data: { ageVerifiedAt: new Date() } })
      return res.json({ ok: true, status: 'APPROVED', message: '[DEV] Auto-aprovado.' })
    }

    // Notify admins of pending verification (non-blocking)
    const verUser = await prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true } })
    notifyAdmins(
      'verification_pending',
      '📋 Verificação de perfil pendente',
      `${verUser?.email} submeteu uma selfie de verificação. Requer revisão.`,
      { userId: req.userId, tab: 'verifications' }
    ).catch(() => {})

    res.json({ ok: true, status: 'PENDING', message: 'Selfie recebida. Aguarda revisão.' })
  } catch (err: any) {
    console.error('[VERIFICATION]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/verifications/email/request — resend verification email
// Fix: was hanging because sendVerificationEmail was throwing silently
router.post('/email/request', requireAuth, verifyEmailLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    if (user.emailVerifiedAt) return res.status(409).json({ error: 'Email já verificado.' })

    const token = randomBytes(32).toString('hex')
    const hash  = createHash('sha256').update(token).digest('hex')

    let redis: any = null
    try {
      redis = (await import('../lib/redis')).default
      if (!redis.isOpen) await redis.connect()
    } catch { redis = null }

    if (redis) {
      await redis.del(`email_verify:${req.userId}`)
      await redis.setEx(`email_verify:${req.userId}`, 3600, hash)
    }

    // Always respond immediately — email sending is async and non-blocking
    const devPayload = !isProd ? { devToken: token, devUrl: `${process.env.CLIENT_URL}/verify-email?userId=${req.userId}&token=${encodeURIComponent(token)}` } : {}

    // Send email async — don't await so request never hangs
    if (isProd || process.env.SMTP_PASS) {
      import('../lib/email').then(({ sendVerificationEmail }) => {
        sendVerificationEmail(user.email, req.userId!, token)
          .then(() => console.log('[EMAIL] Verification sent to', user.email))
          .catch(e => console.error('[EMAIL] Failed:', e.message))
      })
    }

    res.json({ ok: true, message: 'Email de verificação enviado.', ...devPayload })
  } catch (err: any) {
    console.error('[EMAIL VERIFY REQUEST]', err.message)
    res.status(500).json({ error: 'Erro ao enviar email.' })
  }
})

// POST /api/verifications/email/confirm
router.post('/email/confirm', async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body
    if (!token || !userId) return res.status(400).json({ error: 'Token e userId obrigatórios.' })
    const hash = createHash('sha256').update(token).digest('hex')
    let redis: any = null
    try {
      redis = (await import('../lib/redis')).default
      if (!redis.isOpen) await redis.connect()
    } catch { redis = null }
    if (redis) {
      const stored = await redis.get(`email_verify:${userId}`)
      if (!stored || stored !== hash) return res.status(400).json({ error: 'Token inválido ou expirado.' })
      await redis.del(`email_verify:${userId}`)
    }
    // Sprint 2.5.5: this used to force status='ACTIVE' unconditionally — a stale
    // (but still valid/unused) confirmation token clicked after a BANNED/SUSPENDED
    // action would silently reactivate the account. Now only emailVerifiedAt is
    // stamped unconditionally; the status change goes through the central
    // activation rule, which no-ops unless the user is still PENDING_VERIFICATION.
    const user = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } })
    const activation = await evaluateAndActivateUser(userId)
    import('../lib/email').then(({ sendWelcomeEmail }) => {
      sendWelcomeEmail(user.email).catch(e => console.error('[EMAIL WELCOME]', e.message))
    })
    res.json({
      ok: true,
      message: activation.activated ? 'Email verificado! A tua conta está activa.' : 'Email verificado.',
      activation
    })
  } catch { res.status(500).json({ error: 'Erro interno.' }) }
})

// PUT /api/verifications/admin/:userId — admin approve/reject
// Sprint 2.5.4: was completely unauthenticated (no requireAuth/requireAdmin) —
// anyone could approve/reject any user's identity verification. Locked down.
// Note: this duplicates part of PUT /api/admin/verifications/:userId (routes/admin.ts).
// Kept for now because it's the only path that sets ageVerifiedAt + cleans up the
// selfie file; full consolidation into UserActivationService is tracked separately.
router.put('/admin/:userId', requireAuth, requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    if (!['APPROVED','REJECTED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
    const prev = await prisma.verification.findUnique({ where: { userId: req.params.userId }, select: { status: true } })
    const verification = await prisma.verification.update({
      where: { userId: req.params.userId },
      data: { status, reviewedAt: new Date() }
    })
    let activation = null
    if (status === 'APPROVED') {
      await prisma.user.update({ where: { id: req.params.userId }, data: { ageVerifiedAt: new Date() } })
      if (verification.selfieStoragePath) {
        // 3.1: handle both a raw R2 key (new uploads) and a legacy full URL
        // (selfies uploaded before this sprint) the same way delete does in photos.ts
        const path = verification.selfieStoragePath
        const key = isStorageKey(path) ? path : new URL(path).pathname.replace(/^\//, '')
        await deleteFile(key).catch(e => console.error('[SELFIE DELETE]', e.message))
        await prisma.verification.update({ where: { userId: req.params.userId }, data: { selfieStoragePath: null } })
      }
      activation = await evaluateAndActivateUser(req.params.userId)
    }
    await logAdminAction(req.userId!, `${status}_VERIFICATION`, 'user', req.params.userId, {
      targetUserId: req.params.userId,
      previousData: { status: prev?.status },
      newData: { status },
      ipAddress: req.ip
    })
    res.json({ ok: true, status, activation })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

// GET /api/verifications/admin/:userId/selfie-url — signed, short-TTL URL for
// the pending selfie. Replaces exposing selfieStoragePath directly to the
// admin client (which no longer resolves to anything publicly reachable).
router.get('/admin/:userId/selfie-url', requireAuth, requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  try {
    const verification = await prisma.verification.findUnique({ where: { userId: req.params.userId } })
    if (!verification || !verification.selfieStoragePath) return res.status(404).json({ error: 'Sem selfie disponível.' })
    const url = await resolveVerificationSelfieUrl(verification.selfieStoragePath, { isOwner: false, isAdminModeration: true })
    if (!url) return res.status(404).json({ error: 'Sem selfie disponível.' })
    res.json({ url, expiresIn: 120 })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
