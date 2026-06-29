import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Ativar COUPLE_PREMIUM para ambos os parceiros de um casal
async function activateCoupleSubscription(couple: any, initiatorUserId: string) {
  const partnerUserId = couple.partnerOneUserId === initiatorUserId
    ? couple.partnerTwoUserId
    : couple.partnerOneUserId

  if (!partnerUserId) return

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Ativar subscrição do parceiro (gratuito — pago pelo iniciador)
  await prisma.subscription.upsert({
    where: { userId: partnerUserId },
    update: {
      plan: 'COUPLE_PREMIUM',
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
      currentPeriodStart: new Date()
    },
    create: {
      userId: partnerUserId,
      plan: 'COUPLE_PREMIUM',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd
    }
  })
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/couples/search?q= — procurar perfis para vincular como casal
router.get('/search', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query
    if (!q || String(q).length < 2) {
      return res.status(400).json({ error: 'Mínimo 2 caracteres.' })
    }

    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const profiles = await prisma.profile.findMany({
      where: {
        displayName: { contains: String(q), mode: 'insensitive' },
        id: { not: myProfile.id },
        status: 'active',
        userId: { not: req.userId! },
        // Só perfis sem casal ativo
        coupleProfile: null
      },
      select: {
        id: true,
        displayName: true,
        city: true,
        type: true,
        photos: {
          where: { moderationStatus: 'APPROVED', isPrimary: true },
          take: 1,
          select: { storagePath: true, visibilityLevel: true }
        }
      },
      take: 10
    })

    res.json({ profiles })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/couples — criar/iniciar vínculo de casal
// Aceita: { partnerProfileId } para vincular perfil existente
//      ou { partnerEmail } para convidar por email (fluxo antigo)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { coupleDescription, partnerEmail, partnerProfileId } = req.body

    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })
    if (myProfile.coupleProfile && myProfile.coupleProfile.coupleStatus === 'ACTIVE') {
      return res.status(409).json({ error: 'Já tens um perfil de casal ativo.' })
    }

    // Modo 1: vincular perfil existente por ID
    if (partnerProfileId) {
      const partnerProfile = await prisma.profile.findUnique({
        where: { id: partnerProfileId },
        include: { coupleProfile: true, user: { select: { id: true } } }
      })

      if (!partnerProfile) {
        return res.status(404).json({ error: 'Perfil do parceiro não encontrado.' })
      }
      if (partnerProfile.coupleProfile?.coupleStatus === 'ACTIVE') {
        return res.status(409).json({ error: 'Este perfil já tem um casal ativo.' })
      }

      const inviteToken = uuidv4()

      // Apagar casal anterior se existir (estava SEPARATED ou PENDING)
      if (myProfile.coupleProfile) {
        await prisma.coupleProfile.delete({ where: { id: myProfile.coupleProfile.id } })
      }

      const couple = await prisma.coupleProfile.create({
        data: {
          profileId: myProfile.id,
          partnerOneUserId: req.userId!,
          partnerTwoUserId: partnerProfile.user.id,
          coupleDescription: coupleDescription || null,
          coupleInviteToken: inviteToken,
          coupleStatus: 'PENDING_PARTNER' // aguarda aceitação do parceiro
        }
      })

      await prisma.profile.update({
        where: { id: myProfile.id },
        data: { type: 'COUPLE' }
      })

      return res.status(201).json({
        couple,
        inviteToken,
        partnerName: partnerProfile.displayName,
        message: `Pedido enviado a ${partnerProfile.displayName}. Aguarda a sua aceitação.`
      })
    }

    // Modo 2: convidar por email (perfil ainda não existe na plataforma)
    const inviteToken = uuidv4()

    if (myProfile.coupleProfile) {
      await prisma.coupleProfile.delete({ where: { id: myProfile.coupleProfile.id } })
    }

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

// GET /api/couples/me — perfil de casal do utilizador atual (com info do parceiro)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) {
      return res.status(404).json({ error: 'Sem perfil de casal.' })
    }

    const couple = profile.coupleProfile

    // Enriquecer com info do parceiro
    let partnerInfo = null
    const partnerUserId = couple.partnerOneUserId === req.userId
      ? couple.partnerTwoUserId
      : couple.partnerOneUserId

    if (partnerUserId) {
      const partnerProfile = await prisma.profile.findUnique({
        where: { userId: partnerUserId },
        select: {
          id: true, displayName: true, city: true,
          photos: {
            where: { moderationStatus: 'APPROVED', isPrimary: true },
            take: 1,
            select: { storagePath: true }
          }
        }
      })
      partnerInfo = partnerProfile
    }

    res.json({ ...couple, partnerInfo })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/couples/pending — verificar se tenho pedidos de casal pendentes
