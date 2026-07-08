// BETA.1.26 — Travel Mode scenarios, replicating routes/travel.ts's own
// creation/approval logic (there is no separate travelService.ts to
// import — this IS how the real route builds a TravelMode/
// TravelModeApproval, just called directly instead of through HTTP).
// BETA.1.27 — Subscription states (individual_miguel's PREMIUM is already
// seeded in profiles.ts; this file adds the remaining plan/status
// combinations not otherwise covered by a named individual scenario).
import prisma from '../../../src/lib/prisma'
import { getActiveMembers } from '../../../src/lib/profileMembershipService'
import { isApprovalSatisfied } from '../../../src/lib/approvalPolicyService'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

const relativeDate = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

export const seedTravelModes = async (individuals: ProfileMap, couples: ProfileMap): Promise<void> => {
  let count = 0

  // 1. ACTIVE trip — Catarina, Lisboa -> Porto, already SCHEDULED (individual, no approval needed).
  const catarina = individuals['individual_catarina']?.profileId
  if (catarina) {
    const existing = await prisma.travelMode.findFirst({ where: { profileId: catarina, city: 'Porto' } })
    if (!existing) {
      await prisma.travelMode.create({
        data: { profileId: catarina, city: 'Porto', country: 'Portugal', startDate: relativeDate(-1), endDate: relativeDate(4), active: true, status: 'SCHEDULED', createdByUserId: individuals['individual_catarina']?.userId, approvals: { create: { userId: individuals['individual_catarina']?.userId!, approvedAt: new Date() } } },
      })
      count++
    }
  }

  // 2. SCHEDULED trip (future) — Rui, Madrid.
  const rui = individuals['individual_rui']?.profileId
  if (rui) {
    const existing = await prisma.travelMode.findFirst({ where: { profileId: rui, city: 'Madrid' } })
    if (!existing) {
      await prisma.travelMode.create({
        data: { profileId: rui, city: 'Madrid', country: 'Espanha', startDate: relativeDate(20), endDate: relativeDate(25), active: true, status: 'SCHEDULED', createdByUserId: individuals['individual_rui']?.userId, approvals: { create: { userId: individuals['individual_rui']?.userId!, approvedAt: new Date() } } },
      })
      count++
    }
  }

  // 3. EXPIRED trip — Noa, a window that already ended.
  const noa = individuals['individual_noa']?.profileId
  if (noa) {
    const existing = await prisma.travelMode.findFirst({ where: { profileId: noa, city: 'Coimbra' } })
    if (!existing) {
      await prisma.travelMode.create({
        data: { profileId: noa, city: 'Coimbra', country: 'Portugal', startDate: relativeDate(-30), endDate: relativeDate(-25), active: false, status: 'SCHEDULED', createdByUserId: individuals['individual_noa']?.userId, approvals: { create: { userId: individuals['individual_noa']?.userId!, approvedAt: new Date() } } },
      })
      count++
    }
  }

  // 4. CANCELLED trip — Diogo, explicitly cancelled.
  const diogo = individuals['individual_diogo']?.profileId
  if (diogo) {
    const existing = await prisma.travelMode.findFirst({ where: { profileId: diogo, city: 'Braga' } })
    if (!existing) {
      await prisma.travelMode.create({
        data: { profileId: diogo, city: 'Braga', country: 'Portugal', startDate: relativeDate(10), endDate: relativeDate(12), active: false, status: 'CANCELLED', createdByUserId: individuals['individual_diogo']?.userId, approvals: { create: { userId: individuals['individual_diogo']?.userId!, approvedAt: new Date() } } },
      })
      count++
    }
  }

  // 5/6 — Couple 4 travel: WAITING_MEMBER_APPROVAL then fully approved ->
  // SCHEDULED, matching COUPLE_SCENARIOS' couple_4_travel manifest entry.
  const c4 = couples['couple_4_travel']
  if (c4) {
    const existing = await prisma.travelMode.findFirst({ where: { profileId: c4.profileId, city: 'Porto' } })
    let travel = existing
    if (!travel) {
      const members = await getActiveMembers(c4.profileId)
      travel = await prisma.travelMode.create({
        data: {
          profileId: c4.profileId, city: 'Porto', country: 'Portugal', startDate: relativeDate(15), endDate: relativeDate(17),
          createdByUserId: members[0]?.userId, active: false, status: 'WAITING_MEMBER_APPROVAL',
          approvals: { create: { userId: members[0]?.userId!, approvedAt: new Date() } },
        },
      })
      count++
    }
    if (travel && travel.status === 'WAITING_MEMBER_APPROVAL') {
      for (const uid of c4.memberUserIds || []) {
        await prisma.travelModeApproval.upsert({
          where: { travelModeId_userId: { travelModeId: travel.id, userId: uid } },
          update: { approvedAt: new Date() }, create: { travelModeId: travel.id, userId: uid, approvedAt: new Date() },
        })
      }
      const approvals = await prisma.travelModeApproval.findMany({ where: { travelModeId: travel.id, approvedAt: { not: null } } })
      const approvedIds = new Set<string>(approvals.map((a: any) => a.userId as string))
      if (await isApprovalSatisfied(c4.profileId, approvedIds)) {
        await prisma.travelMode.update({ where: { id: travel.id }, data: { status: 'SCHEDULED', active: true } })
      }
    }
  }

  console.log(`  Travel Mode scenarios: ${count + (c4 ? 1 : 0)}`)
}

export const seedSubscriptions = async (individuals: ProfileMap, couples: ProfileMap): Promise<void> => {
  let count = 0
  const upsertSub = async (userId: string | undefined, key: string, data: any) => {
    if (!userId) return
    await prisma.subscription.upsert({
      where: { userId },
      update: data,
      create: { userId, provider: 'stripe', providerCustomerId: `test_seed_cus_${key}`, providerSubscriptionId: `test_seed_sub_${key}`, ...data },
    })
    count++
  }

  // FREE — explicit row (most accounts have none, which already means
  // FREE by default; Leonor gets an explicit FREE Subscription row so the
  // admin subscriptions list has a real FREE example to show).
  await upsertSub(individuals['individual_leonor']?.userId, 'leonor_free', { plan: 'FREE', status: 'ACTIVE' })

  // COUPLE_PREMIUM ACTIVE — couple_1's creator (a couple-level plan, billed to one member).
  const c1Creator = couples['couple_1_third_match']?.memberUserIds?.[0]
  await upsertSub(c1Creator, 'couple1_premium', { plan: 'COUPLE_PREMIUM', status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })

  // PREMIUM CANCELLED — Rui.
  await upsertSub(individuals['individual_rui']?.userId, 'rui_cancelled', { plan: 'PREMIUM', status: 'CANCELLED', cancelledAt: new Date() })

  // PREMIUM PAST_DUE — Diogo.
  await upsertSub(individuals['individual_diogo']?.userId, 'diogo_pastdue', { plan: 'PREMIUM', status: 'PAST_DUE' })

  // TRIALING — Ines.
  await upsertSub(individuals['individual_ines']?.userId, 'ines_trialing', { plan: 'PREMIUM', status: 'TRIALING', currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

  console.log(`  Subscription scenarios: ${count} (+ individual_miguel PREMIUM ACTIVE de profiles.ts)`)
}
