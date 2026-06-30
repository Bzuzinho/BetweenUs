import prisma from './prisma'

// C.5 — Calculate internal risk score for moderation prioritization
// Not shown publicly — helps admin prioritize review
export const calculateRiskScore = async (userId: string): Promise<number> => {
  let score = 0

  const [
    reportsReceived,
    reportsResolved,
    blocksReceived,
    photosRejected,
    messagesRemoved,
    verification,
    user
  ] = await Promise.all([
    prisma.report.count({ where: { reportedUserId: userId } }),
    prisma.report.count({ where: { reportedUserId: userId, status: 'RESOLVED' } }),
    prisma.profileAction.count({
      where: { action: 'BLOCK', target: { userId } }
    }),
    prisma.profilePhoto.count({
      where: { profile: { userId }, moderationStatus: 'REJECTED' }
    }),
    prisma.message.count({
      where: { senderUserId: userId, removedByAdmin: true }
    }),
    prisma.verification.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } })
  ])

  // Weighted factors
  score += reportsReceived * 8
  score += reportsResolved * 15  // procedente reports weigh more
  score += blocksReceived * 5
  score += photosRejected * 10
  score += messagesRemoved * 12

  // Reduce score for trust signals
  if (verification?.status === 'APPROVED') score -= 15
  if (user?.createdAt) {
    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (accountAgeDays > 90) score -= 10
    else if (accountAgeDays > 30) score -= 5
  }

  return Math.max(0, Math.min(100, score))
}

export const recalculateRiskScore = async (userId: string): Promise<number> => {
  const score = await calculateRiskScore(userId)
  await prisma.user.update({ where: { id: userId }, data: { riskScore: score } })
  return score
}

// Recalculate all users (for cron/batch job)
export const recalculateAllRiskScores = async (): Promise<{ updated: number }> => {
  const users = await prisma.user.findMany({ select: { id: true } })
  let updated = 0
  for (const u of users) {
    await recalculateRiskScore(u.id)
    updated++
  }
  return { updated }
}
