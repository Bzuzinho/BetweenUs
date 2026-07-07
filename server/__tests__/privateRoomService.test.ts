// 7.12 — PrivateRoomService.createFromMatch: room type inference from
// actual profile composition, membership sync from active ProfileMembers,
// and idempotency.
import { createFromMatch } from '../src/lib/privateRoomService'
import { createTestUser, createTestProfile, prisma } from './helpers'

const createActiveCouple = async (emailA: string, emailB: string) => {
  const userA = await createTestUser({ email: emailA })
  const userB = await createTestUser({ email: emailB })
  const profileId = await createTestProfile(userA.id, { type: 'COUPLE' })
  await prisma.coupleProfile.create({
    data: { profileId, partnerOneUserId: userA.id, partnerTwoUserId: userB.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' }
  })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userA.id, isCreator: true, status: 'ACCEPTED' } })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userB.id, isCreator: false, status: 'ACCEPTED' } })
  return { userA, userB, profileId }
}

describe('PrivateRoomService.createFromMatch', () => {
  it('INDIVIDUAL + INDIVIDUAL -> INDIVIDUAL_PAIR, with exactly the two matched users as members', async () => {
    const userA = await createTestUser({ email: 'room-ind-a@test.com' })
    const userB = await createTestUser({ email: 'room-ind-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    const result = await createFromMatch(match.id)
    expect(result.ok).toBe(true)
    expect(result.created).toBe(true)
    expect(result.room.roomType).toBe('INDIVIDUAL_PAIR')

    const members = await (prisma as any).privateRoomMember.findMany({ where: { privateRoomId: result.room.id } })
    expect(members.map((m: any) => m.userId).sort()).toEqual([userA.id, userB.id].sort())
    // No OWNER on a match-derived room — peer-symmetric, see roomAuthorizationService's doc comment.
    expect(members.every((m: any) => m.role === 'MEMBER')).toBe(true)
  })

  it('COUPLE + INDIVIDUAL -> COUPLE_SINGLE, membership includes both couple members plus the individual', async () => {
    const { userA, userB, profileId: coupleProfileId } = await createActiveCouple('room-cs-a@test.com', 'room-cs-b@test.com')
    const individualUser = await createTestUser({ email: 'room-cs-c@test.com' })
    const individualProfileId = await createTestProfile(individualUser.id)
    const match = await prisma.match.create({ data: { profileOneId: coupleProfileId, profileTwoId: individualProfileId, status: 'ACTIVE', matchedAt: new Date() } })

    const result = await createFromMatch(match.id)
    expect(result.ok).toBe(true)
    expect(result.room.roomType).toBe('COUPLE_SINGLE')

    const members = await (prisma as any).privateRoomMember.findMany({ where: { privateRoomId: result.room.id } })
    expect(members.map((m: any) => m.userId).sort()).toEqual([userA.id, userB.id, individualUser.id].sort())
  })

  it('COUPLE + COUPLE -> COUPLE_COUPLE', async () => {
    const { profileId: coupleOneId } = await createActiveCouple('room-cc-a@test.com', 'room-cc-b@test.com')
    const { profileId: coupleTwoId } = await createActiveCouple('room-cc-c@test.com', 'room-cc-d@test.com')
    const match = await prisma.match.create({ data: { profileOneId: coupleOneId, profileTwoId: coupleTwoId, status: 'ACTIVE', matchedAt: new Date() } })

    const result = await createFromMatch(match.id)
    expect(result.ok).toBe(true)
    expect(result.room.roomType).toBe('COUPLE_COUPLE')
  })

  it('seeds a v1 rule set and starts WAITING_CONSENT — never silently ACTIVE with no agreed rules', async () => {
    const userA = await createTestUser({ email: 'room-draft-a@test.com' })
    const userB = await createTestUser({ email: 'room-draft-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    const result = await createFromMatch(match.id)
    expect(result.room.status).toBe('WAITING_CONSENT')
    const ruleSet = await (prisma as any).roomRuleSet.findFirst({ where: { roomId: result.room.id } })
    expect(ruleSet).not.toBeNull()
    expect(ruleSet.version).toBe(1)
  })

  it('is idempotent — calling it twice for the same match returns the existing room, not a duplicate', async () => {
    const userA = await createTestUser({ email: 'room-idem-a@test.com' })
    const userB = await createTestUser({ email: 'room-idem-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    const first = await createFromMatch(match.id)
    const second = await createFromMatch(match.id)
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.room.id).toBe(first.room.id)
  })
})
