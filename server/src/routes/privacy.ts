import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

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
router.post('/block/:profileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    await prisma.profileAction.upsert({
      where: {
        actorProfileId_targetProfileId: {
          actorProfileId: myProfile.id,
          targetProfileId: req.params.profileId
        }
      },
      update: { action: 'BLOCK' },
      create: {
        actorProfileId: myProfile.id,
        targetProfileId: req.params.profileId,
        action: 'BLOCK'
      }
    })

    // End any active match
    await prisma.match.updateMany({
      where: {
        OR: [
          { profileOneId: myProfile.id, profileTwoId: req.params.profileId },
          { profileOneId: req.params.profileId, profileTwoId: myProfile.id }
        ]
      },
      data: { status: 'BLOCKED' }
    })

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
