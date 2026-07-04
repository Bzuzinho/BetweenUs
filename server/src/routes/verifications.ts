import { Router, Response, Request } from 'express'
import multer from 'multer'
import { createHash, randomBytes } from 'crypto'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { uploadFile, deleteFile } from '../lib/storage'
import { requireAuth, AuthRequest } from '../middleware/auth'
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
    let selfieUrl: string | undefined
    if (isProd && process.env.STORAGE_ENDPOINT) {
      const filename = `verify-${req.userId}-${Date.now()}.jpg`
      const result = await uploadFile(req.file.buffer, `verifications/${filename}`, req.file.mimetype)
      selfieUrl = result.url
    }
    await prisma.verification.upsert({
      where: { userId: req.userId! },
      update: { status: 'PENDING', selfieStoragePath: selfieUrl || null, reviewedAt: null, expiresAt: new Date(Date.now() + 30*24*60*60*1000) },
      create: { userId: req.userId!, type: 'selfie', status: isProd ? 'PENDING' : 'APPROVED', selfieStoragePath: selfieUrl || null, expiresAt: new Date(Date.now() + 30*24*60*60*1000) }
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
    const user = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date(), status: 'ACTIVE' } })
    import('../lib/email').then(({ sendWelcomeEmail }) => {
      sendWelcomeEmail(user.email).catch(e => console.error('[EMAIL WELCOME]', e.message))
    })
    res.json({ ok: true, message: 'Email verificado! A tua conta está activa.' })
  } catch { res.status(500).json({ error: 'Erro interno.' }) }
})

// PUT /api/verifications/admin/:userId — admin approve/reject
router.put('/admin/:userId', async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    if (!['APPROVED','REJECTED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
    const verification = await prisma.verification.update({
      where: { userId: req.params.userId },
      data: { status, reviewedAt: new Date() }
    })
    if (status === 'APPROVED') {
      await prisma.user.update({ where: { id: req.params.userId }, data: { ageVerifiedAt: new Date() } })
      if (verification.selfieStoragePath) {
        const key = new URL(verification.selfieStoragePath).pathname.replace(/^\//, '')
        await deleteFile(key).catch(e => console.error('[SELFIE DELETE]', e.message))
        await prisma.verification.update({ where: { userId: req.params.userId }, data: { selfieStoragePath: null } })
      }
    }
    res.json({ ok: true, status })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router
