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
import { hasEntitlement } from '../lib/subscriptionEntitlementService'
import {
  getHomeLocation, getEffectiveLocation, isTravelModeRelevantAt,
  toPublicEffectiveLocation, withoutCoordinates,
  deriveTravelModeLocation, TRAVEL_LOCATION_SELECT,
} from '../lib/effectiveLocationService'

const router = Router()

const travelSelect = {
  id: true, profileId: true, city: true, country: true, startDate: true, endDate: true,
  active: true, status: true, createdByUserId: true, createdAt: true,
  approvals: { select: { userId: true, approvedAt: true } },
  // Sistema de localidades — carregados só para derivar `location` abaixo
  // (deriveTravelModeLocation); `destinationLocation` em si (com
  // latitude/longitude) nunca sai desta rota tal-e-qual — ver withRelevance.
  ...TRAVEL_LOCATION_SELECT,
}

// Fase 3D — anota cada TravelMode com a sua relevância temporal
// (FUTURE/ACTIVE/EXPIRED/null), calculada em tempo de leitura (não há cron
// a actualizar `status`/`active` na expiração — ver
// effectiveLocationService.isTravelModeRelevantAt). O frontend usa isto
// para escolher o texto certo: "Vais estar em X entre..." (FUTURE) vs "Em
// Travel Mode em X até..." (ACTIVE) — nunca "Estás em X" antes da data de
// início (secção UI do pedido Fase 3D).
//
// Sistema de localidades — também anota `location` (país/cidade/rótulo já
// derivados da GeoLocation associada, se existir — nunca coordenadas, ver
// withoutCoordinates) e remove o objecto bruto `destinationLocation`
// (que tem latitude/longitude) da resposta, para nunca vazar coordenadas
// mesmo indirectamente através desta lista.
const withRelevance = (t: any) => {
  const { destinationLocation, ...rest } = t
  return {
    ...rest,
    relevance: t.status === 'SCHEDULED' && t.active
      ? isTravelModeRelevantAt({ startDate: t.startDate, endDate: t.endDate })
      : null,
    location: withoutCoordinates(deriveTravelModeLocation(t)),
  }
}

// GET /api/travel/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profileId = await resolveMyProfileId(req.userId!)
  if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

  const modes = await (prisma as any).travelMode.findMany({
    where: { profileId }, orderBy: { startDate: 'desc' }, select: travelSelect
  })
  // Fase 3D — devolve também a localização habitual e a localização
  // efectiva já resolvidas (nunca coordenadas), para o frontend poder
  // mostrar "Localização habitual: X" e "Travel Mode agendado/activo: Y"
  // sem ter de replicar a lógica de effectiveLocationService.
  const [homeLocation, effectiveLocation] = await Promise.all([
    getHomeLocation(profileId),
    getEffectiveLocation(profileId),
  ])
  res.json({
    travelModes: modes.map(withRelevance),
    homeLocation: withoutCoordinates(homeLocation),
    effectiveLocation: toPublicEffectiveLocation(effectiveLocation),
  })
})

// POST /api/travel — propose (individual: activates immediately; couple/
// group: enters WAITING_MEMBER_APPROVAL until every active member approves)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Sistema de localidades — city/country continuam aceites por
    // compatibilidade (frontend ainda não migrado, ou um cliente antigo),
    // mas o fluxo novo passa destinationLocationId (localidade do catálogo
    // GeoLocation) + customDestinationLocality opcional (só apresentação —
    // nunca usado para distância). Exige-se pelo menos um dos dois
    // (destinationLocationId OU city) porque uma janela de viagem sem
    // localidade nenhuma não faz sentido.
    const body = z.object({
      city: z.string().min(1).optional(),
      country: z.string().optional().nullable(),
      startDate: z.string(), endDate: z.string(),
      destinationLocationId: z.string().optional().nullable(),
      customDestinationLocality: z.string().max(120).optional().nullable(),
    }).parse(req.body)

    if (!body.destinationLocationId && !body.city) {
      return res.status(400).json({ error: 'Escolhe um destino do catálogo ou indica uma cidade.' })
    }

    if (new Date(body.endDate) <= new Date(body.startDate)) {
      return res.status(400).json({ error: 'Data de fim deve ser posterior ao início.' })
    }

    if (body.destinationLocationId) {
      const location = await (prisma as any).geoLocation.findUnique({ where: { id: body.destinationLocationId }, select: { id: true, active: true } })
      if (!location || !location.active) return res.status(400).json({ error: 'Destino inválido.' })
    }

    const profileId = await resolveMyProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Secção 9 do pedido de monetização — FREE nunca pode criar Travel
    // Mode; PREMIUM (individual) e COUPLE_PREMIUM (casal, com aprovação
    // dos dois — já implementada abaixo) podem. GROUP nunca herda o
    // benefício via COUPLE_PREMIUM de outrem (ver o caso especial em
    // hasEntitlement).
    const canUseTravelMode = await hasEntitlement(req.userId!, 'TRAVEL_MODE', profileId)
    if (!canUseTravelMode) {
      return res.status(403).json({ error: 'Travel Mode requer Premium.', code: 'PREMIUM_REQUIRED' })
    }

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
        profileId, city: body.city || null, country: body.country || null,
        destinationLocationId: body.destinationLocationId || null,
        customDestinationLocality: body.customDestinationLocality || null,
        startDate: new Date(body.startDate), endDate: new Date(body.endDate),
        createdByUserId: req.userId!,
        active: !needsApproval,
        status: needsApproval ? 'WAITING_MEMBER_APPROVAL' : 'SCHEDULED',
        approvals: { create: { userId: req.userId!, approvedAt: new Date() } }
      },
      select: travelSelect
    })
    const travelDestinationLabel = deriveTravelModeLocation(travel).displayLabel || body.city || 'destino'

    if (!needsApproval) {
      const { invalidateScoresForProfile } = await import('../lib/scoreInvalidationService')
      await invalidateScoresForProfile(profileId).catch(() => {})
    } else {
      const { notifyUser } = await import('../lib/notify')
      const others = activeMembers.filter(m => m.userId !== req.userId!)
      await Promise.all(others.map(m => notifyUser(
        m.userId, 'travel_approval_required', '✈️ Travel Mode proposto',
        `O teu parceiro propôs Travel Mode para ${travelDestinationLabel}. Precisa da tua aprovação.`,
        { travelModeId: travel.id, tab: 'travel' }
      )))
    }

    res.status(201).json({ travelMode: withRelevance(travel) })
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
      return res.json({ ok: true, travelMode: withRelevance(updated), message: 'Travel Mode aprovado por todos e ativo.' })
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
