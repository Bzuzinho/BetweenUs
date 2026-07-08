// BETA.1.11/1.12/1.13 — individual, couple and (conditional) group
// profiles. Depends on the STRUCTURAL seed (npm run db:seed) having
// already run — intentions/boundaries/gender/orientation slugs are
// looked up here, never invented inline (index.ts checks this up front).
import prisma from '../../../src/lib/prisma'
import { upsertTestUser, hashSeedPassword } from './accounts'
import {
  INDIVIDUAL_SCENARIOS, COUPLE_SCENARIOS, GROUP_SCENARIO,
  type IndividualScenario, type CoupleScenario,
} from '../scenarios'
import { isGroupProfilesEnabled } from '../../../src/lib/profileTypePolicy'
import { getOrCreateCurrentAgreement, submitAnswer } from '../../../src/lib/profileAgreementService'

const catalogIds = async () => {
  const [intentions, boundaries] = await Promise.all([
    prisma.intention.findMany({ select: { id: true, slug: true } }),
    prisma.boundary.findMany({ select: { id: true, slug: true } }),
  ])
  return {
    intentionIdBySlug: new Map(intentions.map(i => [i.slug, i.id])),
    boundaryIdBySlug: new Map(boundaries.map(b => [b.slug, b.id])),
  }
}

const defaultPrivacy = (overrides?: IndividualScenario['privacy']) => ({
  visibleInDiscovery: overrides?.visibleInDiscovery ?? true,
  showDistance: overrides?.showDistance ?? true,
  showOnlineStatus: false,
  allowPhotoRequests: overrides?.allowPhotoRequests ?? true,
  invisibleMode: overrides?.invisibleMode ?? false,
  notificationMode: overrides?.notificationMode ?? 'DISCREET',
})

export const createIndividualProfiles = async (): Promise<Record<string, { userId: string; profileId: string }>> => {
  const passwordHash = await hashSeedPassword()
  const { intentionIdBySlug, boundaryIdBySlug } = await catalogIds()
  const out: Record<string, { userId: string; profileId: string }> = {}

  for (const s of INDIVIDUAL_SCENARIOS) {
    const user = await upsertTestUser({
      email: s.email, accountName: s.accountName, testScenarioKey: s.key, passwordHash, status: 'ACTIVE',
    })

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        type: 'INDIVIDUAL', status: 'APPROVED', displayName: s.displayName, bio: s.bio,
        gender: s.gender, orientation: s.orientation, relationshipStatus: s.relationshipStatus as any,
        city: s.city, country: s.country, visibilityMode: s.visibilityMode, discretionLevel: s.discretionLevel,
      },
      create: {
        userId: user.id, type: 'INDIVIDUAL', status: 'APPROVED', displayName: s.displayName, bio: s.bio,
        gender: s.gender, orientation: s.orientation, relationshipStatus: s.relationshipStatus as any,
        city: s.city, country: s.country, visibilityMode: s.visibilityMode, discretionLevel: s.discretionLevel,
        privacySettings: { create: defaultPrivacy(s.privacy) as any },
      },
    })
    // upsert path for privacySettings (idempotent re-run — the profile
    // may already exist from a prior run, in which case `create` above
    // was skipped and privacySettings needs its own upsert).
    await (prisma as any).privacySettings.upsert({
      where: { profileId: profile.id },
      update: defaultPrivacy(s.privacy) as any,
      create: { profileId: profile.id, ...defaultPrivacy(s.privacy) } as any,
    })

    for (const it of s.intentions) {
      const intentionId = intentionIdBySlug.get(it.slug)
      if (!intentionId) { console.warn(`  [WARN] intention slug não encontrado: ${it.slug} (correu 'npm run db:seed'?)`); continue }
      await prisma.profileIntention.upsert({
        where: { profileId_intentionId: { profileId: profile.id, intentionId } },
        update: { preference: it.preference as any },
        create: { profileId: profile.id, intentionId, preference: it.preference as any },
      })
    }
    for (const b of s.boundaries) {
      const boundaryId = boundaryIdBySlug.get(b.slug)
      if (!boundaryId) { console.warn(`  [WARN] boundary slug não encontrado: ${b.slug}`); continue }
      await prisma.profileBoundary.upsert({
        where: { profileId_boundaryId: { profileId: profile.id, boundaryId } },
        update: { preference: b.preference as any },
        create: { profileId: profile.id, boundaryId, preference: b.preference as any },
      })
    }

    if (s.isPremium) {
      await (prisma as any).subscription.upsert({
        where: { userId: user.id },
        update: { plan: 'PREMIUM', status: 'ACTIVE', provider: 'stripe', providerCustomerId: `test_seed_cus_${s.key}`, providerSubscriptionId: `test_seed_sub_${s.key}` },
        create: { userId: user.id, plan: 'PREMIUM', status: 'ACTIVE', provider: 'stripe', providerCustomerId: `test_seed_cus_${s.key}`, providerSubscriptionId: `test_seed_sub_${s.key}` },
      })
    }

    out[s.key] = { userId: user.id, profileId: profile.id }
  }
  console.log(`  Individual profiles: ${INDIVIDUAL_SCENARIOS.length}`)
  return out
}

