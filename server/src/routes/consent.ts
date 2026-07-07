import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId } from '../lib/profileMembershipService'

const router = Router()

// 7.10/7.11 — was Profile.userId-only (silently excluded a couple's
// non-creator member from ever using Consent Check), same bug class
// fixed across Sprint 6/7. Now shares the canonical resolver.
const getMyProfileId = resolveMyProfileId

const verifyMatchMembership = async (matchId: string, profileId: string): Promise<boolean> => {
  const match = await prisma.match.findFirst({
    where: { id: matchId, OR: [{ profileOneId: profileId }, { profileTwoId: profileId }] }
  })
  return !!match
}

// POST /api/consent/check — Point 7: validate membership before creating
router.post('/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, phase } = req.body
    if (!matchId || !phase) {
      return res.status(400).json({ error: 'matchId e phase são obrigatórios.' })
    }

    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const isMember = await verifyMatchMembership(matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const check = await prisma.consentCheck.create({
      data: {
        matchId, profileId, phase, status: 'PENDING',
        initiatedBy: req.userId!,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    res.status(201).json({ consentCheck: check })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/consent/check/:id — Point 7: validate the check belongs to a match the user is part of
router.put('/check/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    if (!['ACCEPTED','DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' })
    }

    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const check = await prisma.consentCheck.findUnique({ where: { id: req.params.id } })
    if (!check) return res.status(404).json({ error: 'Consent check não encontrado.' })

    // Point 7: validate the responding user belongs to the underlying match
    const isMember = await verifyMatchMembership(check.matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    if (check.expiresAt && check.expiresAt < new Date()) {
      await prisma.consentCheck.update({ where: { id: check.id }, data: { status: 'EXPIRED' } })
      return res.status(400).json({ error: 'Este consent check expirou.' })
    }

    const updated = await prisma.consentCheck.update({
      where: { id: req.params.id },
      data: { status, respondedAt: new Date() }
    })

    res.json({ consentCheck: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/consent/match/:matchId — Point 7: validate membership before listing
router.get('/match/:matchId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const isMember = await verifyMatchMembership(req.params.matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const checks = await prisma.consentCheck.findMany({
      where: { matchId: req.params.matchId },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ checks })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
