import { Router, Response } from 'express'
import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { uploadPrivateFile, deleteFile } from '../lib/storage'
import { resolvePhotoForViewer, isStorageKey } from '../lib/mediaAccessService'
import { processImage, detectRealImageType } from '../lib/imageProcessing'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyAdmins } from '../lib/notify'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

// T7: rate limit photo uploads — max 10 uploads per 15 minutes per user
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: { error: 'Demasiados uploads. Tenta novamente em 15 minutos.' }
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Apenas imagens JPG, PNG ou WEBP são permitidas.'))
  }
})

// 3.1: pre-Sprint-3 photos store a public URL in storagePath/blurredPath
// (needs pathname extraction); photos uploaded through uploadPrivateFile()
// store the raw R2 key directly. Handle both so deletes work for old and
// new records without a backfill migration.
const extractKey = (value: string): string | null => {
  if (!value) return null
  if (isStorageKey(value)) return value
  try {
    return new URL(value).pathname.replace(/^\//, '') || null
  } catch {
    return null
  }
}

router.post('/', requireAuth, uploadLimiter, upload.single('photo'), async (req: AuthRequest, res: Response) => {
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

    // 3.1: both variants go through the private upload path — storagePath/
    // blurredPath now hold R2 object keys, not public URLs. They're only
    // ever exposed to callers as short-lived signed URLs (see GET /me and
    // the resolvePhotoForViewer usage in profiles.ts/discovery.ts).
    const [cleanResult, blurredResult] = await Promise.all([
      uploadPrivateFile(processed.clean, `${baseFilename}.jpg`, 'image/jpeg'),
      uploadPrivateFile(processed.blurred, `${baseFilename}-blurred.jpg`, 'image/jpeg')
    ])

    const moderationStatus = isProd ? 'PENDING' : 'APPROVED'

    const photo = await prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        storagePath: cleanResult.key,
        blurredPath: blurredResult.key,
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
      message: isProd ? 'Foto enviada para moderação. Ficará visível após aprovação.' : 'Foto adicionada.'
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

    // 3.1: owner always gets CLEAN — sign storagePath fresh on every read
    // instead of exposing the permanent (pre-Sprint-3) or private (post-
    // Sprint-3) storage value directly.
    const photos = await Promise.all(profile.photos.map(async photo => {
      const resolved = await resolvePhotoForViewer(photo, {
        ownerUserId: req.userId!,
        viewerUserId: req.userId!,
        viewerProfileId: profile.id
      })
      return { ...photo, storagePath: resolved?.url || photo.storagePath, blurredPath: undefined }
    }))

    res.json({ photos })
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
    if (isPrimary) await prisma.profilePhoto.updateMany({ where: { profileId: photo.profileId }, data: { isPrimary: false } })
    const updated = await prisma.profilePhoto.update({
      where: { id: req.params.id },
      data: { ...(visibilityLevel && { visibilityLevel }), ...(isPrimary !== undefined && { isPrimary }) }
    })
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// T9: delete removes BOTH storagePath AND blurredPath
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, include: { profile: true } })
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' })
    if (photo.profile.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão.' })

    const cleanKey = extractKey(photo.storagePath)
    if (cleanKey) await deleteFile(cleanKey).catch(e => console.error('[DELETE CLEAN]', e.message))

    if (photo.blurredPath) {
      const blurredKey = extractKey(photo.blurredPath)
      if (blurredKey) await deleteFile(blurredKey).catch(e => console.error('[DELETE BLURRED]', e.message))
    }

    await prisma.profilePhoto.delete({ where: { id: req.params.id } })

    if (photo.isPrimary) {
      const first = await prisma.profilePhoto.findFirst({ where: { profileId: photo.profileId }, orderBy: { sortOrder: 'asc' } })
      if (first) await prisma.profilePhoto.update({ where: { id: first.id }, data: { isPrimary: true } })
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.post('/:id/request-access', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, include: { profile: true } })
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
