// 4.11 — ProfileMembershipService (4.1): individual, couple pending, couple
// active, removed member. Exercises the service directly against a real
// DB, not through HTTP — this is the "who belongs to this profile" source
// of truth every other consumer (matching, admin, discovery) now defers to.
import {
  getActiveMembers, isActiveMember, getRequiredApprovers, removeMember
} from '../src/lib/profileMembershipService'
import { createTestUser, createTestProfile, prisma } from './helpers'

describe('ProfileMembershipService', () => {
  it('INDIVIDUAL: the owner is the sole active member, with no ProfileMember row needed', async () => {
    const user = await createTestUser({ email: 'ind@test.com' })
    const profileId = await createTestProfile(user.id, { type: 'INDIVIDUAL' })

    const members = await getActiveMembers(profileId)
    expect(members).toEqual([{ userId: user.id, isCreator: true }])
    expect(await isActiveMember(profileId, user.id)).toBe(true)
    expect(await getRequiredApprovers(profileId)).toEqual([user.id])
  })

  it('COUPLE pending: only the creator has accepted, the invited partner has not joined yet', async () => {
    const creator = await createTestUser({ email: 'couple-creator@test.com' })
    const profileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await (prisma as any).profileMember.create({
      data: { profileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' }
    })
    await (prisma as any).profileMember.create({
      data: { profileId, invitedEmail: 'partner@test.com', isCreator: false, status: 'PENDING' }
    })

    const members = await getActiveMembers(profileId)
    expect(members).toEqual([{ userId: creator.id, isCreator: true }])
    expect(await getRequiredApprovers(profileId)).toEqual([creator.id])
  })

  it('COUPLE active: both partners have accepted and are required approvers', async () => {
    const creator = await createTestUser({ email: 'couple-a@test.com' })
    const partner = await createTestUser({ email: 'couple-b@test.com' })
    const profileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await (prisma as any).profileMember.create({
      data: { profileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' }
    })
    await (prisma as any).profileMember.create({
      data: { profileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' }
    })

    const members = await getActiveMembers(profileId)
    expect(members.map(m => m.userId).sort()).toEqual([creator.id, partner.id].sort())
    expect(await isActiveMember(profileId, partner.id)).toBe(true)
    expect((await getRequiredApprovers(profileId)).sort()).toEqual([creator.id, partner.id].sort())
  })

  it('removed member: after removeMember, the remaining partner is the only active member', async () => {
    const creator = await createTestUser({ email: 'couple-c@test.com' })
    const partner = await createTestUser({ email: 'couple-d@test.com' })
    const profileId = await createTestProfile(creator.id, { type: 'COUPLE' })
    await (prisma as any).profileMember.create({
      data: { profileId, userId: creator.id, isCreator: true, status: 'ACCEPTED' }
    })
    await (prisma as any).profileMember.create({
      data: { profileId, userId: partner.id, isCreator: false, status: 'ACCEPTED' }
    })

    await removeMember(profileId, partner.id)

    const members = await getActiveMembers(profileId)
    expect(members).toEqual([{ userId: creator.id, isCreator: true }])
    expect(await isActiveMember(profileId, partner.id)).toBe(false)
  })
})
