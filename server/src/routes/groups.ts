import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { inviteMember } from '../lib/profileMembershipService'
import { assertGroupProfilesEnabled } from '../lib/profileTypePolicy'
import { getAvailableContexts } from '../lib/activeProfileContextService'

const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')

const router = Router()

// POST /api/groups — create a group profile with the creator as first member,
// plus any number of initial email invites (trio = 1 invite, poly = several).
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // 4.2: this route had no feature flag at all before — anyone could
    // create a group profile regardless of whether the team wanted GROUP
    // rolled out. Defaults enabled (see profileTypePolicy.ts for why).
    const flagCheck = assertGroupProfilesEnabled()
    if (!flagCheck.valid) return res.status(403).json({ error: flagCheck.reason })

    const { sharedDescription, inviteEmails } = req.body
    const emails: string[] = Array.isArray(inviteEmails) ? inviteEmails.filter(Boolean) : []

    // BETA.2 (FASE C) — "already in a couple/group" used to be answered by
    // checking whether the caller's OWNED Profile row (Profile.userId) had
    // type !== 'INDIVIDUAL', because creating a group used to convert that
    // very row in place. Now a Shared Profile never sets userId at all
    // (ownership is ProfileMember-only — see schema.prisma's Profile.userId
    // comment), so the owned row is always the caller's Individual Profile
    // and this check must instead look at Shared Profile membership.
    const existingContexts = await getAvailableContexts(req.userId!)
    const existingShared = existingContexts.find(c => c.type !== 'INDIVIDUAL')
    if (existingShared) {
      return res.status(409).json({ error: 'Já tens um perfil de casal ou de grupo.' })
    }

    // The creator's own Individual Profile is left completely untouched —
    // the Group Profile is always a brand new, separate Profile row
    // (userId: null; ownership expressed via the ProfileMember upsert
    // below), never the creator's individual row converted in place.
    const profile = await prisma.profile.create({
      data: {
        type: 'GROUP',
        displayName: req.body.displayName || 'Grupo',
        sharedDescription: sharedDescription || null,
        status: process.env.NODE_ENV === 'production' ? 'PENDING_REVIEW' : 'APPROVED',
        privacySettings: { create: {
          visibleInDiscovery: false, showDistance: true,
          showOnlineStatus: false, invisibleMode: false, notificationMode: 'DISCREET'
        }}
      }
    })

    await (prisma as any).profileMember.upsert({
      where: { profileId_userId: { profileId: profile.id, userId: req.userId! } },
      update: { isCreator: true, status: 'ACCEPTED' },
      create: { profileId: profile.id, userId: req.userId!, isCreator: true, status: 'ACCEPTED' }
    })

    const invites = []
    for (const email of emails) {
      const inviteToken = uuidv4()
      await (prisma as any).profileMember.create({
        data: { profileId: profile.id, invitedEmail: email, status: 'PENDING', inviteToken }
      })
      invites.push({ email, inviteUrl: `${CLIENT_URL}/group-invite/${inviteToken}` })
    }

    res.status(201).json({ profile, invites })
  } catch (err: any) {
    console.error('[GROUP CREATE]', err.message)
    res.status(500).json({ error: 'Erro ao criar perfil de grupo.' })
  }
})

// GET /api/groups/me — the group profile I belong to (creator or accepted member)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.2 (FASE C) — Group Profiles never carry userId, so membership is
    // the only source of truth now (the direct Profile.userId fallback
    // this used to have would only ever match legacy pre-backfill rows).
    const membership = await (prisma as any).profileMember.findFirst({
      where: { userId: req.userId!, status: 'ACCEPTED' },
      include: { profile: true }
    })
    const profile = membership?.profile?.type === 'GROUP' ? membership.profile : null

    if (!profile) return res.status(404).json({ error: 'Sem perfil de grupo.' })

    const members = await (prisma as any).profileMember.findMany({
      where: { profileId: profile.id },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { invitedAt: 'asc' }
    })

    res.json({ profile, members })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/groups/invite — add another invite to an existing group profile
router.post('/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email obrigatório.' })

    const myMembership = await (prisma as any).profileMember.findFirst({
      where: { userId: req.userId!, status: 'ACCEPTED' }
    })
    if (!myMembership) return res.status(404).json({ error: 'Sem perfil de grupo ativo.' })

    const already = await (prisma as any).profileMember.findFirst({
      where: { profileId: myMembership.profileId, invitedEmail: email }
    })
    if (already) return res.status(409).json({ error: 'Este email já foi convidado.' })

    const { inviteToken } = await inviteMember(myMembership.profileId, email)

    res.status(201).json({ ok: true, inviteUrl: `${CLIENT_URL}/group-invite/${inviteToken}` })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/groups/join/:token — accept a group invite
router.post('/join/:token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const invite = await (prisma as any).profileMember.findUnique({ where: { inviteToken: req.params.token } })
    if (!invite || invite.status !== 'PENDING') return res.status(404).json({ error: 'Convite inválido ou expirado.' })

    // BETA.2 (FASE C) — "already in another couple/group" is now a
    // membership question, not an owned-profile-type question (see the
    // matching comment in POST '/' above — a Shared Profile never sets
    // userId, so the caller's owned row is always their Individual
    // Profile and can no longer be used to detect this).
    const existingSharedMembership = await (prisma as any).profileMember.findFirst({
      where: { userId: req.userId!, status: 'ACCEPTED', profileId: { not: invite.profileId } }
    })
    if (existingSharedMembership) {
      return res.status(409).json({ error: 'Já pertences a outro casal ou grupo.' })
    }

    await (prisma as any).profileMember.update({
      where: { id: invite.id },
      data: { userId: req.userId!, status: 'ACCEPTED', respondedAt: new Date(), inviteToken: null }
    })

    // BETA.2 (FASE C) — the accepting user's Individual Profile (if they
    // have one) is deliberately left untouched. Before this sprint it was
    // hidden on the theory that "you now act through the shared group
    // profile" — but the whole point of this sprint is that Individual and
    // Shared are independent, simultaneous identities (Active Profile
    // Context decides which one a given screen acts as; the Group's
    // individualDiscoveryPolicy decides whether the Individual Profile is
    // additionally visible in Discovery — see EligibilityService).

    const { notifyUser } = await import('../lib/notify')
    const otherMembers = await (prisma as any).profileMember.findMany({
      where: { profileId: invite.profileId, status: 'ACCEPTED', userId: { not: req.userId! } }
    })
    otherMembers.forEach((m: any) => notifyUser(m.userId, 'group_member_joined',
      '👥 Novo membro no grupo', 'Alguém aceitou o convite e juntou-se ao vosso perfil de grupo.',
      { tab: 'profile' }).catch(() => {}))

    res.json({ ok: true, message: 'Juntaste-te ao perfil de grupo!' })
  } catch (err: any) {
    console.error('[GROUP JOIN]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/groups/members/:memberId — creator removes a member
router.delete('/members/:memberId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await (prisma as any).profileMember.findUnique({ where: { id: req.params.memberId } })
    if (!member) return res.status(404).json({ error: 'Membro não encontrado.' })

    const requester = await (prisma as any).profileMember.findFirst({
      where: { profileId: member.profileId, userId: req.userId!, isCreator: true }
    })
    if (!requester) return res.status(403).json({ error: 'Só quem criou o grupo pode remover membros.' })
    if (member.isCreator) return res.status(400).json({ error: 'Não podes remover quem criou o grupo.' })

    await (prisma as any).profileMember.delete({ where: { id: member.id } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
