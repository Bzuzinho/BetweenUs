// 10.14 — Events: venue privacy (10.7's server-side gate), attendance
// approval flow, capacity enforcement, and cancellation.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser, createTestProfile } from './helpers'

const ORIGINAL_FLAG = process.env.PRIVATE_EVENTS_ENABLED

beforeAll(() => { process.env.PRIVATE_EVENTS_ENABLED = 'true' })
afterAll(() => { process.env.PRIVATE_EVENTS_ENABLED = ORIGINAL_FLAG })

// Organizer eligibility (eventService.checkOrganizerEligibility) requires
// an APPROVED Verification row for the user.
const makeVerifiedOrganizer = async (email: string) => {
  const user = await createTestUser({ email })
  const profileId = await createTestProfile(user.id)
  await prisma.verification.create({ data: { userId: user.id, status: 'APPROVED' } })
  return { user, profileId }
}

const createPublishedEvent = (overrides: any) =>
  (prisma as any).event.create({
    data: {
      organizerProfileId: overrides.organizerProfileId,
      title: overrides.title || 'Encontro em Lisboa',
      description: overrides.description || 'Descrição do evento.',
      city: overrides.city || 'Lisboa',
      country: overrides.country || 'Portugal',
      venueDetail: overrides.venueDetail ?? 'Rua Exemplo 123',
      venueVisibility: overrides.venueVisibility || 'APPROVED_ATTENDEES',
      startsAt: overrides.startsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      capacity: overrides.capacity ?? null,
      approvalRequired: overrides.approvalRequired ?? true,
      status: overrides.status || 'PUBLISHED',
    }
  })

describe('Events — venue privacy (10.7)', () => {
  it('hides venueDetail from a viewer with no attendance', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-venue@test.com')
    const viewer = await createTestUser({ email: 'evt-viewer-venue@test.com' })
    await createTestProfile(viewer.id)

    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, venueVisibility: 'APPROVED_ATTENDEES' })

    const res = await request(app).get(`/api/events/${event.id}`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.venueDetail).toBeNull()
    expect(res.body.venueRevealed).toBe(false)
  })

  it('reveals venueDetail once the viewer is an APPROVED attendee', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-venue2@test.com')
    const attendee = await createTestUser({ email: 'evt-attendee-venue2@test.com' })
    const attendeeProfileId = await createTestProfile(attendee.id)

    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, venueVisibility: 'APPROVED_ATTENDEES' })
    await (prisma as any).eventAttendance.create({ data: { eventId: event.id, profileId: attendeeProfileId, status: 'APPROVED' } })

    const res = await request(app).get(`/api/events/${event.id}`)
      .set('Authorization', `Bearer ${attendee.accessToken}`)
    expect(res.body.venueDetail).toBe('Rua Exemplo 123')
    expect(res.body.venueRevealed).toBe(true)
  })

  it('never reveals venueDetail for PUBLIC_CITY_ONLY, even to an approved attendee', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-venue3@test.com')
    const attendee = await createTestUser({ email: 'evt-attendee-venue3@test.com' })
    const attendeeProfileId = await createTestProfile(attendee.id)

    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, venueVisibility: 'PUBLIC_CITY_ONLY' })
    await (prisma as any).eventAttendance.create({ data: { eventId: event.id, profileId: attendeeProfileId, status: 'APPROVED' } })

    const res = await request(app).get(`/api/events/${event.id}`)
      .set('Authorization', `Bearer ${attendee.accessToken}`)
    expect(res.body.venueDetail).toBeNull()
  })

  it('the organizer always sees their own venueDetail regardless of policy', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-venue4@test.com')
    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, venueVisibility: 'PUBLIC_CITY_ONLY' })

    const res = await request(app).get(`/api/events/${event.id}`)
      .set('Authorization', `Bearer ${organizer.user.accessToken}`)
    expect(res.body.venueDetail).toBe('Rua Exemplo 123')
  })
})

