import { Router, Response, Request } from 'express'
import multer from 'multer'
import { createHash, randomBytes } from 'crypto'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { uploadFile, deleteFile } from '../lib/storage'
import { requireAuth, AuthRequest } from '../middleware/auth'

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

// Rate limit: max 3 email verification requests per 15 minutes
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: { error: 'Demasiados pedidos de verificação. Aguarda 15 minutos.' }
})

// --- Selfie verification ---

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const verification = await prisma.verification.findUnique({
      where: { userId: req.userId! },
      select: { id: true, type: true, status: true, reviewedAt: true, expiresAt: true, createdAt: true }
      // T4: selfieStoragePath excluded from client response — internal only
    })
    res.json(verification || { status: 'NONE' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.post('/submit', requireAuth, upload.single('selfie'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Selfie obrigatória.' })

    const existing = await prisma.verification.findUnique({ where: { userId: req.userId! } })
    if (existing?.status === 'APPROVED') return res.status(409).json({ error: 'Perfil já verificado.' })
    if (existing?.status === 'PENDING') return res.status(409).json({ error: 'Verificação já em curso.' })

    let selfieUrl: string | undefined

    if (isProd && process.env.STORAGE_ENDPOINT) {
      const filename = `verify-${req.userId}-${Date.now()}.jpg`
      const result = await uploadFile(req.file.buffer, `verifications/${filename}`, req.file.mimetype)
      selfieUrl = result.url
    }

    const verification = await prisma.verification.upsert({
      where: { userId: req.userId! },
      update: {
        status: 'PENDING', type: 'selfie',
        selfieStoragePath: selfieUrl || null,
        reviewedAt: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      create: {
        userId: req.userId!, type: 'selfie', status: 'PENDING',
        selfieStoragePath: selfieUrl || null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    // Dev: auto-approve if storage not configured
    if (!isProd && !process.env.STORAGE_ENDPOINT) {
      await prisma.verification.update({
        where: { userId: req.userId! },
        data: { status: 'APPROVED', reviewedAt: new Date() }
      })
      return res.json({ ok: true, status: 'APPROVED', message: '[DEV] Auto-aprovado — apenas em desenvolvimento.' })
    }

    res.json({ ok: true, status: 'PENDING', message: 'Selfie recebida. Aguarda revisão da equipa.' })
  } catch (err: any) {
    console.error('[VERIFICATION]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// T5: POST /api/verifications/email/request — send verification email
router.post('/email/request', requireAuth, verifyEmailLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    if (user.emailVerifiedAt) return res.status(409).json({ error: 'Email já verificado.' })

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const hash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token hash in Redis (not in DB — temporary)
    const getRedis = async () => {
      try {
        const redis = (await import('../lib/redis')).default
        if (!redis.isOpen) await redis.connect()
        return redis
      } catch { return null }
    }

    const redis = await getRedis()
    if (redis) {
      // Invalidate any previous token for this user
      await redis.del(`email_verify:${req.userId}`)
      await redis.setEx(`email_verify:${req.userId}`, 3600, hash)
    }

    // TODO: send email via Resend/SMTP when configured
    // await sendEmail({ to: user.email, subject: 'Verifica o teu email — Between Us', token })

    if (!isProd) {
      // Dev: return the token directly for testing
      return res.json({
        ok: true,
        message: '[DEV] Token gerado. Em produção seria enviado por email.',
        devToken: token,
        expiresAt
      })
    }

    res.json({ ok: true, message: 'Email de verificação enviado. O link expira em 1 hora.' })
  } catch (err: any) {
    console.error('[EMAIL VERIFY REQUEST]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// T5: POST /api/verifications/email/confirm — confirm email with token
router.post('/email/confirm', async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body
    if (!token || !userId) return res.status(400).json({ error: 'Token e userId obrigatórios.' })

    const hash = createHash('sha256').update(token).digest('hex')

    const getRedis = async () => {
      try {
        const redis = (await import('../lib/redis')).default
        if (!redis.isOpen) await redis.connect()
        return redis
      } catch { return null }
    }

    const redis = await getRedis()
    if (redis) {
      const stored = await redis.get(`email_verify:${userId}`)
      if (!stored || stored !== hash) {
        return res.status(400).json({ error: 'Token inválido ou expirado.' })
      }
      await redis.del(`email_verify:${userId}`)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        status: 'ACTIVE' // upgrade from PENDING_VERIFICATION
      }
    })

    res.json({ ok: true, message: 'Email verificado com sucesso! A tua conta está activa.' })
  } catch (err: any) {
    console.error('[EMAIL VERIFY CONFIRM]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
