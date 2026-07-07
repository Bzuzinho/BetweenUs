import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createLikeOrMatch } from '../lib/matchService'
import { removeMember } from '../lib/profileMembershipService'

const CLIENT_URL = process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app'

const router = Router()

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { coupleDescription, partnerEmail } = req.body
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { coupleProfile: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })
    if (myProfile.coupleProfile) return res.status(409).json({ error: 'Já tens um perfil de casal.' })

    const inviteToken = uuidv4()
    const couple = await prisma.coupleProfile.create({
      data: {
        profileId: myProfile.id,
        partnerOneUserId: req.userId!,
        partnerTwoInviteEmail: partnerEmail || null,
        coupleDescription: coupleDescription || null,
        coupleInviteToken: inviteToken,
        coupleStatus: 'PENDING_PARTNER'
      }
    })
    await prisma.profile.update({ where: { id: myProfile.id }, data: { type: 'COUPLE' } })

    // Sprint 3: dual-write into the generalized ProfileMember model so
    // couple approvals can run through the same code path as future groups.
    await (prisma as any).profileMember.create({
      data: { profileId: myProfile.id, userId: req.userId!, isCreator: true, status: 'ACCEPTED' }
    }).catch((e: any) => console.error('[PROFILE MEMBER DUAL-WRITE]', e.message))
    if (partnerEmail) {
      await (prisma as any).profileMember.create({
        data: { profileId: myProfile.id, invitedEmail: partnerEmail, status: 'PENDING', inviteToken }
      }).catch((e: any) => console.error('[PROFILE MEMBER DUAL-WRITE]', e.message))
    }

    res.status(201).json({
      couple, inviteToken,
      inviteUrl: `${CLIENT_URL}/couple-invite/${inviteToken}`
    })
  } catch (err: any) {
    console.error('[COUPLE CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil de casal.' })
  }
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) return res.status(404).json({ error: 'Sem perfil de casal.' })
    res.json(profile.coupleProfile)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.post('/join/:token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const couple = await prisma.coupleProfile.findUnique({
      where: { coupleInviteToken: req.params.token }
    })
    if (!couple) return res.status(404).json({ error: 'Convite inválido ou expirado.' })
    if (couple.coupleStatus === 'ACTIVE') return res.status(409).json({ error: 'Convite já aceite.' })
    if (couple.partnerOneUserId === req.userId) return res.status(400).json({ error: 'Não podes aceitar o teu próprio convite.' })

    await prisma.coupleProfile.update({
      where: { id: couple.id },
      data: {
        partnerTwoUserId: req.userId,
        partnerTwoAcceptedAt: new Date(),
        coupleStatus: 'ACTIVE',
        coupleInviteToken: null
      }
    })

    // Sprint 3: mirror acceptance into ProfileMember
    await (prisma as any).profileMember.updateMany({
      where: { profileId: couple.profileId, inviteToken: req.params.token },
      data: { userId: req.userId, status: 'ACCEPTED', respondedAt: new Date(), inviteToken: null }
    }).catch((e: any) => console.error('[PROFILE MEMBER DUAL-WRITE]', e.message))

    res.json({ ok: true, message: 'Perfil de casal ativado! Ambos podem agora explorar juntos.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// Point 9: now delegates to the shared matchService instead of duplicating
// the like/match logic. Both partners liking independently still works the
// same way (each call registers a LIKE on the couple's shared profile),
// but the actual match-creation decision is centralized.
router.post('/like/:targetProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { coupleProfile: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (!myProfile.coupleProfile) return res.status(400).json({ error: 'Perfil de casal necessário.' })
    if (myProfile.coupleProfile.coupleStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'Perfil de casal não está ativo.' })
    }

    const result = await createLikeOrMatch(myProfile.id, req.params.targetProfileId)

    switch (result.kind) {
      case 'ERROR':
        return res.status(400).json({ error: result.message })
      case 'LIKE_RECORDED':
        return res.json({ ok: true, status: 'PENDING_PARTNER', message: 'Like registado. A aguardar interesse mútuo.' })
      case 'MATCH_PENDING_COUPLE_APPROVAL':
        return res.json({ ok: true, status: 'PENDING_COUPLE_APPROVAL', matchId: result.matchId,
          message: 'Interesse mútuo! Falta a aprovação de ambos os membros do casal.' })
      case 'MATCH_CREATED':
      case 'ALREADY_MATCHED':
        return res.json({ ok: true, status: 'MATCHED', matchId: result.matchId, message: 'É um match!' })
      default:
        return res.json({ ok: true, status: 'PENDING_PARTNER' })
    }
  } catch (err: any) {
    console.error('[COUPLE LIKE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.post('/matches/:matchId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.matchId } })
    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })

    const { getRequiredApproverUserIds } = await import('../lib/matchService')
    const requiredOne = await getRequiredApproverUserIds(match.profileOneId)
    const requiredTwo = await getRequiredApproverUserIds(match.profileTwoId)
    const requiredApprovers = [...new Set([...requiredOne, ...requiredTwo])]

    if (!requiredApprovers.includes(req.userId!)) {
      return res.status(403).json({ error: 'Não pertences a este match.' })
    }
    if (requiredOne.length <= 1 && requiredTwo.length <= 1) {
      return res.status(400).json({ error: 'Este match não envolve casal/grupo — nada para aprovar.' })
    }

    await prisma.coupleMatchApproval.upsert({
      where: { matchId_userId: { matchId: match.id, userId: req.userId! } },
      update: { approvedAt: new Date(), rejectedAt: null },
      create: { matchId: match.id, userId: req.userId!, approvedAt: new Date() }
    })

    const approvals = await prisma.coupleMatchApproval.findMany({
      where: { matchId: match.id, approvedAt: { not: null } }
    })
    const approvedUserIds = new Set(approvals.map(a => a.userId))
    const allApproved = requiredApprovers.every(uid => approvedUserIds.has(uid))

    if (allApproved) {
      await prisma.match.update({ where: { id: match.id }, data: { status: 'ACTIVE', matchedAt: new Date() } })
      const { notifyUser } = await import('../lib/notify')
      requiredApprovers
        .filter(uid => uid !== req.userId)
        .forEach(uid => notifyUser(uid, 'match', '💫 Match ativo!',
          'Todos aprovaram. Já podem conversar.', { matchId: match.id, tab: 'matches' }).catch(() => {}))
      return res.json({ ok: true, active: true, message: 'Todos aprovaram! Match ativo.' })
    }

    res.json({ ok: true, active: false, message: 'Aprovação registada. A aguardar restantes membros.' })
  } catch (err: any) {
    console.error('[COUPLE APPROVE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) return res.status(404).json({ error: 'Sem perfil de casal.' })
    const updated = await prisma.coupleProfile.update({
      where: { id: profile.coupleProfile.id },
      data: { coupleDescription: req.body.coupleDescription }
    })
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) return res.status(404).json({ error: 'Sem perfil de casal.' })
    await prisma.coupleProfile.update({ where: { id: profile.coupleProfile.id }, data: { coupleStatus: 'SEPARATED' } })
    await prisma.profile.update({ where: { id: profile.id }, data: { type: 'INDIVIDUAL' } })

    // 4.1 fix: this used to only flip CoupleProfile.coupleStatus, leaving
    // ProfileMember rows ACCEPTED — the two models disagreed about who
    // belonged to the profile after a separation. Remove both partners'
    // membership; the creator can re-add themselves if they set up a new
    // couple later (POST /api/couples writes a fresh ProfileMember anyway).
    const { partnerOneUserId, partnerTwoUserId } = profile.coupleProfile
    await removeMember(profile.id, partnerOneUserId)
    if (partnerTwoUserId) await removeMember(profile.id, partnerTwoUserId)

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