// BETA.1.10 F/G/H — lifecycle accounts whose Profile itself is the point
// of the scenario (PENDING_REVIEW / REJECTED / HIDDEN). Created here
// (not accounts.ts) because it needs the same Profile-creation shape as
// every other profile in this file.
export const createLifecycleProfiles = async (lifecycleIds: Record<string, string>): Promise<void> => {
  const specs: Array<{ key: string; displayName: string; status: 'PENDING_REVIEW' | 'REJECTED' | 'HIDDEN'; rejectionReason?: string }> = [
    { key: 'lifecycle_profile_pending', displayName: 'Perfil Pendente', status: 'PENDING_REVIEW' },
    { key: 'lifecycle_profile_rejected', displayName: 'Perfil Rejeitado', status: 'REJECTED', rejectionReason: 'Fotos não cumprem as regras da comunidade (cenário de teste).' },
    { key: 'lifecycle_profile_hidden', displayName: 'Perfil Oculto', status: 'HIDDEN' },
  ]
  for (const spec of specs) {
    const userId = lifecycleIds[spec.key]
    if (!userId) continue
    await prisma.profile.upsert({
      where: { userId },
      update: { status: spec.status, displayName: spec.displayName, rejectionReason: spec.rejectionReason || null },
      create: {
        userId, type: 'INDIVIDUAL', status: spec.status, displayName: spec.displayName,
        gender: 'prefer_not_to_say', orientation: 'prefer_not_to_say', city: 'Lisboa', country: 'Portugal',
        rejectionReason: spec.rejectionReason || null,
        privacySettings: { create: defaultPrivacy() as any },
      },
    })
  }
}

interface CoupleResult {
  profileId: string
  memberUserIds: string[]
}

export const createCoupleProfiles = async (): Promise<Record<string, CoupleResult>> => {
  const passwordHash = await hashSeedPassword()
  const { intentionIdBySlug } = await catalogIds()
  const out: Record<string, CoupleResult> = {}

  for (const c of COUPLE_SCENARIOS) {
    const memberUsers = []
    for (const m of c.members) {
      const u = await upsertTestUser({ email: m.email, accountName: m.accountName, testScenarioKey: c.key, passwordHash, status: 'ACTIVE' })
      memberUsers.push(u)
    }
    const creatorUserId = memberUsers[0].id

    const isComplete = c.members.length === 2
    const coupleStatus = isComplete ? 'ACTIVE' : 'PENDING_PARTNER'
    const discretionLevel = c.maxPrivacy ? 'MAXIMUM' : 'SELECTIVE'
    const visibilityMode = c.maxPrivacy ? 'MATCHES_ONLY' : 'PUBLIC'

    // Profile is owned (userId) by the creator for schema-compat with
    // pre-ProfileMember code paths still reading Profile.userId directly
    // — ProfileMember below is the real membership source of truth
    // (profileMembershipService.getActiveMembers), matching how
    // production couple creation works today.
    const profile = await prisma.profile.upsert({
      where: { userId: creatorUserId },
      update: { type: 'COUPLE', status: 'APPROVED', displayName: c.displayName, bio: c.bio, city: c.city, country: c.country, discretionLevel: discretionLevel as any, visibilityMode: visibilityMode as any },
      create: {
        userId: creatorUserId, type: 'COUPLE', status: 'APPROVED', displayName: c.displayName, bio: c.bio,
        city: c.city, country: c.country, discretionLevel: discretionLevel as any, visibilityMode: visibilityMode as any,
        privacySettings: { create: defaultPrivacy(c.maxPrivacy ? { visibleInDiscovery: true, showDistance: false } : undefined) as any },
      },
    })
    await (prisma as any).privacySettings.upsert({
      where: { profileId: profile.id },
      update: {}, create: { profileId: profile.id, ...defaultPrivacy() } as any,
    }).catch(() => {})

    await (prisma as any).coupleProfile.upsert({
      where: { profileId: profile.id },
      update: { coupleStatus, partnerOneUserId: creatorUserId, partnerTwoUserId: isComplete ? memberUsers[1].id : null, partnerTwoInviteEmail: c.pendingInviteEmail || null, partnerTwoAcceptedAt: isComplete ? new Date() : null },
      create: { profileId: profile.id, coupleStatus, partnerOneUserId: creatorUserId, partnerTwoUserId: isComplete ? memberUsers[1].id : null, partnerTwoInviteEmail: c.pendingInviteEmail || null, partnerTwoAcceptedAt: isComplete ? new Date() : null },
    })

    // ProfileMember rows — the real membership source of truth.
    await (prisma as any).profileMember.upsert({
      where: { profileId_userId: { profileId: profile.id, userId: creatorUserId } },
      update: { status: 'ACCEPTED', isCreator: true },
      create: { profileId: profile.id, userId: creatorUserId, isCreator: true, status: 'ACCEPTED', respondedAt: new Date() },
    })
    if (isComplete) {
      await (prisma as any).profileMember.upsert({
        where: { profileId_userId: { profileId: profile.id, userId: memberUsers[1].id } },
        update: { status: 'ACCEPTED' },
        create: { profileId: profile.id, userId: memberUsers[1].id, isCreator: false, status: 'ACCEPTED', respondedAt: new Date() },
      })
    } else if (c.pendingInviteEmail) {
      // BETA.1.12 Casal 3 — a real pending invite: no userId, PENDING
      // status, exactly what accepting a couple invite looks like before
      // acceptance. Never becomes a User row.
      const existingInvite = await (prisma as any).profileMember.findFirst({ where: { profileId: profile.id, invitedEmail: c.pendingInviteEmail } })
      if (!existingInvite) {
        await (prisma as any).profileMember.create({
          data: { profileId: profile.id, invitedEmail: c.pendingInviteEmail, status: 'PENDING' },
        })
      }
    }

    for (const it of c.intentions) {
      const intentionId = intentionIdBySlug.get(it.slug)
      if (!intentionId) continue
      await prisma.profileIntention.upsert({
        where: { profileId_intentionId: { profileId: profile.id, intentionId } },
        update: { preference: it.preference as any },
        create: { profileId: profile.id, intentionId, preference: it.preference as any },
      })
    }

    // BETA.1.17 — Modo Acordo, built through the real service (never a
    // hand-set ProfileAgreement.status): submitAnswer's mergePreferences
    // is what actually computes ALIGNED vs CONFLICT vs WAITING_MEMBERS
    // from individual member answers.
    if (isComplete && c.agreementOutcome !== 'NONE') {
      await seedAgreement(profile.id, memberUsers.map(u => u.id), c.agreementOutcome)
    }

    out[c.key] = { profileId: profile.id, memberUserIds: isComplete ? memberUsers.map(u => u.id) : [creatorUserId] }
  }
  console.log(`  Couple profiles: ${COUPLE_SCENARIOS.length}`)
  return out
}

