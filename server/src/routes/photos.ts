import { Router, Response } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import { uploadFile, deleteFile } from '../lib/storage'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const isProd = process.env.NODE_ENV === 'production'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Apenas imagens JPG, PNG ou WEBP são permitidas.'))
  }
})

router.post('/', requireAuth, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto obrigatória.' })

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { photos: true }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (profile.photos.length >= 6) return res.status(400).json({ error: 'Máximo de 6 fotos.' })

    const visibilityLevel = (req.body.visibility as string) || 'BLURRED'
    const isPrimary = profile.photos.length === 0
    const filename = `${profile.id}-${Date.now()}.${req.file.originalname.split('.').pop()}`
    const result = await uploadFile(req.file.buffer, filename, req.file.mimetype)

    // A.2: PENDING in production, APPROVED in dev for easier testing
    const moderationStatus = isProd ? 'PENDING' : 'APPROVED'

    const photo = await prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        storagePath: result.url,
        blurredPath: result.blurredUrl || result.url,
        visibilityLevel: visibilityLevel as any,
        moderationStatus: moderationStatus as any,
        isPrimary,
        sortOrder: profile.photos.length,
        exifStripped: true
      }
    })

    res.status(201).json({
      ...photo,
      pendingReview: isProd,
      message: isProd
        ? 'Foto enviada para moderação. Ficará visível após aprovação.'
        : 'Foto adicionada.'
    })
  } catch (err: any) {
    console.error('[PHOTO UPLOAD]', err.message)
    res.status(500).json({ error: err.message || 'Erro ao fazer upload.' })
  }
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { photos: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    res.json({ photos: profile.photos })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({
      where: { id: req.params.id }, include: { profile: true }
    })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
    const { visibilityLevel, isPrimary } = req.body
    if (isPrimary) {
      await prisma.profilePhoto.updateMany({
        where: { profileId: photo.profileId }, data: { isPrimary: false }
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

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({
      where: { id: req.params.id }, include: { profile: true }
    })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
    const key = photo.storagePath.split('/').pop()
    if (key) await deleteFile(`photos/${key}`)
    await prisma.profilePhoto.delete({ where: { id: req.params.id } })
    if (photo.isPrimary) {
      const first = await prisma.profilePhoto.findFirst({
        where: { profileId: photo.profileId }, orderBy: { sortOrder: 'asc' }
      })
      if (first) await prisma.profilePhoto.update({ where: { id: first.id }, data: { isPrimary: true } })
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.post('/:id/request-access', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({ ok: true, message: 'Pedido de acesso enviado.' })
})

export default router