describe('Events — attendance approval', () => {
  it('a REQUESTED attendance needs organizer approval before becoming APPROVED', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-approve@test.com')
    const attendee = await createTestUser({ email: 'evt-attendee-approve@test.com' })
    await createTestProfile(attendee.id)

    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, approvalRequired: true })

    const request1 = await request(app).post(`/api/events/${event.id}/attend`)
      .set('Authorization', `Bearer ${attendee.accessToken}`)
    expect(request1.status).toBe(201)
    expect(request1.body.status).toBe('REQUESTED')

    const attendance = await (prisma as any).eventAttendance.findFirst({ where: { eventId: event.id } })
    const approve = await request(app).post(`/api/events/${event.id}/attendance/${attendance.id}/approve`)
      .set('Authorization', `Bearer ${organizer.user.accessToken}`)
    expect(approve.status).toBe(200)
    expect(approve.body.status).toBe('APPROVED')
  })

  it('auto-approves when the event does not require approval', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-auto@test.com')
    const attendee = await createTestUser({ email: 'evt-attendee-auto@test.com' })
    await createTestProfile(attendee.id)

    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, approvalRequired: false })

    const res = await request(app).post(`/api/events/${event.id}/attend`)
      .set('Authorization', `Bearer ${attendee.accessToken}`)
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('APPROVED')
  })

  it('only the organizer can approve an attendance request', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-guard@test.com')
    const attendee = await createTestUser({ email: 'evt-attendee-guard@test.com' })
    const stranger = await createTestUser({ email: 'evt-stranger-guard@test.com' })
    await createTestProfile(attendee.id)
    await createTestProfile(stranger.id)

    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId })
    await request(app).post(`/api/events/${event.id}/attend`).set('Authorization', `Bearer ${attendee.accessToken}`)
    const attendance = await (prisma as any).eventAttendance.findFirst({ where: { eventId: event.id } })

    const res = await request(app).post(`/api/events/${event.id}/attendance/${attendance.id}/approve`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
    expect(res.status).toBe(400)
  })
})

describe('Events — capacity enforcement', () => {
  it('rejects a new attendance request once capacity is full', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-cap@test.com')
    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, capacity: 1, approvalRequired: false })

    const attendeeA = await createTestUser({ email: 'evt-cap-a@test.com' })
    await createTestProfile(attendeeA.id)
    const attendeeB = await createTestUser({ email: 'evt-cap-b@test.com' })
    await createTestProfile(attendeeB.id)

    const first = await request(app).post(`/api/events/${event.id}/attend`).set('Authorization', `Bearer ${attendeeA.accessToken}`)
    expect(first.status).toBe(201)

    const second = await request(app).post(`/api/events/${event.id}/attend`).set('Authorization', `Bearer ${attendeeB.accessToken}`)
    expect(second.status).toBe(400)
    expect(second.body.error).toMatch(/capacidade/i)
  })
})

describe('Events — cancellation', () => {
  it('a cancelled event is no longer publicly listed', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-cancel@test.com')
    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId })

    const cancel = await request(app).post(`/api/events/${event.id}/cancel`)
      .set('Authorization', `Bearer ${organizer.user.accessToken}`)
    expect(cancel.status).toBe(200)
    expect(cancel.body.status).toBe('CANCELLED')

    const list = await request(app).get('/api/events')
      .set('Authorization', `Bearer ${organizer.user.accessToken}`)
    expect(list.body.events.find((e: any) => e.id === event.id)).toBeUndefined()
  })

  it('an attendee can cancel their own request', async () => {
    const organizer = await makeVerifiedOrganizer('evt-org-attcancel@test.com')
    const attendee = await createTestUser({ email: 'evt-attendee-cancel@test.com' })
    await createTestProfile(attendee.id)
    const event = await createPublishedEvent({ organizerProfileId: organizer.profileId, approvalRequired: false })

    await request(app).post(`/api/events/${event.id}/attend`).set('Authorization', `Bearer ${attendee.accessToken}`)
    const res = await request(app).post(`/api/events/${event.id}/attend/cancel`)
      .set('Authorization', `Bearer ${attendee.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('CANCELLED')
  })
})
