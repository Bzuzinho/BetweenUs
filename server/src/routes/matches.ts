import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { resolveMyProfileId, getActiveMembers } from '../lib/profileMembershipService'
import { mergePhotosForViewer } from '../lib/mediaAccessService'
import { canViewIncomingConnectionProfile } from '../lib/subscriptionEntitlementService'
import { buildScoreInput } from '../lib/discoveryService'
import { getOrCalculateScore } from '../lib/compatibilityScoreService'
import { ageFromDOB, bucketAge } from '../utils/age'

const router = Router()

// Secção 4/5 do pedido de monetização — bucket de 5 anos, nunca a idade
// exacta, para o preview FREE. Para um perfil COUPLE/GROUP, cobre o
// intervalo entre o membro mais novo e o mais velho (o que já é, por
// natureza, uma "faixa etária" real do casal/grupo).
const resolveAgeRange = async (profile: { userId: string | null; id: string }): Promise<string | null> => {
  let userIds: string[]
  if (profile.userId) {
    userIds = [profile.userId]
  } else {
    userIds = (await getActiveMembers(profile.id)).map(m => m.userId)
  }
  if (userIds.length === 0) return null
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { dateOfBirth: true } })
  if (users.length === 0) return null
  const ages = users.map(u => ageFromDOB(u.dateOfBirth))
  const youngest = Math.min(...ages)
  const oldest = Math.max(...ages)
  return youngest === oldest ? bucketAge(youngest) : `${bucketAge(youngest).split('-')[0]}-${bucketAge(oldest).split('-')[1]}`
}

// Verificado só se TODOS os membros activos estiverem verificados (mesma
// postura "tão forte quanto o membro menos elegível" já usada por
// isSharedProfileEligible no discoveryService — nunca mostrar o selo de
// verificação a mais do que é realmente garantido).
const resolveVerified = async (profile: { userId: string | null; id: string }): Promise<boolean> => {
  let userIds: string[]
  if (profile.userId) {
    userIds = [profile.userId]
  } else {
    userIds = (await getActiveMembers(profile.id)).map(m => m.userId)
  }
  if (userIds.length === 0) return false
  const verifications = await prisma.verification.findMany({
    where: { userId: { in: userIds }, status: 'APPROVED' },
    select: { userId: true }
  })
  return new Set(verifications.map(v => v.userId)).size === userIds.length
}

// 6.6 — was Profile.userId-only (broke for a couple/group's non-creator
// members, the same bug class fixed across photos.ts/travel.ts/agreements.ts
// this sprint). Matters here specifically because it silently hid ACTIVE
// matches — including newly-unlocked Private Rooms — from a couple's
// second partner.
const getUserProfileId = resolveMyProfileId

const verifyMatchMembership = async (matchId: string, profileId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ profileOneId: profileId }, { profileTwoId: profileId }]
    }
  })
  return !!match
}

