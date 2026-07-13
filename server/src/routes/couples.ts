import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createLikeOrMatch } from '../lib/matchService'
import { removeMember, resolveMyProfileId } from '../lib/profileMembershipService'
import { getAvailableContexts } from '../lib/activeProfileContextService'

const CLIENT_URL = process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app'

const router = Router()

// BETA.2 (FASE C/E) — Couple Profiles never carry userId (ownership is
// ProfileMember-only, same as Group — see schema.prisma's Profile.userId
// comment and the matching fix already applied to routes/groups.ts). This
// resolves "the Couple Profile I belong to" the same way groups.ts's
// GET /me does: via an ACCEPTED ProfileMember row whose profile.type is
// COUPLE, never via Profile.userId (which now always means this user's
// own, separate Individual Profile).
async function resolveMyCoupleProfile(userId: string) {
  const membership = await (prisma as any).profileMember.findFirst({
    where: { userId, status: 'ACCEPTED' },
    include: { profile: { include: { coupleProfile: true } } }
  })
  return membership?.profile?.type === 'COUPLE' ? membership.profile : null
}

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { coupleDescription, partnerEmail, displayName } = req.body

    // BETA.2 (FASE C/E) — "already in a couple/group" is a membership
    // question now, not "does my owned Profile row already say COUPLE" —
    // the creator's Individual Profile (if any) is left completely
    // untouched by this route; the Couple Profile is always a brand new,
    // separate Profile row. Same fix already applied to routes/groups.ts.
    const existingContexts = await getAvailableContexts(req.userId!)
    if (existingContexts.some(c => c.type !== 'INDIVIDUAL')) {
      return res.status(409).json({ error: 'Já tens um perfil de casal.' })
    }

    const profile = await prisma.profile.create({
      data: {
        type: 'COUPLE',
        displayName: displayName || 'Casal',
        sharedDescription: coupleDescription || null,
        status: process.env.NODE_ENV === 'production' ? 'PENDING_REVIEW' : 'APPROVED',
        privacySettings: { create: {
          visibleInDiscovery: false, showDistance: true,
          showOnlineStatus: false, invisibleMode: false, notificationMode: 'DISCREET'
        }}
      }
    })

    const inviteToken = uuidv4()
    const couple = await prisma.coupleProfile.create({
      data: {
        profileId: profile.id,
        partnerOneUserId: req.userId!,
        partnerTwoInviteEmail: partnerEmail || null,
        coupleDescription: coupleDescription || null,
        coupleInviteToken: inviteToken,
        coupleStatus: 'PENDING_PARTNER'
      }
    })

    // Sprint 3: dual-write into the generalized ProfileMember model so
    // couple approvals can run through the same code path as groups.
    await (prisma as any).profileMember.create({
      data: { profileId: profile.id, userId: req.userId!, isCreator: true, status: 'ACCEPTED' }
    }).catch((e: any) => console.error('[PROFILE MEMBER DUAL-WRITE]', e.message))
    if (partnerEmail) {
      await (prisma as any).profileMember.create({
        data: { profileId: profile.id, invitedEmail: partnerEmail, status: 'PENDING', inviteToken }
      }).catch((e: any) => console.error('[PROFILE MEMBER DUAL-WRITE]', e.message))
    }

    res.status(201).json({
      couple, inviteToken, profile,
      inviteUrl: `${CLIENT_URL}/couple-invite/${inviteToken}`
    })
  } catch (err: any) {
    console.error('[COUPLE CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil de casal.' })
  }
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await resolveMyCoupleProfile(req.userId!)
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
    const myProfile = await resolveMyCoupleProfile(req.userId!)
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (!myProfile.coupleProfile) return res.status(400).json({ error: 'Perfil de casal necessário.' })
    if (myProfile.coupleProfile.coupleStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'Perfil de casal não está ativo.' })
    }

    const result = await createLikeOrMatch(myProfile.id, req.params.targetProfileId)

    switch (result.kind) {
      case 'ERROR':
        return res.status(result.code === 'ACTIVE_MATCH_LIMIT' ? 403 : 400)
          .json({ error: result.message, code: result.code })
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

// GET /api/couples/matches/pending — 6.6: matches this profile is a
// required approver for, still PENDING_COUPLE_APPROVAL. This is the data
// behind "Interesse enviado → Parceiro A confirmou → Parceiro B confirmou"
// - nothing in the client previously read this at all (confirmed in the
// Sprint 6 audit: GET /api/matches only ever returns status ACTIVE, so a
// pending double-consent match was invisible until BOTH partners somehow
// knew to call the approve endpoint blind).
router.get('/matches/pending', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfileId = await resolveMyProfileId(req.userId!)
    if (!myProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const matches = await prisma.match.findMany({
      where: {
        status: 'PENDING_COUPLE_APPROVAL',
        OR: [{ profileOneId: myProfileId }, { profileTwoId: myProfileId }]
      },
      include: {
        profileOne: { select: { id: true, displayName: true, type: true,
          photos: { where: { moderationStatus: 'APPROVED', isPrimary: true }, take: 1 } } },
        profileTwo: { select: { id: true, displayName: true, type: true,
          photos: { where: { moderationStatus: 'APPROVED', isPrimary: true }, take: 1 } } },
      },
      orderBy: { createdAt: 'desc' }
    })

    const { getRequiredApproverUserIds } = await import('../lib/matchService')
    const { getActiveMembers } = await import('../lib/profileMembershipService')

    const enriched = await Promise.all(matches.map(async (match: any) => {
      const otherProfile = match.profileOneId === myProfileId ? match.profileTwo : match.profileOne
      const myRequired = await getRequiredApproverUserIds(myProfileId)
      const otherRequired = await getRequiredApproverUserIds(
        match.profileOneId === myProfileId ? match.profileTwoId : match.profileOneId
      )
      const approvals = await prisma.coupleMatchApproval.findMany({
        where: { matchId: match.id, approvedAt: { not: null } }
      })
      const approvedUserIds = new Set<string>(approvals.map((a: any) => a.userId))
      const myMembers = await getActiveMembers(myProfileId)

      return {
        matchId: match.id,
        profile: otherProfile,
        // 6.6 flow steps — only ever reveals MY OWN side's individual
        // approval progress (that's not private from me, it's my own
        // partner). The other side is deliberately a single aggregate
        // boolean, never a per-member breakdown.
        myApprovals: myMembers.map(m => ({ userId: m.userId, isCreator: m.isCreator, approved: approvedUserIds.has(m.userId) })),
        mySideConfirmed: myRequired.every(uid => approvedUserIds.has(uid)),
        otherSideConfirmed: otherRequired.every(uid => approvedUserIds.has(uid)),
      }
    }))

    res.json({ pending: enriched })
  } catch (err: any) {
    console.error('[COUPLE PENDING MATCHES]', err.message)
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
    const approvedUserIds = new Set<string>(approvals.map((a: any) => a.userId))

    // 6.5 — ApprovalPolicy V2: each side's requirement is checked on its
    // OWN terms (isApprovalSatisfied), not by flattening both sides into
    // one merged list and requiring every name in it. That flattening
    // happened to be equivalent under the old implicit ALL-only behavior,
    // but breaks the moment either side uses MAJORITY/DESIGNATED — a
    // 3-member group with MAJORITY only needs 2 of its own 3 approving,
    // regardless of how many people are on the other side.
    const { isApprovalSatisfied } = await import('../lib/approvalPolicyService')
    const [oneSatisfied, twoSatisfied] = await Promise.all([
      isApprovalSatisfied(match.profileOneId, approvedUserIds),
      isApprovalSatisfied(match.profileTwoId, approvedUserIds),
    ])
    const allApproved = oneSatisfied && twoSatisfied

    // 5.9 — CoupleMatchApproval bookkeeping (above) stays here, it's a
    // separate model from Match.status. But the actual status flip now
    // goes through MatchStateMachine.transition() instead of a raw
    // prisma.match.update - ACTIVATE's MATCH_ACTIVATED domain event (5.10)
    // sends the "match ativo" notification to every active member of both
    // profiles, so the manual notifyUser loop that used to live here is
    // no longer needed.
    if (allApproved) {
      const { transition } = await import('../lib/matchService')
      const result = await transition(match.id, 'ACTIVATE')
      if (!result.ok) return res.status(409).json({ error: result.error })
      return res.json({ ok: true, active: true, message: 'Todos aprovaram! Match ativo.' })
    }

    res.json({ ok: true, active: false, message: 'Aprovação registada. A aguardar restantes membros.' })
  } catch (err: any) {
    console.error('[COUPLE APPROVE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/couples/matches/:matchId/reject — 6.5's reject flow. Any
// required approver on either side can reject; the match goes straight to
// ENDED via MATCH_REJECTED (never reveals WHICH member rejected — the
// domain event notifies both sides identically, see domainEvents.ts).
// Deliberately does NOT record which specific user rejected in any
// user-facing response — CoupleMatchApproval rows for this match are left
// as-is (whatever partial approvals existed become moot once ENDED), and
// no rejectedAt bookkeeping is exposed back to the other side.
router.post('/matches/:matchId/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.matchId } })
    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })
    if (match.status !== 'PENDING_COUPLE_APPROVAL') {
      return res.status(400).json({ error: 'Este match já não está à espera de aprovação.' })
    }

    const { getRequiredApproverUserIds, transition } = await import('../lib/matchService')
    const requiredOne = await getRequiredApproverUserIds(match.profileOneId)
    const requiredTwo = await getRequiredApproverUserIds(match.profileTwoId)
    const requiredApprovers = [...new Set([...requiredOne, ...requiredTwo])]
    if (!requiredApprovers.includes(req.userId!)) {
      return res.status(403).json({ error: 'Não pertences a este match.' })
    }

    const result = await transition(match.id, 'REJECT')
    if (!result.ok) return res.status(409).json({ error: result.error })
    res.json({ ok: true, message: 'Match rejeitado.' })
  } catch (err: any) {
    console.error('[COUPLE REJECT]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await resolveMyCoupleProfile(req.userId!)
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
    const profile = await resolveMyCoupleProfile(req.userId!)
    if (!profile?.coupleProfile) return res.status(404).json({ error: 'Sem perfil de casal.' })
    await prisma.coupleProfile.update({ where: { id: profile.coupleProfile.id }, data: { coupleStatus: 'SEPARATED' } })
    // BETA.2 (FASE C/E) — no longer converts the Couple Profile row back
    // to type INDIVIDUAL: it was never the creator's Individual Profile
    // to begin with (that's now always a separate row, untouched by this
    // whole flow). The Couple Profile row just stays type COUPLE with
    // coupleStatus SEPARATED and zero active members — a defunct shared
    // profile, same as how a Group with all members removed behaves.

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
