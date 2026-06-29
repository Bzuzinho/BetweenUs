import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/couples — criar perfil de casal
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

    res.status(201).json({
      couple, inviteToken,
      inviteUrl: `${process.env.CLIENT_URL}/couple-invite/${inviteToken}`
    })
  } catch (err: any) {
    console.error('[COUPLE CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil de casal.' })
  }
})

// GET /api/couples/me
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

// POST /api/couples/join/:token
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
    res.json({ ok: true, message: 'Perfil de casal ativado! Ambos podem agora explorar juntos.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// B.4 — POST /api/couples/like/:targetProfileId
// Casal dá like — cria pedido de aprovação interna
router.post('/like/:targetProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (!myProfile.coupleProfile) return res.status(400).json({ error: 'Perfil de casal necessário.' })

    const couple = myProfile.coupleProfile
    if (couple.coupleStatus !== 'ACTIVE') return res.status(400).json({ error: 'Perfil de casal não está ativo.' })

    // Register like from this member
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: myProfile.id, targetProfileId: req.params.targetProfileId } },
      update: { action: 'LIKE' },
      create: { actorProfileId: myProfile.id, targetProfileId: req.params.targetProfileId, action: 'LIKE' }
    })

    // Check if partner also liked (both must approve)
    const partnerUserId = couple.partnerOneUserId === req.userId
      ? couple.partnerTwoUserId
      : couple.partnerOneUserId

    if (!partnerUserId) {
      return res.json({ ok: true, status: 'PENDING_PARTNER', message: 'Like registado. A aguardar aprovação do/a parceiro/a.' })
    }

    const partnerProfile = await prisma.profile.findUnique({ where: { userId: partnerUserId } })
    const partnerLiked = partnerProfile ? await prisma.profileAction.findFirst({
      where: { actorProfileId: partnerProfile.id, targetProfileId: req.params.targetProfileId, action: 'LIKE' }
    }) : null

    if (partnerLiked) {
      // Both approved — check for mutual match
      const theirLike = await prisma.profileAction.findFirst({
        where: { actorProfileId: req.params.targetProfileId, targetProfileId: myProfile.id, action: 'LIKE' }
      })
      if (theirLike) {
        const existing = await prisma.match.findFirst({
          where: { OR: [
            { profileOneId: myProfile.id, profileTwoId: req.params.targetProfileId },
            { profileOneId: req.params.targetProfileId, profileTwoId: myProfile.id }
          ]}
        })
        if (!existing) {
          const match = await prisma.match.create({
            data: {
              profileOneId: myProfile.id, profileTwoId: req.params.targetProfileId,
              status: 'ACTIVE', matchedAt: new Date(),
              conversation: { create: { type: 'COUPLE_GROUP' } }
            }
          })
          return res.json({ ok: true, status: 'MATCHED', matchId: match.id, message: 'É um match! Ambos aprovaram.' })
        }
      }
      return res.json({ ok: true, status: 'BOTH_APPROVED', message: 'Ambos aprovaram. A aguardar interesse mútuo.' })
    }

    res.json({ ok: true, status: 'PENDING_PARTNER', message: 'Like registado. A aguardar aprovação do/a parceiro/a.' })
  } catch (err: any) {
    console.error('[COUPLE LIKE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/couples/matches/:matchId/approve — Double Consent Match
router.post('/matches/:matchId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: { approvals: true }
    })
    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })

    await prisma.coupleMatchApproval.upsert({
      where: { matchId_userId: { matchId: match.id, userId: req.userId! } },
      update: { approvedAt: new Date(), rejectedAt: null },
      create: { matchId: match.id, userId: req.userId!, approvedAt: new Date() }
    })

    const approvals = await prisma.coupleMatchApproval.findMany({
      where: { matchId: match.id, approvedAt: { not: null } }
    })

    if (approvals.length >= 2) {
      await prisma.match.update({ where: { id: match.id }, data: { status: 'ACTIVE', matchedAt: new Date() } })
      return res.json({ ok: true, active: true, message: 'Ambos aprovaram! Match ativo.' })
    }

    res.json({ ok: true, active: false, message: 'Aprovação registada. A aguardar o/a parceiro/a.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/couples/me
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

// DELETE /api/couples/me
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! }, include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) return res.status(404).json({ error: 'Sem perfil de casal.' })
    await prisma.coupleProfile.update({ where: { id: profile.coupleProfile.id }, data: { coupleStatus: 'SEPARATED' } })
    await prisma.profile.update({ where: { id: profile.id }, data: { type: 'INDIVIDUAL' } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