// GET /api/matches — only my matches
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getUserProfileId(req.userId!)
    if (!profileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ profileOneId: profileId }, { profileTwoId: profileId }],
        status: 'ACTIVE'
      },
      include: {
        profileOne: {
          select: { id:true, displayName:true, city:true, type:true,
            photos: { where: { moderationStatus: 'APPROVED', isPrimary: true }, take: 1 } }
        },
        profileTwo: {
          select: { id:true, displayName:true, city:true, type:true,
            photos: { where: { moderationStatus: 'APPROVED', isPrimary: true }, take: 1 } }
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' }, take: 1,
              select: { body:true, createdAt:true, readAt:true, senderUserId:true }
            }
          }
        }
      },
      orderBy: { matchedAt: 'desc' }
    })

    interface MatchListRow {
      id: string
      matchedAt: Date
      profileOneId: string
      profileTwoId: string
      profileOne: { id: string; displayName: string; city: string | null; type: string; photos: any[] }
      profileTwo: { id: string; displayName: string; city: string | null; type: string; photos: any[] }
      conversation: { id: string; messages: { body: string; createdAt: Date; readAt: Date | null; senderUserId: string }[] } | null
    }
    const formatted = (matches as MatchListRow[]).map((m: MatchListRow) => {
      const isOne = m.profileOneId === profileId
      const other = isOne ? m.profileTwo : m.profileOne
      const lastMsg = m.conversation?.messages[0]
      const unread = lastMsg && !lastMsg.readAt && lastMsg.senderUserId !== req.userId ? 1 : 0
      return {
        id: m.id, matchedAt: m.matchedAt,
        conversationId: m.conversation?.id,
        profile: other,
        lastMessage: lastMsg ? { body: lastMsg.body, createdAt: lastMsg.createdAt, isOwn: lastMsg.senderUserId === req.userId } : null,
        unread
      }
    })

    res.json({ matches: formatted })
  } catch (err: any) {
    console.error('[MATCHES]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/matches/pending-requests — BETA.4: single-consent connection
// requests directed AT me, not yet resolved either way. This is distinct
// from GET /api/couples/matches/pending (N-party COUPLE/GROUP approval
// queue, unrelated data shape) — this is the plain "someone liked you,
// you haven't answered yet" list for the model confirmed with the product
// owner: ligar → the other person is notified immediately and can
// accept/reject, no double-blind swipe-match required. Must stay free and
// fully visible for every plan — this list is the core flow, not a
// premium feature (explicit product decision, BETA.4).
router.get('/pending-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfileId = await getUserProfileId(req.userId!)
    if (!myProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const incomingLikes = await prisma.profileAction.findMany({
      where: { targetProfileId: myProfileId, action: 'LIKE' },
      select: { actorProfileId: true, createdAt: true }
    })
    if (incomingLikes.length === 0) return res.json({ pending: [] })

    interface ActorRow { actorProfileId: string; createdAt: Date }
    interface TargetRow { targetProfileId: string }
    interface MatchPairRow { profileOneId: string; profileTwoId: string }

    const actorIds = (incomingLikes as ActorRow[]).map((l: ActorRow) => l.actorProfileId)

    // Already resolved one way or another: I recorded my own action
    // against them (LIKE via accept, or PASS via reject) — either way
    // this pair is no longer "pending my response".
    const myResponses = await prisma.profileAction.findMany({
      where: { actorProfileId: myProfileId, targetProfileId: { in: actorIds } },
      select: { targetProfileId: true }
    })
    const respondedIds = new Set((myResponses as TargetRow[]).map((r: TargetRow) => r.targetProfileId))

    // Defense-in-depth: a Match may already exist for this pair (e.g. the
    // couple-approval path activates it via a different code path) even
    // without my own ProfileAction row — exclude those too.
    const existingMatches = await prisma.match.findMany({
      where: { OR: [
        { profileOneId: myProfileId, profileTwoId: { in: actorIds } },
        { profileTwoId: myProfileId, profileOneId: { in: actorIds } },
      ]},
      select: { profileOneId: true, profileTwoId: true }
    })
    const matchedIds = new Set(
      (existingMatches as MatchPairRow[])
        .flatMap((m: MatchPairRow) => [m.profileOneId, m.profileTwoId])
        .filter((id: string) => id !== myProfileId)
    )

    const stillPendingIds = actorIds.filter((id: string) => !respondedIds.has(id) && !matchedIds.has(id))
    if (stillPendingIds.length === 0) return res.json({ pending: [] })

    // Secção 4/5 do pedido de monetização — lista em si mantém-se sempre
    // grátis (decisão de produto BETA.4, ver comentário acima), mas o NÍVEL
    // DE DETALHE do perfil de quem pediu ligação depende do plano de quem
    // está a ver: FREE só vê um preview não identificativo (tipo, faixa
    // etária, cidade geral, score, intenções agregadas, verificação, foto
    // desfocada); PREMIUM/COUPLE_PREMIUM vê o perfil completo (nome,
    // bio, todas as fotos aprovadas — sempre passando por
    // mergePhotosForViewer, nunca a foto limpa de uma PRIVATE_AFTER_MATCH/
    // PRIVATE_AFTER_APPROVAL antes de existir match/aprovação real).
    const canViewFull = await canViewIncomingConnectionProfile(req.userId!)

    const myScoreInput = await buildScoreInput(myProfileId)

    const profiles = await prisma.profile.findMany({
      where: { id: { in: stillPendingIds } },
      select: {
        id: true, displayName: true, city: true, country: true, type: true,
        bio: true, gender: true, orientation: true, relationshipStatus: true,
        userId: true,
        photos: { where: { moderationStatus: 'APPROVED' }, orderBy: [{ isPrimary: 'desc' }] },
        intentions: { where: { preference: 'YES' }, include: { intention: { select: { name: true, slug: true } } } },
      }
    })
    const likedAtByProfile = new Map((incomingLikes as ActorRow[]).map((l: ActorRow) => [l.actorProfileId, l.createdAt]))

    const pending = await Promise.all(profiles.map(async (p) => {
      const ownerUserId = p.userId || (await getActiveMembers(p.id))[0]?.userId || ''
      const mergedPhotos = await mergePhotosForViewer(p.photos as any, {
        ownerUserId, viewerUserId: req.userId!, viewerProfileId: myProfileId,
      })
      const primaryPhoto = mergedPhotos.find((ph: any) => ph.isPrimary) || mergedPhotos[0] || null

      const [ageRange, verified, scoreResult] = await Promise.all([
        resolveAgeRange({ userId: p.userId, id: p.id }),
        resolveVerified({ userId: p.userId, id: p.id }),
        (async () => {
          if (!myScoreInput) return null
          const candidateInput = await buildScoreInput(p.id)
          if (!candidateInput) return null
          return getOrCalculateScore(myScoreInput, candidateInput)
        })(),
      ])

      const preview = {
        type: p.type,
        ageRange,
        city: p.city, // já é uma cidade geral — nunca coordenadas exactas (ver Profile.locationLat/Lng, nunca expostos aqui)
        score: scoreResult?.score ?? null,
        intentions: p.intentions.map(i => ({ name: i.intention.name, slug: i.intention.slug })),
        verified,
        photo: primaryPhoto ? { url: primaryPhoto.storagePath, accessLevel: primaryPhoto.accessLevel } : null,
      }

      const full = canViewFull ? {
        displayName: p.displayName,
        bio: p.bio,
        gender: p.gender,
        orientation: p.orientation,
        relationshipStatus: p.relationshipStatus,
        city: p.city,
        country: p.country,
        photos: mergedPhotos,
      } : null

      return {
        // Mantido para compatibilidade com o fluxo aceitar/rejeitar
        // (accept/:id, reject/:id usam só o id) — nunca depende do plano.
        profile: { id: p.id, type: p.type },
        likedAt: likedAtByProfile.get(p.id),
        preview,
        full,
        canViewFullProfile: canViewFull,
      }
    }))

    pending.sort((a, b) => (b.likedAt?.getTime() || 0) - (a.likedAt?.getTime() || 0))

    res.json({ pending })
  } catch (err: any) {
    console.error('[PENDING REQUESTS]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/matches/:id/messages — A.3: validate membership
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = await getUserProfileId(req.userId!)
    // BETA.2 fix — uniform 403 for "no access to this conversation",
    // whether the caller has no profile at all or simply isn't a member;
    // see consent.ts's identical fix for the full rationale.
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    // A.3: verify user belongs to this match
    const isMember = await verifyMatchMembership(req.params.id, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { conversation: { include: { messages: {
        orderBy: { createdAt: 'asc' },
        where: { deletedAt: null, removedByAdmin: false },
        include: { sender: { select: { id: true,
          profile: { select: { displayName: true } } } } }
      }}}}
    })

    if (!match) return res.status(404).json({ error: 'Match não encontrado.' })

    // Mark messages as read
    await prisma.message.updateMany({
      where: { conversationId: match.conversation?.id, senderUserId: { not: req.userId! }, readAt: null },
      data: { readAt: new Date() }
    })

    res.json({ messages: match.conversation?.messages || [] })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/matches/:id/messages — A.3: validate membership
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Mensagem vazia.' })

    const profileId = await getUserProfileId(req.userId!)
    if (!profileId) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    // A.3: verify user belongs to this match
    const isMember = await verifyMatchMembership(req.params.id, profileId)
    if (!isMember) return res.status(403).json({ error: 'Sem acesso a esta conversa.' })

    const match = await prisma.match.findUnique({
      where: { id: req.params.id }, include: { conversation: true }
    })
    if (!match?.conversation) return res.status(404).json({ error: 'Conversa não encontrada.' })
    if (match.status === 'BLOCKED') return res.status(403).json({ error: 'Esta conversa foi bloqueada.' })

    const message = await prisma.message.create({
      data: {
        conversationId: match.conversation.id,
        senderUserId: req.userId!,
        body: body.trim(),
        messageType: 'TEXT'
      }
    })

    // 11.1 — both check their own condition and no-op if already fired/not
    // yet met; safe to call on every message without extra state here.
    const conversationId = match.conversation.id
    import('../lib/recommendationSignalService').then(({ evaluateConversationStarted, evaluateSustainedConversation }) => {
      evaluateConversationStarted(conversationId).catch(() => {})
      evaluateSustainedConversation(conversationId).catch(() => {})
    }).catch(() => {})

    res.status(201).json(message)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})


// POST /api/matches/accept/:fromProfileId — accept connection request
router.post('/accept/:fromProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — was `user.findUnique(...).profile`, the direct
    // Profile.userId relation, same Active Profile Context bug class
    // fixed across discovery.ts this same sprint (6.6's header comment
    // above already fixed this for GET /, but these two POST routes were
    // missed). getUserProfileId === resolveMyProfileId.
    const viewerProfileId = await getUserProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })
    const viewerProfile = await prisma.profile.findUnique({ where: { id: viewerProfileId } })
    if (!viewerProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // BETA.4 typecheck fix — no longer includes `user` here: fromProfile.userId
    // is null for a COUPLE/GROUP requester (see notify.ts's
    // getNotificationUserIdsForProfile comment), so `fromProfile.user.id`
    // wasn't usable directly anyway — this matters more now that a
    // couple/group can itself be the one sending the connection request.
    // The notification below now goes through notifyProfileMembers, which
    // resolves the right recipient(s) itself.
    const fromProfile = await prisma.profile.findUnique({
      where: { id: req.params.fromProfileId }
    })
    if (!fromProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Verify there's a like from them to us
    const theirLike = await prisma.profileAction.findFirst({
      where: { actorProfileId: fromProfile.id, targetProfileId: viewerProfile.id, action: 'LIKE' }
    })
    if (!theirLike) return res.status(400).json({ error: 'Sem pedido de ligação pendente.' })

    // Check if match already exists
    const existing = await prisma.match.findFirst({
      where: { OR: [
        { profileOneId: viewerProfile.id, profileTwoId: fromProfile.id },
        { profileOneId: fromProfile.id, profileTwoId: viewerProfile.id },
      ]}
    })
    if (existing) return res.json({ ok: true, matchId: existing.id, alreadyMatched: true })

    // BETA.4 — this route creates its Match row directly (predates
    // matchService.transition() being the documented single source of
    // truth for Match.status writes — see matchService.ts's 5.9 comment),
    // so the FREE-plan active-match cap isn't enforced automatically the
    // way it is for the CREATE/ACTIVATE paths inside transition(). Same
    // shared helper, checked explicitly here instead.
    const { checkActiveMatchCapacity } = await import('../lib/matchService')
    const capacity = await checkActiveMatchCapacity(fromProfile.id, viewerProfile.id)
    if (!capacity.ok) {
      return res.status(403).json({ error: 'Limite de conversas ativas atingido.', code: 'ACTIVE_MATCH_LIMIT' })
    }

    // Create match + conversation
    const match = await prisma.match.create({
      data: {
        profileOneId: fromProfile.id,
        profileTwoId: viewerProfile.id,
        status: 'ACTIVE',
        matchedAt: new Date(),
        conversation: { create: { type: 'ONE_TO_ONE' } }
      }
    })

    // Record our like too
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewerProfile.id, targetProfileId: fromProfile.id } },
      update: { action: 'LIKE' },
      create: { actorProfileId: viewerProfile.id, targetProfileId: fromProfile.id, action: 'LIKE' }
    })

    // Notify the requester — every member if fromProfile is a couple/group
    // (BETA.4 fix; was `notifyUser(fromProfile.user.id, ...)`, which only
    // ever worked for an INDIVIDUAL requester).
    const { notifyProfileMembers } = await import('../lib/notify')
    notifyProfileMembers(fromProfile.id, 'match',
      '💫 Ligação aceite!',
      `${viewerProfile.displayName || 'Alguém'} aceitou a tua ligação. Podem conversar agora.`,
      { matchId: match.id, tab: 'matches' }
    ).catch(() => {})

    res.json({ ok: true, matchId: match.id })
  } catch (err: any) {
    console.error('[ACCEPT REQUEST]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/matches/reject/:fromProfileId — reject connection request
router.post('/reject/:fromProfileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // BETA.3 fix — same Active Profile Context bug class as accept above.
    const viewerProfileId = await getUserProfileId(req.userId!)
    if (!viewerProfileId) return res.status(404).json({ error: 'Perfil não encontrado.' })

    // Record pass action
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: viewerProfileId, targetProfileId: req.params.fromProfileId } },
      update: { action: 'PASS' },
      create: { actorProfileId: viewerProfileId, targetProfileId: req.params.fromProfileId, action: 'PASS' }
    })
    res.json({ ok: true })
  } catch (err: any) { res.status(500).json({ error: 'Erro interno.' }) }
})

export default router

