// 8.12 — IntentAlignment (Shared Intentions) versioning. Covers: propose +
// all approve -> new version ACTIVE and old ARCHIVED; propose + one
// declines -> the previous ACTIVE alignment is untouched and the proposal
// is archived without ever activating.
import { prisma, createTestUser, createTestProfile } from './helpers'
import { proposeAlignment, approveAlignment, declineAlignment, getCurrentAlignment } from '../src/lib/intentAlignmentService'

// Minimal standalone PrivateRoom with two ACCEPTED members — a private
// room doesn't require a Match for Shared Intentions to apply (8.8 scopes
// IntentAlignment to privateRoomId, not matchId).
const createRoomWithMembers = async (userIds: string[]) => {
  const room = await (prisma as any).privateRoom.create({
    data: {
      roomType: 'CUSTOM', status: 'ACTIVE',
      members: { create: userIds.map((userId, i) => ({ userId, role: i === 0 ? 'OWNER' : 'MEMBER', status: 'ACCEPTED' })) }
    }
  })
  return room.id as string
}

describe('intentAlignmentService — versioning (8.10)', () => {
  it('propose + all approve activates the new version and archives the previous one', async () => {
    const userA = await createTestUser({ email: 'ia-a@test.com' })
    const userB = await createTestUser({ email: 'ia-b@test.com' })
    await createTestProfile(userA.id)
    await createTestProfile(userB.id)
    const roomId = await createRoomWithMembers([userA.id, userB.id])

    const v1 = await proposeAlignment(roomId, userA.id, [{ key: 'connection_goal', value: 'CASUAL' }])
    expect(v1.alignment.status).toBe('WAITING_APPROVAL') // userB hasn't approved yet

    const v1Approved = await approveAlignment(v1.alignment.id, userB.id)
    expect(v1Approved.alignment?.status).toBe('ACTIVE')
    expect(v1Approved.alignment?.version).toBe(1)

    // Propose v2 — a material change
    const v2 = await proposeAlignment(roomId, userB.id, [{ key: 'connection_goal', value: 'RECURRING' }])
    expect(v2.alignment.version).toBe(2)
    expect(v2.alignment.status).toBe('WAITING_APPROVAL')

    const v2Approved = await approveAlignment(v2.alignment.id, userA.id)
    expect(v2Approved.alignment?.status).toBe('ACTIVE')

    const v1AfterSupersede = await prisma.$queryRawUnsafe(
      `SELECT status FROM intent_alignments WHERE id = $1`, v1Approved.alignment!.id
    ) as any[]
    expect(v1AfterSupersede[0].status).toBe('ARCHIVED')

    const current = await getCurrentAlignment(roomId)
    expect(current.version).toBe(2)
  })

  it('a single decline archives the proposal WITHOUT it ever activating — previous ACTIVE stays ACTIVE', async () => {
    const userA = await createTestUser({ email: 'ia-c@test.com' })
    const userB = await createTestUser({ email: 'ia-d@test.com' })
    await createTestProfile(userA.id)
    await createTestProfile(userB.id)
    const roomId = await createRoomWithMembers([userA.id, userB.id])

    const v1 = await proposeAlignment(roomId, userA.id, [{ key: 'connection_goal', value: 'CASUAL' }])
    const v1Approved = await approveAlignment(v1.alignment.id, userB.id)
    expect(v1Approved.alignment?.status).toBe('ACTIVE')

    const v2 = await proposeAlignment(roomId, userA.id, [{ key: 'connection_goal', value: 'ONE_TIME' }])
    expect(v2.alignment.status).toBe('WAITING_APPROVAL')

    const declined = await declineAlignment(v2.alignment.id, userB.id)
    expect(declined.alignment?.status).toBe('ARCHIVED')
    // Never reached ACTIVE at any point
    expect(declined.alignment?.activatedAt).toBeNull()

    // v1 is completely untouched and still the current one.
    const current = await getCurrentAlignment(roomId)
    expect(current.id).toBe(v1Approved.alignment!.id)
    expect(current.version).toBe(1)
    expect(current.status).toBe('ACTIVE')
  })

  it('rejects items with unknown key/value pairs', async () => {
    const userA = await createTestUser({ email: 'ia-e@test.com' })
    await createTestProfile(userA.id)
    const roomId = await createRoomWithMembers([userA.id])

    const result = await proposeAlignment(roomId, userA.id, [{ key: 'connection_goal', value: 'NOT_A_REAL_VALUE' }])
    expect(result.error).toBe('INVALID_ITEMS')
  })
})
