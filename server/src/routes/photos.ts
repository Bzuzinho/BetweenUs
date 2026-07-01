import { Router, Response } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import { uploadFile, deleteFile } from '../lib/storage'
import { processImage, detectRealImageType } from '../lib/imageProcessing'
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

// Extract storage key from a public URL
const extractKey = (url: string): string | null => {
  try {
    const u = new URL(url)
    // Strip leading slash
    return u.pathname.replace(/^\//, '') || null
  } catch {
    return null
  }
}

router.post('/', requireAuth, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto obrigatória.' })

    const realType = await detectRealImageType(req.file.buffer)
    if (!realType) {
      return res.status(400).json({ error: 'O ficheiro enviado não é uma imagem válida.' })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { photos: true }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (profile.photos.length >= 6) return res.status(400).json({ error: 'Máximo de 6 fotos.' })

    let processed
    try {
      processed = await processImage(req.file.buffer)
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Não foi possível processar a imagem.' })
    }

    const visibilityLevel = (req.body.visibility as string) || 'BLURRED'
    const isPrimary = profile.photos.length === 0
    const baseFilename = `${profile.id}-${Date.now()}`

    const [cleanResult, blurredResult] = await Promise.all([
      uploadFile(processed.clean, `${baseFilename}.jpg`, 'image/jpeg'),
      uploadFile(processed.blurred, `${baseFilename}-blurred.jpg`, 'image/jpeg')
    ])

    const moderationStatus = isProd ? 'PENDING' : 'APPROVED'

    const photo = await prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        storagePath: cleanResult.url,
        blurredPath: blurredResult.url,
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
    const photo = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, include: { profile: true } })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
    const { visibilityLevel, isPrimary } = req.body
    if (isPrimary) {
      await prisma.profilePhoto.updateMany({ where: { profileId: photo.profileId }, data: { isPrimary: false } })
    }
    const updated = await prisma.profilePhoto.update({
      where: { id: req.params.id },
      data: { ...(visibilityLevel && { visibilityLevel }), ...(isPrimary !== undefined && { isPrimary }) }
    })
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// T9: delete removes BOTH storagePath AND blurredPath from R2
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, include: { profile: true } })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })

    // T9: delete clean version
    const cleanKey = extractKey(photo.storagePath)
    if (cleanKey) await deleteFile(cleanKey).catch(e => console.error('[DELETE CLEAN]', e.message))

    // T9: delete blurred version too — previously was being left behind
    if (photo.blurredPath) {
      const blurredKey = extractKey(photo.blurredPath)
      if (blurredKey) await deleteFile(blurredKey).catch(e => console.error('[DELETE BLURRED]', e.message))
    }

    await prisma.profilePhoto.delete({ where: { id: req.params.id } })

    if (photo.isPrimary) {
      const first = await prisma.profilePhoto.findFirst({
        where: { profileId: photo.profileId },
        orderBy: { sortOrder: 'asc' }
      })
      if (first) await prisma.profilePhoto.update({ where: { id: first.id }, data: { isPrimary: true } })
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// Photo access request endpoints (unchanged from previous implementation)
router.post('/:id/request-access', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({
      where: { id: req.params.id }, include: { profile: true }
    })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })

    const requesterProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!requesterProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (photo.profile.userId === req.userId) return res.status(400).json({ error: 'Não podes pedir acesso às tuas próprias fotos.' })

    if (!['PRIVATE_AFTER_MATCH', 'PRIVATE_AFTER_APPROVAL'].includes(photo.visibilityLevel)) {
      return res.status(400).json({ error: 'Esta foto não requer pedido de acesso.' })
    }

    const activeMatch = await prisma.match.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { profileOneId: requesterProfile.id, profileTwoId: photo.profileId },
          { profileOneId: photo.profileId, profileTwoId: requesterProfile.id }
        ]
      }
    })
    if (!activeMatch) return res.status(403).json({ error: 'É necessário ter um match activo com esta pessoa.' })

    if (photo.visibilityLevel === 'PRIVATE_AFTER_MATCH') {
      const existing = await prisma.photoAccessRequest.upsert({
        where: { photoId_requesterId: { photoId: photo.id, requesterId: req.userId! } },
        update: { status: 'APPROVED', respondedAt: new Date() },
        create: { photoId: photo.id, requesterId: req.userId!, ownerId: photo.profile.userId, status: 'APPROVED', respondedAt: new Date() }
      })
      return res.json({ ok: true, status: 'APPROVED', request: existing })
    }

    const request = await prisma.photoAccessRequest.upsert({
      where: { photoId_requesterId: { photoId: photo.id, requesterId: req.userId! } },
      update: { status: 'PENDING', respondedAt: null },
      create: { photoId: photo.id, requesterId: req.userId!, ownerId: photo.profile.userId, status: 'PENDING' }
    })
    res.json({ ok: true, status: 'PENDING', request })
  } catch (err: any) {
    console.error('[PHOTO ACCESS REQUEST]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.get('/access-requests/incoming', requireAuth, async (req: AuthRequest, res: Response) => {
  const requests = await prisma.photoAccessRequest.findMany({
    where: { ownerId: req.userId!, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { photo: { select: { id: true, storagePath: true } } }
  })
  res.json({ requests })
})

router.put('/access-requests/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status } = req.body
  if (!['APPROVED', 'DECLINED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
  const request = await prisma.photoAccessRequest.findUnique({ where: { id: req.params.id } })
  if (!request) return res.status(404).json({ error: 'Pedido não encontrado.' })
  if (request.ownerId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
  const updated = await prisma.photoAccessRequest.update({ where: { id: req.params.id }, data: { status, respondedAt: new Date() } })
  res.json({ ok: true, request: updated })
})

router.put('/access-requests/:id/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  const request = await prisma.photoAccessRequest.findUnique({ where: { id: req.params.id } })
  if (!request) return res.status(404).json({ error: 'Pedido não encontrado.' })
  if (request.ownerId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })
  const updated = await prisma.photoAccessRequest.update({ where: { id: req.params.id }, data: { status: 'REVOKED', respondedAt: new Date() } })
  res.json({ ok: true, request: updated })
})

export default router
