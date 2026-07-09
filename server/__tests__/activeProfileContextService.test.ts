// BETA.2 (FASE E) — ActiveProfileContextService (FASE C.2): exercises
// getAvailableContexts/resolveActiveProfileId/switchActiveProfile against a
// real DB. Covers BETA.2.32 items 18/19/20/22/23/24 (individual profile
// exists for shared member, shared-only vs individual-and-shared default
// resolution, unauthorized/valid profile switch, context isolation).
import {
  getAvailableContexts, resolveActiveProfileId, switchActiveProfile,
} from '../src/lib/activeProfileContextService'
import { createTestUser, createTestProfile, prisma } from './helpers'

const acceptCoupleMembership = async (profileId: string, creatorId: string, partnerId?: string) => {
  await prisma.coupleProfile.create({
    data: {
      profileId, partnerOneUserId: creatorId, partnerTwoUserId: partnerId || null,
      partnerTwoAcceptedAt: partnerId ? new Date() : null, coupleStatus: partnerId ? 'ACTIVE' : 'PENDING_PARTNER',
    }
  })
  await (prisma as any).profileMember.create({ data: { profileId, userId: creatorId, isCreator: true, status: 'ACCEPTED' } })
  if (partnerId) {
    await (prisma as any).profileMember.create({ data: { profileId, userId: partnerId, isCreator: false, status: 'ACCEPTED' } })
  }
}

