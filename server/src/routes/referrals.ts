import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { getOrCreateReferralCode } from '../lib/referralService'

const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')

const router = Router()

// GET /api/referrals/me — my code, link, and progress toward the next reward
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const referralCode = await getOrCreateReferralCode(req.userId!)
    const rule = await (prisma as any).referralRule.findFirst() || { referralsRequired: 2, rewardMonths: 2 }

    const conversions = await (prisma as any).referralConversion.findMany({
      where: { referralCodeId: referralCode.id },
      select: { subscribedAt: true, creditGranted: true }
    })

    const totalReferred = conversions.length
    const totalSubscribed = conversions.filter((c: any) => c.subscribedAt).length
    const unclaimed = conversions.filter((c: any) => c.subscribedAt && !c.creditGranted).length
    const rewardsGranted = conversions.filter((c: any) => c.creditGranted).length / rule.referralsRequired

    res.json({
      code: referralCode.code,
      link: `${CLIENT_URL}/register?ref=${referralCode.code}`,
      totalReferred, totalSubscribed,
      progress: { current: unclaimed, required: rule.referralsRequired },
      rewardsGranted: Math.floor(rewardsGranted),
      rule: { referralsRequired: rule.referralsRequired, rewardMonths: rule.rewardMonths }
    })
  } catch (err: any) {
    console.error('[REFERRALS ME]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
