// 6.7 — Couple Travel Approval.
//
// Before Sprint 6, POST /api/travel activated travel mode the instant
// EITHER partner submitted it, immediately affecting discovery for the
// whole couple (BetweenScoreService's location dimension, wired in
// Sprint 5) with zero say from the other partner. This introduces the
// same "requires everyone active on the profile" gate already used for
// double-consent matches (approvalPolicyService.isApprovalSatisfied) —
// for an INDIVIDUAL profile (1 active member) that gate is trivially
// satisfied immediately, so behavior there is unchanged.
import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId, getActiveMembers } from '../lib/profileMembershipService'
import { isApprovalSatisfied } from '../lib/approvalPolicyService'

const router = Router()

const travelSelect = {
  id: true, profileId: true, city: true, country: true, startDate: true, endDate: true,
  active: true, status: true, createdByUserId: true, createdAt: true,
  approvals: { select: { userId: true, approvedAt: true } },
}

// GET /api/travel/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

  const modes = await (prisma as any).travelMode.findMany({
    where: { profileId }, orderBy: { startDate: 'desc' }, select: travelSelect
  })
  res.json({ travelModes: modes })
})

// POST /api/travel — propose (individual: activates immediately; couple/
// group: enters WAITING_MEMBER_APPROVAL until every active member approves)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({
      city: z.string().min(1), country: z.string().optional().nullable(),
      startDate: z.string(), endDate: z.string(),
    }).parse(req.body)

    if (new Date(body.endDate) <= new Date(body.startDate)) {
      return res.status(400).json({ error: 'Data de fim deve ser posterior ao início.' })
    }

    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const activeMembers = await getActiveMembers(profileId)
    const needsApproval = activeMembers.length > 1

    // Only one SCHEDULED/WAITING_MEMBER_APPROVAL travel window active at a
    // time per profile — cancel any prior one, same as the old
    // "deactivate any current travel modes" behavior.
    await (prisma as any).travelMode.updateMany({
      where: { profileId, status: { in: ['WAITING_MEMBER_APPROVAL', 'SCHEDULED'] } },
      data: { active: false, status: 'CANCELLED' }
    })

    const travel = await (prisma as any).travelMode.create({
      data: {
        profileId, city: body.city, country: body.country || null,
        startDate: new Date(body.startDate), endDate: new Date(body.endDate),
        createdByUserId: req.userId!,
        active: !needsApproval,
        status: needsApproval ? 'WAITING_MEMBER_APPROVAL' : 'SCHEDULED',
        approvals: { create: { userId: req.userId!, approvedAt: new Date() } }
      },
      select: travelSelect
    })

    if (!needsApproval) {
      const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
      await invalidateScoresForProfile(profileId).catch(() => {})
    } else {
      const { notifyUser } = await import('../lib/notify')
      const others = activeMembers.filter(m => m.userId !== req.userId!)
      await Promise.all(others.map(m => notifyUser(
        m.userId, 'travel_approval_required', '✈️ Travel Mode proposto',
        `O teu parceiro propôs Travel Mode para ${body.city}. Precisa da tua aprovação.`,
        { travelModeId: travel.id, tab: 'travel' }
      )))
    }

    res.status(201).json({ travelMode: travel })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[TRAVEL CREATE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/travel/:id/approve — the other member(s) confirm a proposed
// travel window. Only flips to SCHEDULED/active once EVERY active member
// (via isApprovalSatisfied, same policy engine as match double-consent)
// has approved.
router.post('/:id/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const travel = await (prisma as any).travelMode.findUnique({ where: { id: req.params.id } })
    if (!travel) return res.status(404).json({ error: 'Travel Mode não encontrado.' })
    if (travel.status !== 'WAITING_MEMBER_APPROVAL') {
      return res.status(400).json({ error: 'Este Travel Mode não está à espera de aprovação.' })
    }

    const activeMembers = await getActiveMembers(travel.profileId)
    if (!activeMembers.some(m => m.userId === req.userId!)) {
      return res.status(403).json({ error: 'Não pertences a este perfil.' })
    }

    await (prisma as any).travelModeApproval.upsert({
      where: { travelModeId_userId: { travelModeId: travel.id, userId: req.userId! } },
      update: { approvedAt: new Date() },
      create: { travelModeId: travel.id, userId: req.userId!, approvedAt: new Date() }
    })

    const approvals = await (prisma as any).travelModeApproval.findMany({
      where: { travelModeId: travel.id, approvedAt: { not: null } }
    })
    const approvedUserIds = new Set<string>(approvals.map((a: any) => a.userId))
    const satisfied = await isApprovalSatisfied(travel.profileId, approvedUserIds)

    if (satisfied) {
      const updated = await (prisma as any).travelMode.update({
        where: { id: travel.id }, data: { status: 'SCHEDULED', active: true }, select: travelSelect
      })
      const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
      await invalidateScoresForProfile(travel.profileId).catch(() => {})
      return res.json({ ok: true, travelMode: updated, message: 'Travel Mode aprovado por todos e ativo.' })
    }

    res.json({ ok: true, travelMode: null, message: 'Aprovação registada. A aguardar restantes membros.' })
  } catch (err: any) {
    console.error('[TRAVEL APPROVE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/travel/:id — cancel (works for a proposal still awaiting
// approval, or an already-SCHEDULED window)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

  const travel = await (prisma as any).travelMode.findUnique({ where: { id: req.params.id } })
  if (!travel || travel.profileId !== profileId) return res.status(404).json({ error: 'Travel Mode não encontrado.' })

  await (prisma as any).travelMode.update({
    where: { id: req.params.id }, data: { active: false, status: 'CANCELLED' }
  })
  const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
  await invalidateScoresForProfile(profileId).catch(() => {})
  res.json({ ok: true })
})

export default router
