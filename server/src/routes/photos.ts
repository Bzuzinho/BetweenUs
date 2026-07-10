import { Router, Response } from 'express'
import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import prisma from '../lib/prisma'
import { uploadPrivateFile, deleteFile } from '../lib/storage'
import { resolvePhotoForViewer, isStorageKey, PhotoRecord } from '../lib/mediaAccessService'
import { processImage, detectRealImageType } from '../lib/imageProcessing'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyAdmins } from '../lib/notify'
import { resolveMyProfileId, getActiveMembers } from '../lib/profileMembershipService'
import * as sharedMediaConsentService from '../lib/sharedMediaConsentService'
import { isPhaseCurrentlyRevoked } from '../lib/consentCheckService'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

// T7: rate limit photo uploads — max 10 uploads per 15 minutes per user
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 10,
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

    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const profile = await prisma.profile.findUnique({
      where: { id: profileId }, include: { photos: true }
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
    const meProfileId = await resolveMyProfileId(req.userId!)
    if (!meProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const profile = await prisma.profile.findUnique({
      where: { id: meProfileId },
      include: { photos: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // 3.1: owner always gets CLEAN — sign storagePath fresh on every read
    // instead of exposing the permanent (pre-Sprint-3) or private (post-
    // Sprint-3) storage value directly.
    const photos = await Promise.all(profile.photos.map(async (photo: PhotoRecord) => {
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
    // 6.8: any ACTIVE member of the profile (not just the historical
    // Profile.userId owner) can manage a shared couple/group photo's
    // metadata — matches how the rest of the couple's profile already works.
    const profileId = await resolveMyProfileId(req.userId!)
    if (profileId !== photo.profileId) return res.status(403).json({ error: 'Sem permissão.' })
    const { visibilityLevel, isPrimary, memberScope, depictedMemberIds } = req.body
    if (isPrimary) await prisma.profilePhoto.updateMany({ where: { profileId: photo.profileId }, data: { isPrimary: false } })

    // 6.8 — manual tagging only (no facial recognition): depictedMemberIds
    // must be a subset of the profile's own active members' userIds.
    let validatedDepicted: string[] | undefined
    if (memberScope === 'MULTIPLE_MEMBERS') {
      const activeMemberIds = (await getActiveMembers(photo.profileId)).map(m => m.userId)
      validatedDepicted = Array.isArray(depictedMemberIds) ? depictedMemberIds.filter((id: string) => activeMemberIds.includes(id)) : []
      if (validatedDepicted.length < 2) {
        return res.status(400).json({ error: 'MULTIPLE_MEMBERS requer pelo menos 2 membros identificados.' })
      }
    }

    const updated = await prisma.profilePhoto.update({
      where: { id: req.params.id },
      data: {
        ...(visibilityLevel && { visibilityLevel }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(memberScope && { memberScope: memberScope as any, depictedMemberIds: memberScope === 'MULTIPLE_MEMBERS' ? validatedDepicted : [] }),
      }
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
    const deleterProfileId = await resolveMyProfileId(req.userId!)
    if (deleterProfileId !== photo.profileId) return res.status(403).json({ error: 'Sem permissão.' })

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

    const requesterProfileId = await resolveMyProfileId(req.userId!)
    if (!requesterProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const requesterProfile = await prisma.profile.findUnique({ where: { id: requesterProfileId } })
    if (!requesterProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (requesterProfileId === photo.profileId) return res.status(400).json({ error: 'Não podes pedir acesso às tuas próprias fotos.' })

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
    if (!activeMatch) return res.status(403).json({ error: 'É necessário ter um match ativo com esta pessoa.' })

    // 8.5 — a revoked FACE_REVEAL consent check blocks future media
    // access requests on this match, per the spec's explicit example.
    // This does not touch photos already granted before the revocation —
    // only new/renewed access requests are denied.
    if (await isPhaseCurrentlyRevoked(activeMatch.id, 'FACE_REVEAL')) {
      return res.status(403).json({ error: 'O consentimento para revelar o rosto foi revogado neste match.' })
    }

    // 6.8 — a photo depicting more than one member (MULTIPLE_MEMBERS/
    // SHARED_PROFILE) always requires that specific set of people to
    // explicitly consent, regardless of visibilityLevel's normal
    // PRIVATE_AFTER_MATCH auto-approve shortcut. Auto-approving on match
    // was fine when only the uploading member's own image was at stake;
    // it's wrong the moment a partner or fellow group member is also
    // depicted and hasn't had any say.
    // BETA.2 (FASE C) — PhotoAccessRequest.ownerId is required, but a
    // Shared Profile's Profile.userId is now null (see schema.prisma).
    // Before this sprint, a Shared Profile's userId was always the
    // creator (only the creator ever held that slot), so falling back to
    // the profile's creator here reproduces the exact same owner identity
    // as before — not a behavior change, just resolving it through
    // ProfileMember now that userId can't answer it directly.
    const ownerId = photo.profile.userId
      || (await getActiveMembers(photo.profileId)).find(m => m.isCreator)?.userId
      || req.userId!

    if (photo.visibilityLevel === 'PRIVATE_AFTER_MATCH' && photo.memberScope === 'SINGLE_MEMBER') {
      const existing = await prisma.photoAccessRequest.upsert({
        where: { photoId_requesterId: { photoId: photo.id, requesterId: req.userId! } },
        update: { status: 'APPROVED', respondedAt: new Date() },
        create: { photoId: photo.id, requesterId: req.userId!, ownerId, status: 'APPROVED', respondedAt: new Date() }
      })
      return res.json({ ok: true, status: 'APPROVED', request: existing })
    }

    const request = await prisma.photoAccessRequest.upsert({
      where: { photoId_requesterId: { photoId: photo.id, requesterId: req.userId! } },
      update: { status: 'PENDING', respondedAt: null },
      create: { photoId: photo.id, requesterId: req.userId!, ownerId, status: 'PENDING' }
    })
    res.json({ ok: true, status: 'PENDING', request })
  } catch (err: any) {
    console.error('[PHOTO ACCESS REQUEST]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/photos/access-requests/incoming — pending requests the caller
// can act on. For a SINGLE_MEMBER photo, that's any active member of the
// owning profile (mirrors the rest of Sprint 6: the couple's second
// member isn't locked out). For MULTIPLE_MEMBERS/SHARED_PROFILE, only the
// specific depicted/shared members are required approvers.
router.get('/access-requests/incoming', requireAuth, async (req: AuthRequest, res: Response) => {
  const myProfileId = await resolveMyProfileId(req.userId!)
  const pending = await prisma.photoAccessRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { photo: { select: { id: true, storagePath: true, profileId: true, memberScope: true, depictedMemberIds: true } } }
  })
  const mine = await Promise.all(pending.map(async (r: any) => {
    if (r.photo.memberScope === 'SINGLE_MEMBER') {
      return r.photo.profileId === myProfileId ? r : null
    }
    return (await sharedMediaConsentService.isRequiredApprover(r.photo, req.userId!)) ? r : null
  }))
  res.json({ requests: mine.filter(Boolean) })
})

router.put('/access-requests/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status } = req.body
  if (!['APPROVED', 'DECLINED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
  const request = await prisma.photoAccessRequest.findUnique({ where: { id: req.params.id }, include: { photo: true } })
  if (!request) return res.status(404).json({ error: 'Pedido não encontrado.' })

  const photo = request.photo as any

  // 11.1/11.5.6 — PHOTO_ACCESS_GRANTED, only fired the moment a request
  // actually TRANSITIONS INTO APPROVED (never on DECLINED, never re-fired
  // if the request was already APPROVED before this call — `wasAlready
  // Approved` below, captured from the `request` row fetched at the top
  // of this handler, BEFORE either the SINGLE_MEMBER update or the shared-
  // media recordApproval call that follows). Owner is the actor (they
  // extended access), the requester is the target — reflects positively
  // on the person who was trusted enough to be granted access.
  const wasAlreadyApproved = request.status === 'APPROVED'
  const maybeRecordGrantSignal = async (finalStatus: string) => {
    if (finalStatus !== 'APPROVED' || wasAlreadyApproved) return
    try {
      const requesterProfileId = await resolveMyProfileId(request.requesterId)
      if (requesterProfileId) {
        const { recordSignal } = await import('../lib/recommendationSignalService')
        recordSignal(photo.profileId, requesterProfileId, 'PHOTO_ACCESS_GRANTED', { photoId: photo.id }).catch(() => {})
      }
    } catch { /* best-effort */ }
  }

  if (photo.memberScope === 'SINGLE_MEMBER') {
    const myProfileId = await resolveMyProfileId(req.userId!)
    if (myProfileId !== photo.profileId) return res.status(403).json({ error: 'Sem permissão.' })
    const updated = await prisma.photoAccessRequest.update({ where: { id: req.params.id }, data: { status, respondedAt: new Date() } })
    maybeRecordGrantSignal(status)
    return res.json({ ok: true, request: updated })
  }

  // 6.8 — shared media: each required approver's decision is recorded
  // individually; the request only flips to APPROVED once every depicted/
  // shared member has said yes, and DECLINED the instant any one of them
  // says no (see sharedMediaConsentService's doc comment for why this is
  // a veto model rather than majority).
  const result = await sharedMediaConsentService.recordApproval(req.params.id, req.userId!, status)
  if (!result.ok) return res.status(403).json({ error: result.error })
  const updated = await prisma.photoAccessRequest.findUnique({ where: { id: req.params.id } })
  if (result.finalStatus) maybeRecordGrantSignal(result.finalStatus)
  res.json({ ok: true, request: updated, finalStatus: result.finalStatus })
})

router.put('/access-requests/:id/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  const request = await prisma.photoAccessRequest.findUnique({ where: { id: req.params.id }, include: { photo: true } })
  if (!request) return res.status(404).json({ error: 'Pedido não encontrado.' })
  const photo = request.photo as any
  const myProfileId = await resolveMyProfileId(req.userId!)
  if (myProfileId !== photo.profileId) return res.status(403).json({ error: 'Sem permissão.' })
  const updated = await prisma.photoAccessRequest.update({ where: { id: req.params.id }, data: { status: 'REVOKED', respondedAt: new Date() } })
  res.json({ ok: true, request: updated })
})

export default router
