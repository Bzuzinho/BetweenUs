import { Router, Response } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import { uploadFile, deleteFile } from '../lib/storage'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Multer: memory storage, max 10MB, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Apenas imagens são permitidas.'))
  }
})

// POST /api/photos — upload photo
router.post('/', requireAuth, upload.single('photo'),
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto obrigatória.' })

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { photos: true }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Max 6 photos per profile
    if (profile.photos.length >= 6) {
      return res.status(400).json({ error: 'Máximo de 6 fotos por perfil.' })
    }

    const visibilityLevel = (req.body.visibility as string) || 'BLURRED'
    const isPrimary = profile.photos.length === 0

    // Upload to storage
    const filename = `${profile.id}-${Date.now()}.${req.file.originalname.split('.').pop()}`
    const result = await uploadFile(req.file.buffer, filename, req.file.mimetype)

    const photo = await prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        storagePath: result.url,
        blurredPath: result.blurredUrl || result.url,
        visibilityLevel: visibilityLevel as any,
        moderationStatus: 'APPROVED', // auto-approve in dev; add moderation later
        isPrimary,
        sortOrder: profile.photos.length
      }
    })

    res.status(201).json(photo)
  } catch (err: any) {
    console.error('[PHOTO UPLOAD]', err.message)
    res.status(500).json({ error: err.message || 'Erro ao fazer upload.' })
  }
})

// GET /api/photos/me — get my photos
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } }
      }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    res.json({ photos: profile.photos })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/photos/:id — update photo visibility or set as primary
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({
      where: { id: req.params.id },
      include: { profile: true }
    })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    const { visibilityLevel, isPrimary } = req.body

    if (isPrimary) {
      // Remove primary from all others first
      await prisma.profilePhoto.updateMany({
        where: { profileId: photo.profileId },
        data: { isPrimary: false }
      })
    }

    const updated = await prisma.profilePhoto.update({
      where: { id: req.params.id },
      data: {
        ...(visibilityLevel && { visibilityLevel }),
        ...(isPrimary !== undefined && { isPrimary })
      }
    })

    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/photos/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({
      where: { id: req.params.id },
      include: { profile: true }
    })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    // Delete from storage
    const key = photo.storagePath.split('/').pop()
    if (key) await deleteFile(`photos/${key}`)

    await prisma.profilePhoto.delete({ where: { id: req.params.id } })

    // If deleted was primary, make first remaining photo primary
    if (photo.isPrimary) {
      const first = await prisma.profilePhoto.findFirst({
        where: { profileId: photo.profileId },
        orderBy: { sortOrder: 'asc' }
      })
      if (first) {
        await prisma.profilePhoto.update({
          where: { id: first.id },
          data: { isPrimary: true }
        })
      }
    }

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/photos/:id/request-access — request to see private photo
router.post('/:id/request-access', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({ where: { id: req.params.id } })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    // TODO: notify photo owner via WebSocket/notification
    res.json({ ok: true, message: 'Pedido de acesso enviado.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
