import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId } from '../lib/profileMembershipService'

const router = Router()

// GET /api/privacy — get my privacy settings
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { privacySettings: true }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    res.json(profile.privacySettings || {})
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/privacy — update privacy settings
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
    const isPremium = sub && sub.plan !== 'FREE'

    const { invisibleMode, showDistance, showOnlineStatus,
            allowPhotoRequests, notificationMode } = req.body

    if (invisibleMode && !isPremium) {
      return res.status(403).json({
        error: 'Modo Invisível requer Premium.',
        code: 'PREMIUM_REQUIRED'
      })
    }

    const settings = await prisma.privacySettings.upsert({
      where: { profileId: profile.id },
      update: {
        ...(invisibleMode !== undefined && { invisibleMode }),
        ...(showDistance !== undefined && { showDistance }),
        ...(showOnlineStatus !== undefined && { showOnlineStatus }),
        ...(allowPhotoRequests !== undefined && { allowPhotoRequests }),
        ...(notificationMode && { notificationMode })
      },
      create: {
        profileId: profile.id,
        invisibleMode: invisibleMode || false,
        showDistance: showDistance !== false,
        showOnlineStatus: showOnlineStatus || false,
        allowPhotoRequests: allowPhotoRequests !== false,
        notificationMode: notificationMode || 'DISCREET'
      }
    })

    // Update profile visibility
    if (invisibleMode !== undefined) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { visibilityMode: invisibleMode ? 'INVISIBLE' : 'PUBLIC' }
      })
    }

    res.json(settings)
  } catch (err: any) {
    console.error('[PRIVACY ERROR]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/privacy/block/:profileId — block a profile
// 9.3 — delegates entirely to BlockService, which now also handles
// shared Private Rooms (safety-lock a 2-person room, or have the blocker
// leave a 3+-person room) on top of what this route already did (the
// ProfileAction row + ending any active match). The target is never
// notified.
router.post('/block/:profileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // 7.11 — Safe Exit's "Block user/profile" action must work for a
    // couple/group's non-creator member too, same bug class fixed across
    // Sprint 6/7 elsewhere (Profile.userId-only lookup silently excluded them).
    const myProfileId = await resolveMyProfileId(req.userId!)
    const myProfile = myProfileId ? await prisma.profile.findUnique({ where: { id: myProfileId } }) : null
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const { blockProfile } = await import('../lib/blockService')
    await blockProfile(myProfile.id, req.params.profileId)

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
