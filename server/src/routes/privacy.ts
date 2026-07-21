import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import { hasEntitlement } from '../lib/subscriptionEntitlementService'

const router = Router()

// GET /api/privacy — get my privacy settings
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { privacySettings: true }
    })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    let settings = profile.privacySettings

    // Closed-beta launch fix: legacy/new rows were created with
    // visibleInDiscovery=false even though the product expects an approved
    // profile to participate in Discovery by default. Only self-heal an
    // untouched default row; a user who deliberately switches Discovery off
    // has a later updatedAt and is never overridden here.
    if (settings && profile.status === 'APPROVED' && !settings.visibleInDiscovery && !settings.invisibleMode) {
      const createdAt = (settings as any).createdAt instanceof Date ? (settings as any).createdAt.getTime() : 0
      const updatedAt = (settings as any).updatedAt instanceof Date ? (settings as any).updatedAt.getTime() : 0
      const untouchedDefault = createdAt > 0 && updatedAt > 0 && Math.abs(updatedAt - createdAt) < 5000

      if (untouchedDefault) {
        settings = await prisma.privacySettings.update({
          where: { profileId },
          data: { visibleInDiscovery: true }
        })
      }
    }

    res.json(settings || {})
  } catch (err: any) {
    console.error('[PRIVACY GET ERROR]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/privacy — update privacy settings
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const profile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const canUseInvisible = await hasEntitlement(req.userId!, 'INVISIBLE_MODE', profileId)

    const {
      visibleInDiscovery,
      invisibleMode,
      showDistance,
      showOnlineStatus,
      allowPhotoRequests,
      notificationMode,
    } = req.body

    if (invisibleMode && !canUseInvisible) {
      return res.status(403).json({
        error: 'Modo Invisível requer Premium.',
        code: 'PREMIUM_REQUIRED'
      })
    }

    const settings = await prisma.privacySettings.upsert({
      where: { profileId: profile.id },
      update: {
        ...(visibleInDiscovery !== undefined && { visibleInDiscovery: Boolean(visibleInDiscovery) }),
        ...(invisibleMode !== undefined && { invisibleMode: Boolean(invisibleMode) }),
        ...(showDistance !== undefined && { showDistance: Boolean(showDistance) }),
        ...(showOnlineStatus !== undefined && { showOnlineStatus: Boolean(showOnlineStatus) }),
        ...(allowPhotoRequests !== undefined && { allowPhotoRequests: Boolean(allowPhotoRequests) }),
        ...(notificationMode && { notificationMode })
      },
      create: {
        profileId: profile.id,
        visibleInDiscovery: visibleInDiscovery !== false,
        invisibleMode: Boolean(invisibleMode),
        showDistance: showDistance !== false,
        showOnlineStatus: showOnlineStatus !== false,
        allowPhotoRequests: allowPhotoRequests !== false,
        notificationMode: notificationMode || 'DISCREET'
      }
    })

    // Keep Profile.visibilityMode and PrivacySettings coherent. Discovery
    // visibility is independent from Premium invisible browsing, so changing
    // visibleInDiscovery must never be silently discarded.
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