describe('ActiveProfileContextService', () => {
  it('individual-only user: exactly one context (their own Individual Profile, role=OWNER)', async () => {
    const user = await createTestUser({ email: 'apc-ind@test.com' })
    const profileId = await createTestProfile(user.id, { type: 'INDIVIDUAL' })

    const contexts = await getAvailableContexts(user.id)
    expect(contexts).toEqual([
      expect.objectContaining({ profileId, type: 'INDIVIDUAL', role: 'OWNER' }),
    ])
  })

  it('couple member: two contexts available (own Individual Profile + the Couple Profile, MEMBER for the non-creator)', async () => {
    const creator = await createTestUser({ email: 'apc-couple-a@test.com' })
    const partner = await createTestUser({ email: 'apc-couple-b@test.com' })
    // BETA.2 (FASE C) — post-schema-change, each member keeps their OWN
    // separate Individual Profile; the Couple Profile is a brand new row
    // with no userId (see schema.prisma's Profile.userId comment).
    const creatorIndividualId = await createTestProfile(creator.id, { type: 'INDIVIDUAL' })
    const partnerIndividualId = await createTestProfile(partner.id, { type: 'INDIVIDUAL' })
    const coupleProfile = await prisma.profile.create({
      data: {
        type: 'COUPLE', status: 'APPROVED', displayName: 'Test Couple', relationshipStatus: 'OPEN',
        discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
      }
    })
    await acceptCoupleMembership(coupleProfile.id, creator.id, partner.id)

    const creatorContexts = await getAvailableContexts(creator.id)
    expect(creatorContexts.map(c => c.type).sort()).toEqual(['COUPLE', 'INDIVIDUAL'])
    expect(creatorContexts.find(c => c.type === 'COUPLE')?.role).toBe('OWNER')
    expect(creatorContexts.find(c => c.type === 'INDIVIDUAL')?.profileId).toBe(creatorIndividualId)

    const partnerContexts = await getAvailableContexts(partner.id)
    expect(partnerContexts.map(c => c.type).sort()).toEqual(['COUPLE', 'INDIVIDUAL'])
    expect(partnerContexts.find(c => c.type === 'COUPLE')?.role).toBe('MEMBER')
    expect(partnerContexts.find(c => c.type === 'INDIVIDUAL')?.profileId).toBe(partnerIndividualId)
  })

  it('resolveActiveProfileId: exactly one Shared Profile + untouched DRAFT Individual -> defaults to the Shared Profile (backward-compat)', async () => {
    const creator = await createTestUser({ email: 'apc-default-shared@test.com' })
    await createTestProfile(creator.id, { type: 'INDIVIDUAL', status: 'DRAFT' })
    const coupleProfile = await prisma.profile.create({
      data: {
        type: 'COUPLE', status: 'APPROVED', displayName: 'Default Couple', relationshipStatus: 'OPEN',
        discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
      }
    })
    await acceptCoupleMembership(coupleProfile.id, creator.id)

    const active = await resolveActiveProfileId(creator.id)
    expect(active).toBe(coupleProfile.id)
  })

  it('resolveActiveProfileId: Individual Profile actually completed (not DRAFT) -> defaults to Individual even with a Shared Profile available', async () => {
    const creator = await createTestUser({ email: 'apc-default-individual@test.com' })
    const individualId = await createTestProfile(creator.id, { type: 'INDIVIDUAL', status: 'APPROVED' })
    const coupleProfile = await prisma.profile.create({
      data: {
        type: 'COUPLE', status: 'APPROVED', displayName: 'Completed Individual Couple', relationshipStatus: 'OPEN',
        discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
      }
    })
    await acceptCoupleMembership(coupleProfile.id, creator.id)

    const active = await resolveActiveProfileId(creator.id)
    expect(active).toBe(individualId)
  })

  it('switchActiveProfile: a member can switch TO a profile they actually belong to', async () => {
    const creator = await createTestUser({ email: 'apc-switch-a@test.com' })
    await createTestProfile(creator.id, { type: 'INDIVIDUAL' })
    const coupleProfile = await prisma.profile.create({
      data: {
        type: 'COUPLE', status: 'APPROVED', displayName: 'Switch Couple', relationshipStatus: 'OPEN',
        discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
      }
    })
    await acceptCoupleMembership(coupleProfile.id, creator.id)

    const result = await switchActiveProfile(creator.id, coupleProfile.id)
    expect(result?.profileId).toBe(coupleProfile.id)
    expect(result?.type).toBe('COUPLE')

    const user = await prisma.user.findUnique({ where: { id: creator.id }, select: { activeProfileId: true } })
    expect(user?.activeProfileId).toBe(coupleProfile.id)
  })

  it('switchActiveProfile: rejects switching to a profile the user is NOT a member of (unauthorized switch)', async () => {
    const user = await createTestUser({ email: 'apc-switch-unauthorized@test.com' })
    await createTestProfile(user.id, { type: 'INDIVIDUAL' })

    const strangerCreator = await createTestUser({ email: 'apc-switch-stranger@test.com' })
    const strangerCoupleProfile = await prisma.profile.create({
      data: {
        type: 'COUPLE', status: 'APPROVED', displayName: 'Not My Couple', relationshipStatus: 'OPEN',
        discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
      }
    })
    await acceptCoupleMembership(strangerCoupleProfile.id, strangerCreator.id)

    const result = await switchActiveProfile(user.id, strangerCoupleProfile.id)
    expect(result).toBeNull()

    // Confirms context isolation: the unauthorized attempt must not have
    // persisted anything either.
    const persisted = await prisma.user.findUnique({ where: { id: user.id }, select: { activeProfileId: true } })
    expect(persisted?.activeProfileId).not.toBe(strangerCoupleProfile.id)
  })

  it('resolveActiveProfileId: an explicit requestedProfileId the user does NOT belong to is ignored, falling back to normal resolution', async () => {
    const user = await createTestUser({ email: 'apc-request-invalid@test.com' })
    const individualId = await createTestProfile(user.id, { type: 'INDIVIDUAL', status: 'APPROVED' })

    const strangerCreator = await createTestUser({ email: 'apc-request-stranger@test.com' })
    const strangerCoupleProfile = await prisma.profile.create({
      data: {
        type: 'COUPLE', status: 'APPROVED', displayName: 'Someone Elses Couple', relationshipStatus: 'OPEN',
        discretionLevel: 'SELECTIVE', privacySettings: { create: { visibleInDiscovery: true } },
      }
    })
    await acceptCoupleMembership(strangerCoupleProfile.id, strangerCreator.id)

    const resolved = await resolveActiveProfileId(user.id, strangerCoupleProfile.id)
    expect(resolved).toBe(individualId)
  })
})