// Drives ProfileAgreementService's real submitAnswer() for both members
// against the AgreementQuestion 'both_validate_match' plus one Boundary
// ('no_emotional_involvement') — enough to reach ALIGNED (both YES),
// CONFLICT (one YES one NO on the boundary), or WAITING_MEMBERS (only one
// member has answered).
const seedAgreement = async (profileId: string, memberUserIds: string[], outcome: 'ALIGNED' | 'CONFLICT' | 'WAITING_MEMBERS') => {
  const question = await (prisma as any).agreementQuestion.findUnique({ where: { slug: 'both_validate_match' } })
  const boundary = await prisma.boundary.findUnique({ where: { slug: 'no_emotional_involvement' } })
  if (!question && !boundary) return

  await getOrCreateCurrentAgreement(profileId)

  const [userA, userB] = memberUserIds
  if (question) {
    await submitAnswer(profileId, userA, { agreementQuestionId: question.id }, 'YES')
    if (outcome !== 'WAITING_MEMBERS') {
      await submitAnswer(profileId, userB, { agreementQuestionId: question.id }, 'YES')
    }
  }
  if (boundary && outcome !== 'WAITING_MEMBERS') {
    await submitAnswer(profileId, userA, { boundaryId: boundary.id }, 'YES')
    await submitAnswer(profileId, userB, { boundaryId: boundary.id }, outcome === 'CONFLICT' ? 'NO' : 'YES')
  }
}

export const createGroupProfile = async (): Promise<CoupleResult | null> => {
  if (!isGroupProfilesEnabled()) {
    console.log('  Group profile: saltado (GROUP_PROFILES_ENABLED=false)')
    return null
  }
  const passwordHash = await hashSeedPassword()
  const g = GROUP_SCENARIO
  const memberUsers = []
  for (const m of g.members) {
    const u = await upsertTestUser({ email: m.email, accountName: m.accountName, testScenarioKey: g.key, passwordHash, status: 'ACTIVE' })
    memberUsers.push(u)
  }
  const creatorUserId = memberUsers[0].id

  const profile = await prisma.profile.upsert({
    where: { userId: creatorUserId },
    update: { type: 'GROUP', status: 'APPROVED', displayName: g.displayName },
    create: {
      userId: creatorUserId, type: 'GROUP', status: 'APPROVED', displayName: g.displayName,
      bio: 'Trio poliamoroso, juntos há cerca de um ano.', city: 'Lisboa', country: 'Portugal',
      privacySettings: { create: defaultPrivacy() as any },
    },
  })

  for (const [i, u] of memberUsers.entries()) {
    await (prisma as any).profileMember.upsert({
      where: { profileId_userId: { profileId: profile.id, userId: u.id } },
      update: { status: 'ACCEPTED' },
      create: { profileId: profile.id, userId: u.id, isCreator: i === 0, status: 'ACCEPTED', respondedAt: new Date() },
    })
  }
  console.log('  Group profile: 1 (3 membros)')
  return { profileId: profile.id, memberUserIds: memberUsers.map(u => u.id) }
}
