import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import {
  createConsentCheck, respondToConsentCheck, revokeConsentCheckResponse,
  getConsentCheckState, listConsentChecksForMatch
} from '../lib/consentCheckService'

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

const VALID_PHASES = ['MATCH', 'CHAT', 'PHOTO_REQUEST', 'FACE_REVEAL', 'VIDEO_CALL', 'MEETING_PROPOSAL', 'SAFETY_CHECKIN']

// POST /api/consent/check — 8.2/8.3: creates the request/phase record and
// a PENDING ConsentCheckResponse row for every required participant
// (resolved by ConsentPhasePolicy), so state is queryable immediately.
router.post('/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, phase } = req.body
    if (!matchId || !phase || !VALID_PHASES.includes(phase)) {
      return res.status(400).json({ error: 'matchId e phase (válido) são obrigatórios.' })
    }

    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const isMember = await verifyMatchMembership(matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const state = await createConsentCheck({ matchId, phase, initiatedBy: req.userId! })
    res.status(201).json({ consentCheck: state?.check, responses: state?.responses, requiredCount: state?.requiredCount, acceptedCount: state?.acceptedCount })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/consent/check/:id — 8.3/8.7: records the CALLER's own answer.
// status accepts ACCEPTED | NOT_YET | DECLINED. NOT_YET is an explicit
// "not ready yet" answer — it is never treated as ACCEPTED, and it is
// distinct from silence (a participant who never responds stays PENDING).
router.put('/check/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    if (!['ACCEPTED', 'NOT_YET', 'DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' })
    }

    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const check = await prisma.consentCheck.findUnique({ where: { id: req.params.id } })
    if (!check) return res.status(404).json({ error: 'Consent check não encontrado.' })

    const isMember = await verifyMatchMembership(check.matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const result = await respondToConsentCheck(req.params.id, req.userId!, status)
    if ('error' in result) {
      if (result.error === 'EXPIRED') return res.status(400).json({ error: 'Este consent check expirou.' })
      return res.status(404).json({ error: 'Consent check não encontrado.' })
    }

    res.json({
      consentCheck: result.state?.check, responses: result.state?.responses,
      requiredCount: result.state?.requiredCount, acceptedCount: result.state?.acceptedCount,
      allAccepted: result.state?.allAccepted
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/consent/check/:id/revoke — 8.5: immediate, auditable
// revocation of the CALLER's own previously-ACCEPTED answer. Generates a
// notification to the other required participants and flips the cached
// aggregate to REVOKED (dependent actions — e.g. photos.ts's
// request-access for a revoked FACE_REVEAL — consult this via
// isPhaseCurrentlyRevoked). This does NOT delete or unsend anything
// already seen by the other side — only blocks future access.
router.post('/check/:id/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const check = await prisma.consentCheck.findUnique({ where: { id: req.params.id } })
    if (!check) return res.status(404).json({ error: 'Consent check não encontrado.' })

    const isMember = await verifyMatchMembership(check.matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const result = await revokeConsentCheckResponse(req.params.id, req.userId!)
    if ('error' in result) {
      if (result.error === 'NOT_ACCEPTED') {
        return res.status(400).json({ error: 'Só é possível revogar uma resposta previamente aceite.' })
      }
      return res.status(404).json({ error: 'Consent check não encontrado.' })
    }

    res.json({
      consentCheck: result.state?.check, responses: result.state?.responses,
      requiredCount: result.state?.requiredCount, acceptedCount: result.state?.acceptedCount
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/consent/check/:id — single check detail with per-person state.
router.get('/check/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const check = await prisma.consentCheck.findUnique({ where: { id: req.params.id } })
    if (!check) return res.status(404).json({ error: 'Consent check não encontrado.' })

    const isMember = await verifyMatchMembership(check.matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const state = await getConsentCheckState(req.params.id)
    res.json({
      consentCheck: state?.check, responses: state?.responses,
      requiredCount: state?.requiredCount, acceptedCount: state?.acceptedCount, allAccepted: state?.allAccepted
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/consent/match/:matchId — Point 7: validate membership before listing
router.get('/match/:matchId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getMyProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const isMember = await verifyMatchMembership(req.params.matchId, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a este match.' })

    const states = await listConsentChecksForMatch(req.params.matchId)
    const checks = states.map((s: any) => ({
      ...s.check, responses: s.responses, requiredCount: s.requiredCount,
      acceptedCount: s.acceptedCount, allAccepted: s.allAccepted
    }))
    res.json({ checks })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
