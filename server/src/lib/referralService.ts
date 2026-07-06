import prisma from './prisma'
import { randomBytes } from 'crypto'
import { notifyUser } from './notify'

const generateCode = () => randomBytes(4).toString('hex').toUpperCase() // e.g. "A1B2C3D4"

// Returns the caller's referral code, creating one if they don't have it yet.
export async function getOrCreateReferralCode(userId: string) {
  const existing = await (prisma as any).referralCode.findUnique({ where: { userId } })
  if (existing) return existing

  // Retry a few times on the (very unlikely) code collision
  for (let i = 0; i < 5; i++) {
    try {
      return await (prisma as any).referralCode.create({ data: { userId, code: generateCode() } })
    } catch (err: any) {
      if (i === 4) throw err
    }
  }
}

async function getReferralRule() {
  const existing = await (prisma as any).referralRule.findFirst()
  if (existing) return existing
  return (prisma as any).referralRule.create({ data: {} }) // defaults: 2 referrals → 2 months
}

// Call at registration time, if the new user came in via a referral code.
export async function recordReferral(referredUserId: string, code: string) {
  const referralCode = await (prisma as any).referralCode.findUnique({ where: { code: code.trim().toUpperCase() } })
  if (!referralCode) return null
  if (referralCode.userId === referredUserId) return null // can't refer yourself

  try {
    return await (prisma as any).referralConversion.create({
      data: { referralCodeId: referralCode.id, referredUserId }
    })
  } catch {
    return null // already recorded (unique referredUserId) — ignore
  }
}

// Call whenever a user's subscription becomes active (Stripe checkout.session.completed).
// Marks their conversion as subscribed, and grants the referrer's reward once the
// configurable threshold of subscribed referrals is reached.
export async function processReferralSubscription(referredUserId: string) {
  const conversion = await (prisma as any).referralConversion.findUnique({
    where: { referredUserId },
    include: { referralCode: true }
  })
  if (!conversion || conversion.subscribedAt) return // not referred, or already processed

  await (prisma as any).referralConversion.update({
    where: { id: conversion.id },
    data: { subscribedAt: new Date() }
  })

  const referrerId = conversion.referralCode.userId
  const rule = await getReferralRule()

  const unclaimedSubscribed = await (prisma as any).referralConversion.findMany({
    where: { referralCode: { userId: referrerId }, subscribedAt: { not: null }, creditGranted: false },
    orderBy: { subscribedAt: 'asc' }
  })

  if (unclaimedSubscribed.length < rule.referralsRequired) return

  // Consume exactly `referralsRequired` conversions and grant the reward
  const toConsume = unclaimedSubscribed.slice(0, rule.referralsRequired)
  await (prisma as any).referralConversion.updateMany({
    where: { id: { in: toConsume.map((c: any) => c.id) } },
    data: { creditGranted: true }
  })

  const existingSub = await prisma.subscription.findUnique({ where: { userId: referrerId } })
  const now = new Date()
  const rewardMs = rule.rewardMonths * 30 * 24 * 60 * 60 * 1000
  const base = existingSub?.currentPeriodEnd && existingSub.currentPeriodEnd > now ? existingSub.currentPeriodEnd : now
  const newPeriodEnd = new Date(base.getTime() + rewardMs)

  await prisma.subscription.upsert({
    where: { userId: referrerId },
    update: {
      plan: existingSub?.plan && existingSub.plan !== 'FREE' ? existingSub.plan : 'PREMIUM',
      status: 'ACTIVE',
      currentPeriodEnd: newPeriodEnd,
      ...(!existingSub?.currentPeriodStart && { currentPeriodStart: now }),
    },
    create: {
      userId: referrerId, plan: 'PREMIUM', status: 'ACTIVE',
      currentPeriodStart: now, currentPeriodEnd: newPeriodEnd,
    }
  })

  notifyUser(referrerId, 'referral_reward',
    '🎁 Recompensa de convites!',
    `${rule.referralsRequired} pessoas que convidaste subscreveram. Ganhaste ${rule.rewardMonths} meses premium.`,
    { tab: 'premium' }
  ).catch(() => {})
}
