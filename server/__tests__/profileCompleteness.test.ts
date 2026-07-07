// 4.11 — ProfileCompletenessService (4.9): missing fields, and the
// COUPLE-membership check specifically (the one check that needs its own
// DB lookup via ProfileMembershipService rather than reading off the
// profile object directly).
import { evaluateCompleteness } from '../src/lib/profileCompletenessService'
import { createTestUser, createTestProfile, prisma } from './helpers'

describe('ProfileCompletenessService', () => {
  it('a bare-minimum INDIVIDUAL profile reports every optional field as missing', async () => {
    const user = await createTestUser({ email: 'complete-bare@test.com' })
    const profileId = await createTestProfile(user.id, { type: 'INDIVIDUAL' })
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { intentions: true, boundaries: true, photos: true, privacySettings: true }
    })

    const result = await evaluateCompleteness(profile as any)
    expect(result.complete).toBe(false)
    expect(result.missing).toEqual(expect.arrayContaining(['GENDER', 'INTENTIONS', 'BOUNDARIES', 'PRIMARY_PHOTO', 'BIO']))
    // createTestProfile does set displayName and creates a PrivacySettings row
    expect(result.missing).not.toContain('DISPLAY_NAME')
    expect(result.missing).not.toContain('PRIVACY_SETTINGS')
    expect(result.score).toBeLessThan(100)
  })

  it('a fully filled-in INDIVIDUAL profile scores 100 and reports complete', async () => {
    const user = await createTestUser({ email: 'complete-full@test.com' })
    const profileId = await createTestProfile(user.id, { type: 'INDIVIDUAL' })

    const intention = await (prisma as any).intention.create({ data: { name: 'Test intention', slug: `ti_${Date.now()}` } })
    const boundaryRow = await (prisma as any).boundary.create({ data: { name: 'Test boundary', slug: `tb_${Date.now()}`, category: 'meeting_type' } })
    await (prisma as any).profileIntention.create({ data: { profileId, intentionId: intention.id, preference: 'YES' } })
    await (prisma as any).profileBoundary.create({ data: { profileId, boundaryId: boundaryRow.id, preference: 'YES' } })
    await prisma.profilePhoto.create({ data: { profileId, storagePath: 'test/photo.jpg', isPrimary: true, moderationStatus: 'APPROVED' } })
    await prisma.profile.update({ where: { id: profileId }, data: { gender: 'woman', bio: 'Hello there.' } })

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { intentions: true, boundaries: true, photos: true, privacySettings: true }
    })
    const result = await evaluateCompleteness(profile as any)
    expect(result.complete).toBe(true)
    expect(result.missing).toHaveLength(0)
    expect(result.score).toBe(100)
  })

  it('COUPLE membership: a couple with only one active member (partner not yet accepted) reports MEMBERS missing', async () => {
    const creator = await createTestUser({ email: 'complete-couple-a@test.com' })
    const profileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await (prisma as any).profileMember.create({
      data: { profileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' }
    })

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { intentions: true, boundaries: true, photos: true, privacySettings: true }
    })
    const result = await evaluateCompleteness(profile as any)
    expect(result.missing).toContain('MEMBERS')
  })

  it('COUPLE membership: once both partners have accepted, MEMBERS is no longer missing', async () => {
    const creator = await createTestUser({ email: 'complete-couple-b1@test.com' })
    const partner = await createTestUser({ email: 'complete-couple-b2@test.com' })
    const profileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await (prisma as any).profileMember.create({ data: { profileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' } })
    await (prisma as any).profileMember.create({ data: { profileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' } })

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { intentions: true, boundaries: true, photos: true, privacySettings: true }
    })
    const result = await evaluateCompleteness(profile as any)
    expect(result.missing).not.toContain('MEMBERS')
    // GENDER is skipped entirely for non-INDIVIDUAL profiles
    expect(result.missing).not.toContain('GENDER')
  })
})
