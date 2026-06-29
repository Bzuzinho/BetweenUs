import { Router, Response } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import { uploadFile } from '../lib/storage'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Apenas imagens são permitidas.'))
  }
})

// GET /api/verifications/me — get my verification status
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const verification = await prisma.verification.findUnique({
      where: { userId: req.userId! }
    })
    res.json(verification || { status: 'NONE' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/verifications/submit — submit selfie for verification
router.post('/submit', requireAuth, upload.single('selfie'),
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Selfie obrigatória.' })

    // Check if already pending or approved
    const existing = await prisma.verification.findUnique({
      where: { userId: req.userId! }
    })
    if (existing?.status === 'APPROVED') {
      return res.status(409).json({ error: 'Perfil já verificado.' })
    }
    if (existing?.status === 'PENDING') {
      return res.status(409).json({ error: 'Verificação já em curso. Aguarda a revisão.' })
    }

    // Upload selfie to storage (stored privately — not public)
    const filename = `verify-${req.userId}-${Date.now()}.jpg`
    const result = await uploadFile(req.file.buffer, `verifications/${filename}`,
      req.file.mimetype)

    const verification = await prisma.verification.upsert({
      where: { userId: req.userId! },
      update: {
        status: 'PENDING',
        type: 'selfie',
        reviewedAt: null,
        expiresAt: null
      },
      create: {
        userId: req.userId!,
        type: 'selfie',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    })

    // Auto-approve in dev mode (no storage configured)
    if (!process.env.STORAGE_ENDPOINT) {
      await prisma.verification.update({
        where: { userId: req.userId! },
        data: { status: 'APPROVED', reviewedAt: new Date() }
      })
      return res.json({
        ok: true,
        status: 'APPROVED',
        message: 'Perfil verificado automaticamente (modo dev).'
      })
    }

    res.json({
      ok: true,
      status: 'PENDING',
      message: 'Selfie enviada. A equipa irá rever em até 24 horas.'
    })
  } catch (err: any) {
    console.error('[VERIFICATION]', err.message)
    res.status(500).json({ error: 'Erro ao submeter verificação.' })
  }
})

// ─── ADMIN: review verifications ─────────────────────────────────────────────
router.get('/pending', requireAuth, async (req: AuthRequest, res: Response) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user || !adminEmails.includes(user.email)) {
    return res.status(403).json({ error: 'Sem permissão.' })
  }

  const verifications = await prisma.verification.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { email: true,
      profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: 'asc' }
  })
  res.json({ verifications })
})

router.put('/:userId/review', requireAuth, async (req: AuthRequest, res: Response) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  const admin = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!admin || !adminEmails.includes(admin.email)) {
    return res.status(403).json({ error: 'Sem permissão.' })
  }

  const { status } = req.body // APPROVED | REJECTED
  if (!['APPROVED','REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' })
  }

  await prisma.verification.update({
    where: { userId: req.params.userId },
    data: { status, reviewedAt: new Date() }
  })

  res.json({ ok: true })
})

export default router
