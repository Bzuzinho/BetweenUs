import { Router, Response } from 'express'
import { createHash } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const hashContact = (value: string) =>
  createHash('sha256').update(value.toLowerCase().trim()).digest('hex')

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: { intentions: true, privacySettings: true }
    })
    if (!myProfile) return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })

    const { limit = 20, offset = 0, type, city } = req.query

    // Profiles already seen
    const seen = await prisma.profileAction.findMany({
      where: { actorProfileId: myProfile.id },
      select: { targetProfileId: true }
    })
    const seenIds = seen.map(s => s.targetProfileId)

    // Blocked contacts (hashed)
    const myBlockedHashes = await prisma.blockedContactHash.findMany({
      where: { userId: req.userId! },
      select: { contactHash: true }
    })
    const myHashes = new Set(myBlockedHashes.map(b => b.contactHash))

    const myUser = await prisma.user.findUnique({
      where: { id: req.userId! }, select: { email: true }
    })
    const myEmailHash = hashContact(myUser?.email || '')

    // Users who blocked me
    const usersWhoBlockedMe = await prisma.blockedContactHash.findMany({
      where: { contactHash: myEmailHash },
      select: { userId: true }
    })
    const blockedByUserIds = usersWhoBlockedMe.map(u => u.userId)

    const whereClause: any = {
      id: { notIn: [myProfile.id, ...seenIds] },
      // A.1: exclude admins from discovery
      user: {
        adminRole: null,
        id: { notIn: [req.userId!, ...blockedByUserIds] },
        status: 'ACTIVE'
      },
      // A.1: only approved profiles appear
      status: 'APPROVED',
      visibilityMode: { not: 'INVISIBLE' },
    }
    if (type) whereClause.type = type
    if (city) whereClause.city = { contains: city as string, mode: 'insensitive' }

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      include: {
        // A.2: only APPROVED photos appear in discovery
        photos: {
          where: { moderationStatus: 'APPROVED' },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 3
        },
        intentions: { include: { intention: true } },
        privacySettings: true,
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: 'desc' }
    })

    const myIntentionIds = myProfile.intentions.map((i: any) => i.intentionId)

    const scored = profiles.map(profile => {
      let score = 50
      const theirIntentionIds = profile.intentions.map((i: any) => i.intentionId)
      const overlap = myIntentionIds.filter((id: string) => theirIntentionIds.includes(id))
      if (overlap.length > 0) score += 20
      if (myProfile.city && profile.city &&
        myProfile.city.toLowerCase() === profile.city.toLowerCase()) score += 15
      if (profile.photos.length > 0) score += 10
      if (profile.bio) score += 5
      score = Math.min(score, 99)
      const { userId, locationLat, locationLng, ...safe } = profile as any
      return { ...safe, betweenScore: score }
    })

    scored.sort((a, b) => b.betweenScore - a.betweenScore)
    res.json({ profiles: scored, total: scored.length, hasMore: scored.length === Number(limit) })
  } catch (err: any) {
    console.error('[DISCOVERY ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao carregar perfis.' })
  }
})

router.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: myProfile.id, targetProfileId: req.params.id } },
      update: { action: 'LIKE' },
      create: { actorProfileId: myProfile.id, targetProfileId: req.params.id, action: 'LIKE' }
    })

    const theirLike = await prisma.profileAction.findFirst({
      where: { actorProfileId: req.params.id, targetProfileId: myProfile.id, action: 'LIKE' }
    })

    if (theirLike) {
      const existing = await prisma.match.findFirst({
        where: { OR: [
          { profileOneId: myProfile.id, profileTwoId: req.params.id },
          { profileOneId: req.params.id, profileTwoId: myProfile.id }
        ]}
      })
      if (!existing) {
        const match = await prisma.match.create({
          data: {
            profileOneId: myProfile.id, profileTwoId: req.params.id,
            status: 'ACTIVE', matchedAt: new Date(),
            conversation: { create: { type: 'ONE_TO_ONE' } }
          }
        })
        return res.json({ match: true, matchId: match.id })
      }
    }
    res.json({ match: false })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registar like.' })
  }
})

router.post('/:id/pass', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId! } })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    await prisma.profileAction.upsert({
      where: { actorProfileId_targetProfileId: { actorProfileId: myProfile.id, targetProfileId: req.params.id } },
      update: { action: 'PASS' },
      create: { actorProfileId: myProfile.id, targetProfileId: req.params.id, action: 'PASS' }
    })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