router.get('/pending', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Procurar couple profiles onde eu sou o partnerTwo e ainda não aceitei
    const pending = await prisma.coupleProfile.findMany({
      where: {
        partnerTwoUserId: req.userId!,
        coupleStatus: 'PENDING_PARTNER'
      },
      include: {
        profile: {
          select: {
            displayName: true, city: true,
            photos: {
              where: { moderationStatus: 'APPROVED', isPrimary: true },
              take: 1,
              select: { storagePath: true }
            }
          }
        }
      }
    })

    res.json({ pending })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/couples/:id/accept — aceitar pedido de vínculo de casal
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const couple = await prisma.coupleProfile.findUnique({
      where: { id: req.params.id }
    })

    if (!couple) return res.status(404).json({ error: 'Pedido não encontrado.' })
    if (couple.partnerTwoUserId !== req.userId) {
      return res.status(403).json({ error: 'Este pedido não é para ti.' })
    }
    if (couple.coupleStatus === 'ACTIVE') {
      return res.status(409).json({ error: 'Já está ativo.' })
    }

    await prisma.coupleProfile.update({
      where: { id: couple.id },
      data: {
        partnerTwoAcceptedAt: new Date(),
        coupleStatus: 'ACTIVE',
        coupleInviteToken: null
      }
    })

    // Atualizar tipo do perfil do parceiro 2
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (myProfile) {
      await prisma.profile.update({
        where: { id: myProfile.id },
        data: { type: 'COUPLE' }
      })
    }

    // Se o parceiro 1 tem COUPLE_PREMIUM, propagar ao parceiro 2
    const p1Sub = await prisma.subscription.findUnique({
      where: { userId: couple.partnerOneUserId }
    })
    if (p1Sub?.plan === 'COUPLE_PREMIUM' && p1Sub.status === 'ACTIVE') {
      await activateCoupleSubscription(couple, couple.partnerOneUserId)
    }

    res.json({ ok: true, message: 'Vínculo de casal ativado! Bem-vindos ao Between Us Casal.' })
  } catch (err: any) {
    console.error('[COUPLE ACCEPT]', err.message)
    res.status(500).json({ error: 'Erro ao aceitar pedido.' })
  }
})

// POST /api/couples/:id/reject — rejeitar pedido de vínculo
router.post('/:id/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const couple = await prisma.coupleProfile.findUnique({
      where: { id: req.params.id }
    })

    if (!couple) return res.status(404).json({ error: 'Pedido não encontrado.' })
    if (couple.partnerTwoUserId !== req.userId) {
      return res.status(403).json({ error: 'Este pedido não é para ti.' })
    }

    // Dissolver o pedido — reverter o perfil do solicitante
    await prisma.coupleProfile.delete({ where: { id: couple.id } })
    await prisma.profile.update({
      where: { userId: couple.partnerOneUserId },
      data: { type: 'INDIVIDUAL' }
    })

    res.json({ ok: true, message: 'Pedido recusado.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/couples/join/:token — aceitar via link (fluxo por email)
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

    await prisma.coupleProfile.update({
      where: { id: couple.id },
      data: {
        partnerTwoUserId: req.userId,
        partnerTwoAcceptedAt: new Date(),
        coupleStatus: 'ACTIVE',
        coupleInviteToken: null
      }
    })

    // Atualizar tipo do perfil do parceiro 2
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (myProfile) {
      await prisma.profile.update({
        where: { id: myProfile.id },
        data: { type: 'COUPLE' }
      })
    }

    // Propagar subscrição de casal se existir
    const p1Sub = await prisma.subscription.findUnique({
      where: { userId: couple.partnerOneUserId }
    })
    if (p1Sub?.plan === 'COUPLE_PREMIUM' && p1Sub.status === 'ACTIVE') {
      await activateCoupleSubscription({ ...couple, partnerTwoUserId: req.userId }, couple.partnerOneUserId)
    }

    res.json({ ok: true, message: 'Perfil de casal ativado! Ambos podem agora explorar juntos.' })
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

    await prisma.coupleMatchApproval.upsert({
      where: { matchId_userId: { matchId: match.id, userId: req.userId! } },
      update: { approvedAt: new Date(), rejectedAt: null },
      create: { matchId: match.id, userId: req.userId!, approvedAt: new Date() }
    })

    const approvals = await prisma.coupleMatchApproval.findMany({
      where: { matchId: match.id, approvedAt: { not: null } }
    })

    const couple = match.profileOne.coupleProfile || match.profileTwo.coupleProfile
    const bothApproved = couple ? approvals.length >= 2 : approvals.length >= 1

    if (bothApproved) {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'ACTIVE', matchedAt: new Date() }
      })
      return res.json({ ok: true, active: true, message: 'Ambos aprovaram! O match está ativo.' })
    }

    res.json({ ok: true, active: false, message: 'A tua aprovação foi registada. A aguardar o/a parceiro/a.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/couples/me — atualizar descrição
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

// DELETE /api/couples/me — dissolver casal
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { coupleProfile: true }
    })
    if (!profile?.coupleProfile) {
      return res.status(404).json({ error: 'Sem perfil de casal.' })
    }

    const couple = profile.coupleProfile
    const partnerUserId = couple.partnerOneUserId === req.userId
      ? couple.partnerTwoUserId
      : couple.partnerOneUserId

    await prisma.coupleProfile.update({
      where: { id: couple.id },
      data: { coupleStatus: 'SEPARATED' }
    })
    await prisma.profile.update({
      where: { id: profile.id },
      data: { type: 'INDIVIDUAL' }
    })

    // Revogar subscrição de casal do parceiro (downgrade para FREE)
    if (partnerUserId) {
      const partnerSub = await prisma.subscription.findUnique({
        where: { userId: partnerUserId }
      })
      if (partnerSub?.plan === 'COUPLE_PREMIUM') {
        await prisma.subscription.update({
          where: { userId: partnerUserId },
          data: { plan: 'FREE', status: 'CANCELLED', cancelledAt: new Date() }
        })
      }
      // Reverter tipo do perfil do parceiro
      await prisma.profile.updateMany({
        where: { userId: partnerUserId },
        data: { type: 'INDIVIDUAL' }
      })
    }

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
