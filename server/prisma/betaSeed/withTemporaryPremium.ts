import prisma from '../../src/lib/prisma'

/**
 * Beta-seed only helper.
 *
 * The production connection flow correctly enforces commercial gates such as
 * the FREE minimum compatibility score and active-match cap. The deterministic
 * beta dataset, however, must create specific lifecycle scenarios regardless
 * of those commercial gates so the validators can exercise ACTIVE, PAUSED,
 * ENDED, BLOCKED and multi-party approval states.
 *
 * This helper temporarily grants PREMIUM while a seed phase creates those
 * scenarios, then restores every pre-existing subscription exactly to its
 * previous commercial state and removes rows created only for the seed phase.
 * It never runs from application routes.
 */
export const withTemporaryPremium = async <T>(
  rawUserIds: Array<string | undefined>,
  work: () => Promise<T>,
): Promise<T> => {
  const userIds = [...new Set(rawUserIds.filter((id): id is string => Boolean(id)))]
  if (userIds.length === 0) return work()

  const existing = await prisma.subscription.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      cancelledAt: true,
    },
  })
  const previousByUser = new Map(existing.map(row => [row.userId, row]))
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  for (const userId of userIds) {
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: 'PREMIUM',
        status: 'ACTIVE',
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      create: {
        userId,
        provider: 'stripe',
        providerCustomerId: `test_seed_temp_cus_${userId}`,
        providerSubscriptionId: `test_seed_temp_sub_${userId}`,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
      },
    })
  }

  try {
    return await work()
  } finally {
    for (const userId of userIds) {
      const previous = previousByUser.get(userId)
      if (!previous) {
        await prisma.subscription.deleteMany({ where: { userId } })
        continue
      }
      await prisma.subscription.update({
        where: { userId },
        data: {
          plan: previous.plan,
          status: previous.status,
          currentPeriodStart: previous.currentPeriodStart,
          currentPeriodEnd: previous.currentPeriodEnd,
          cancelAtPeriodEnd: previous.cancelAtPeriodEnd,
          cancelledAt: previous.cancelledAt,
        },
      })
    }
  }
}
