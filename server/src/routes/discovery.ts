import { Router, Response } from 'express'
import { createHash } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const hashContact = (value: string) =>
  createHash('sha256').update(value.toLowerCase().trim()).digest('hex')

// GET /api/discovery
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: {
        intentions: true,
        boundaries: true,
        privacySettings: true
      }
    })

    if (!myProfile) {
      return res.status(404).json({ error: 'Cria o teu perfil primeiro.' })
    }

    const { limit = 20, offset = 0, type, city } = req.query

    // Perfis já vistos
    const seen = await prisma.profileAction.findMany({
      where: { actorProfileId: myProfile.id },
      select: { targetProfileId: true }
    })
    const seenIds = seen.map(s => s.targetProfileId)

    // Perfis de utilizadores que bloquearam este utilizador ou vice-versa
    const myBlockedHashes = await prisma.blockedContactHash.findMany({
      where: { userId: req.userId! },
      select: { contactHash: true }
    })
    const myHashes = new Set(myBlockedHashes.map(b => b.contactHash))

    // Get all users whose email hash matches my blocked list
    const myEmailHash = hashContact(
      (await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { email: true }
      }))?.email || ''
    )

    // Users who blocked me
    const usersWhoBlockedMe = await prisma.blockedContactHash.findMany({
      where: { contactHash: myEmailHash },
      select: { userId: true }
    })
    const blockedByUserIds = usersWhoBlockedMe.map(u => u.userId)

    const whereClause: any = {
      id: { notIn: [myProfile.id, ...seenIds] },
      status: 'active',
      visibilityMode: { not: 'INVISIBLE' },
      userId: { notIn: [req.userId!, ...blockedByUserIds] }
    }
    if (type) whereClause.type = type
    if (city) whereClause.city = { contains: city as string, mode: 'insensitive' }

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      include: {
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
      const overlap = myIntentionIds.filter((id: string) =>
        theirIntentionIds.includes(id))
      if (overlap.length > 0) score += 20

      if (myProfile.city && profile.city &&
          myProfile.city.toLowerCase() === profile.city.toLowerCase()) {
        score += 15
      }
      if (profile.photos.length > 0) score += 10
      if (profile.bio) score += 5
      score = Math.min(score, 99)

      const { userId, locationLat, locationLng, ...safe } = profile as any
      return { ...safe, betweenScore: score }
    })

    scored.sort((a, b) => b.betweenScore - a.betweenScore)

    res.json({ profiles: scored, total: scored.length,
      hasMore: scored.length === Number(limit) })
  } catch (err: any) {
    console.error('[DISCOVERY ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao carregar perfis.' })
  }
})

// POST /api/discovery/:id/like
router.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    await prisma.profileAction.upsert({
      where: {
        actorProfileId_targetProfileId: {
          actorProfileId: myProfile.id,
          targetProfileId: req.params.id
        }
      },
      update: { action: 'LIKE' },
      create: {
        actorProfileId: myProfile.id,
        targetProfileId: req.params.id,
        action: 'LIKE'
      }
    })

    const theirLike = await prisma.profileAction.findFirst({
      where: {
        actorProfileId: req.params.id,
        targetProfileId: myProfile.id,
        action: 'LIKE'
      }
    })

    if (theirLike) {
      const existing = await prisma.match.findFirst({
        where: {
          OR: [
            { profileOneId: myProfile.id, profileTwoId: req.params.id },
            { profileOneId: req.params.id, profileTwoId: myProfile.id }
          ]
        }
      })
      if (!existing) {
        const match = await prisma.match.create({
          data: {
            profileOneId: myProfile.id,
            profileTwoId: req.params.id,
            status: 'ACTIVE',
            matchedAt: new Date(),
            conversation: { create: { type: 'ONE_TO_ONE' } }
          }
        })
        return res.json({ match: true, matchId: match.id })
      }
    }

    res.json({ match: false })
  } catch (err: any) {
    console.error('[LIKE ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao registar like.' })
  }
})

// POST /api/discovery/:id/pass
router.post('/:id/pass', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const myProfile = await prisma.profile.findUnique({
      where: { userId: req.userId! }
    })
    if (!myProfile) return res.status(404).json({ error: 'Perfil não encontrado.' })

    await prisma.profileAction.upsert({
      where: {
        actorProfileId_targetProfileId: {
          actorProfileId: myProfile.id,
          targetProfileId: req.params.id
        }
      },
      update: { action: 'PASS' },
      create: {
        actorProfileId: myProfile.id,
        targetProfileId: req.params.id,
        action: 'PASS'
      }
    })

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registar pass.' })
  }
})

export default router
