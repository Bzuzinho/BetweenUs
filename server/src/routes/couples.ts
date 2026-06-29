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
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })
    if (myProfile.coupleProfile) {
      return res.status(409).json({ error: 'Já tens um perfil de casal.' })
    }

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

    // Update profile type
    await prisma.profile.update({
      where: { id: myProfile.id },
      data: { type: 'COUPLE' }
    })

    res.status(201).json({
      couple,
      inviteToken,
      inviteUrl: `${process.env.CLIENT_URL}/couple-invite/${inviteToken}`
    })
  } catch (err: any) {
    console.error('[COUPLE CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil de casal.' })
  }
})

// GET /api/couples/me — get my couple profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) {
      return res.status(404).json({ error: 'Sem perfil de casal.' })
    }
    res.json(profile.coupleProfile)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/couples/join/:token — parceiro aceita convite
router.post('/join/:token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const couple = await prisma.coupleProfile.findUnique({
      where: { coupleInviteToken: req.params.token },
      include: { profile: true }
    })

    if (!couple) return res.status(404).json({ error: 'Convite inválido ou expirado.' })
    if (couple.coupleStatus === 'ACTIVE') {
      return res.status(409).json({ error: 'Este convite já foi aceite.' })
    }
    if (couple.partnerOneUserId === req.userId) {
      return res.status(400).json({ error: 'Não podes aceitar o teu próprio convite.' })
    }

    // Activate couple
    await prisma.coupleProfile.update({
      where: { id: couple.id },
      data: {
        partnerTwoUserId: req.userId,
        partnerTwoAcceptedAt: new Date(),
        coupleStatus: 'ACTIVE',
        coupleInviteToken: null // invalidate token
      }
    })

    res.json({
      ok: true,
      message: 'Perfil de casal ativado! Ambos podem agora explorar juntos.'
    })
  } catch (err: any) {
    console.error('[COUPLE JOIN]', err.message)
    res.status(500).json({ error: 'Erro ao aceitar convite.' })
  }
})

// POST /api/couples/matches/:matchId/approve — Double Consent Match
router.post('/matches/:matchId/approve', requireAuth,
  async (req: AuthRequest, res: Response) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: {
        profileOne: { include: { coupleProfile: true } },
        profileTwo: { include: { coupleProfile: true } },
        approvals: true
      }
    })
    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })

    // Register approval
    await prisma.coupleMatchApproval.upsert({
      where: { matchId_userId: { matchId: match.id, userId: req.userId! } },
      update: { approvedAt: new Date(), rejectedAt: null },
      create: { matchId: match.id, userId: req.userId!, approvedAt: new Date() }
    })

    // Check if both members approved
    const approvals = await prisma.coupleMatchApproval.findMany({
      where: { matchId: match.id, approvedAt: { not: null } }
    })

    // Get couple members for this match
    const couple = match.profileOne.coupleProfile || match.profileTwo.coupleProfile
    const bothApproved = couple
      ? approvals.length >= 2
      : approvals.length >= 1

    if (bothApproved) {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'ACTIVE', matchedAt: new Date() }
      })
      return res.json({ ok: true, active: true,
        message: 'Ambos aprovaram! O match está ativo.' })
    }

    res.json({ ok: true, active: false,
      message: 'A tua aprovação foi registada. A aguardar o/a parceiro/a.' })
  } catch (err: any) {
    console.error('[COUPLE APPROVE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/couples/me — update couple description
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) {
      return res.status(404).json({ error: 'Sem perfil de casal.' })
    }
    const updated = await prisma.coupleProfile.update({
      where: { id: profile.coupleProfile.id },
      data: { coupleDescription: req.body.coupleDescription }
    })
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/couples/me — dissolve couple
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) {
      return res.status(404).json({ error: 'Sem perfil de casal.' })
    }
    await prisma.coupleProfile.update({
      where: { id: profile.coupleProfile.id },
      data: { coupleStatus: 'SEPARATED' }
    })
    await prisma.profile.update({
      where: { id: profile.id },
      data: { type: 'INDIVIDUAL' }
    })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
