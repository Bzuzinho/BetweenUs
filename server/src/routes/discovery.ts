import { Router, Response } from 'express'
import { createHmac } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createLikeOrMatch, recordPass } from '../lib/matchService'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

// Point 14: no insecure fallback in production
const getContactHashSecret = (): string => {
  const secret = process.env.CONTACT_HASH_SECRET
  if (isProd && !secret) {
    throw new Error('CONTACT_HASH_SECRET obrigatório em produção.')
  }
  return secret || 'dev-only-insecure-fallback-secret'
}

const hashContact = (value: string) =>
  createHmac('sha256', getContactHashSecret()).update(value.toLowerCase().trim()).digest('hex')

const getVerificationBadges = (profile: any, user: any, verification: any): string[] => {
  const badges: string[] = []
  if (user?.emailVerifiedAt) badges.push('email_verified')
  if (user?.dateOfBirth) badges.push('age_declared')
  if (verification?.status === 'APPROVED') badges.push('selfie_verified')
  if (profile.type === 'COUPLE' && profile.coupleProfile?.coupleStatus === 'ACTIVE') badges.push('couple_confirmed')
  if (profile.photos?.some((p: any) => p.moderationStatus === 'APPROVED')) badges.push('photos_reviewed')
  if (user?.subscription?.plan !== 'FREE') badges.push('premium_active')
  return badges
}

const calculateScore = (myProfile: any, profile: any, myIntentionIds: string[]) => {
  let score = 50
  const factors: string[] = []
  const warnings: string[] = []

  const theirIntentionIds = profile.intentions.map((i: any) => i.intentionId)
  const overlap = myIntentionIds.filter((id: string) => theirIntentionIds.includes(id))

  if (overlap.length >= 3) { score += 25; factors.push('Intenções muito compatíveis') }
  else if (overlap.length >= 1) { score += 15; factors.push('Algumas intenções em comum') }
  else { score -= 10; warnings.push('Intenções diferentes') }

  if (myProfile.city && profile.city && myProfile.city.toLowerCase() === profile.city.toLowerCase()) {
    score += 12; factors.push('Mesma cidade')
  }
  if (profile.photos?.length >= 3) { score += 8; factors.push('Perfil com fotos') }
  else if (profile.photos?.length >= 1) { score += 4 }
  if (profile.bio && profile.bio.length > 50) { score += 5; factors.push('Bio detalhada') }
  if (profile.verificationBadges?.includes('selfie_verified')) { score += 8; factors.push('Perfil verificado') }
  if (profile.verificationBadges?.includes('couple_confirmed')) { score += 5; factors.push('Casal confirmado') }

  const myBoundaryNos = myProfile.boundaries?.filter((b: any) => b.preference === 'NO').map((b: any) => b.boundaryId) || []
  const theirBoundaryYes = profile.boundaries?.filter((b: any) => b.preference === 'YES').map((b: any) => b.boundaryId) || []
  const conflicts = myBoundaryNos.filter((id: string) => theirBoundaryYes.includes(id))
  if (conflicts.length > 0) { score -= conflicts.length * 10; warnings.push(`${conflicts.length} limite(s) incompatível(is)`) }

  score = Math.max(10, Math.min(99, score))

  let explanation = ''
  if (score >= 80) explanation = `Compatibilidade alta: ${factors.slice(0,2).join(', ')}.`
  else if (score >= 60) explanation = `Compatibilidade média: ${factors[0] || 'alguns pontos em comum'}.`
  else explanation = `Compatibilidade baixa: ${warnings[0] || 'poucos pontos em comum'}.`
  if (warnings.length > 0 && score < 80) explanation += ` Nota: ${warnings[0]}.`

  return { score, factors, warnings, explanation }
}

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { intentions: true, boundaries: true, privacySettings: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const { limit = 20, offset = 0, type, city } = req.query

    const seen = await prisma.profileAction.findMany({
      where: { actorProfileId: myProfile.id }, select: { targetProfileId: true }
    })
    const seenIds = seen.map(s => s.targetProfileId)

    const myUser = await prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true } })
    const myEmailHash = hashContact(myUser?.email || '')

    const usersWhoBlockedMe = await prisma.blockedContactHash.findMany({
      where: { contactHash: myEmailHash }, select: { userId: true }
    })
    const blockedByUserIds = usersWhoBlockedMe.map(u => u.userId)

    const whereClause: any = {
      id: { notIn: [myProfile.id, ...seenIds] },
      user: { adminRole: null, id: { notIn: [req.userId!, ...blockedByUserIds] }, status: 'ACTIVE' },
      status: 'APPROVED',
      visibilityMode: { not: 'INVISIBLE' },
    }
    if (type) whereClause.type = type
    if (city) whereClause.city = { contains: city as string, mode: 'insensitive' }

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      include: {
        photos: { where: { moderationStatus: 'APPROVED' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 3 },
        intentions: { include: { intention: true } },
        boundaries: true,
        privacySettings: true,
        coupleProfile: true,
        user: {
          select: {
            emailVerifiedAt: true, dateOfBirth: true,
            subscription: { select: { plan: true } },
            verification: { select: { status: true } }
          }
        }
      },
      take: Number(limit), skip: Number(offset),
      orderBy: { createdAt: 'desc' }
    })

    const myIntentionIds = myProfile.intentions.map((i: any) => i.intentionId)

    const scored = profiles.map(profile => {
      const verificationBadges = getVerificationBadges(profile, profile.user, profile.user?.verification)
      const profileWithBadges = { ...profile, verificationBadges }
      const { score, factors, warnings, explanation } = calculateScore(myProfile, profileWithBadges, myIntentionIds)
      const { userId, locationLat, locationLng, user, ...safe } = profile as any
      return { ...safe, betweenScore: score, verificationBadges, scoreExplanation: explanation, scoreFactors: factors, scoreWarnings: warnings }
    })

    scored.sort((a, b) => b.betweenScore - a.betweenScore)
    res.json({ profiles: scored, total: scored.length, hasMore: scored.length === Number(limit) })
  } catch (err: any) {
    console.error('[DISCOVERY ERROR]', err.message)
    res.status(500).json({ error: err.message?.includes('CONTACT_HASH_SECRET') ? err.message : 'Erro ao carregar perfis.' })
  }
})

// Point 9: like now goes through the shared service — no more duplicated logic.
// If either side is an active couple, this automatically returns a
// PENDING_COUPLE_APPROVAL match instead of an ACTIVE one.
router.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const result = await createLikeOrMatch(myProfile.id, req.params.id)

    switch (result.kind) {
      case 'ERROR':
        return res.status(400).json({ error: result.message })
      case 'LIKE_RECORDED':
        return res.json({ match: false })
      case 'ALREADY_MATCHED':
        return res.json({ match: true, matchId: result.matchId })
      case 'MATCH_CREATED':
        return res.json({ match: true, matchId: result.matchId })
      case 'MATCH_PENDING_COUPLE_APPROVAL':
        return res.json({
          match: false, pendingCoupleApproval: true, matchId: result.matchId,
          message: 'Há um casal envolvido — o match requer aprovação de ambos os membros.'
        })
      default:
        return res.json({ match: false })
    }
  } catch (err: any) {
    console.error('[LIKE ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao registar like.' })
  }
})

router.post('/:id/pass', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    await recordPass(myProfile.id, req.params.id)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
