// 4.8 — aggregate-only compatibility for private interests. Deliberately
// returns a count, never the underlying slugs — see privateInterests.ts
// for why (no public exposure without a future explicit-consent reveal).
import prisma from './prisma'

export const countAlignedPrivateInterests = async (profileAId: string, profileBId: string): Promise<number> => {
  const [a, b] = await Promise.all([
    (prisma as any).profilePrivateInterest.findMany({ where: { profileId: profileAId, preference: 'YES' }, select: { interestId: true } }),
    (prisma as any).profilePrivateInterest.findMany({ where: { profileId: profileBId, preference: 'YES' }, select: { interestId: true } })
  ])
  const bIds = new Set(b.map((x: any) => x.interestId))
  return a.filter((x: any) => bIds.has(x.interestId)).length
}
