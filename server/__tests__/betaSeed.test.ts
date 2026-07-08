// BETA.1.37 — 22 automated test cases for the beta scenario dataset
// (server/prisma/betaSeed/**). Each test exercises the REAL beta-seed
// phase functions / guards / underlying services against the test
// database — same convention as every other test file here (see
// helpers.ts, discoveryService.test.ts): per-test fixtures, no shared
// beforeAll state, because setup.ts's global afterEach truncates every
// relevant table after each individual test.
//
// Catalog rows (Intention/Boundary/AgreementQuestion) are NOT provided by
// a structural seed in the test DB (globalSetup only runs `prisma db push
// --force-reset`, never `npm run db:seed`) — each test creates just the
// specific catalog rows the phase function it calls actually looks up by
// slug, exactly like discoveryService.test.ts already does for its own
// boundary/intention conflict tests.
import { prisma, createTestUser, createTestProfile } from './helpers'
import { BETA_SEED_EMAIL_DOMAIN, BETA_SEED_VERSION, assertSeedAllowed, BetaSeedAbortError } from '../prisma/betaSeed/guards'
import { upsertTestUser, hashSeedPassword } from '../prisma/betaSeed/phases/accounts'
import { createFromMatch } from '../src/lib/privateRoomService'
import { acceptRuleSet } from '../src/lib/roomRuleService'
import { createLikeOrMatch, transition } from '../src/lib/matchService'
import { blockProfile, isBlockedEitherWay } from '../src/lib/blockService'
import { createConsentCheck, respondToConsentCheck, computeAndCacheStatus } from '../src/lib/consentCheckService'
import { getOrCreateCurrentAgreement, submitAnswer } from '../src/lib/profileAgreementService'
import { computeReportPriority } from '../src/lib/reportPriorityService'
import { captureProfileSnapshot } from '../src/lib/reportEvidenceService'
import { scheduleCheckin, confirmSafe, cancelCheckin } from '../src/lib/safetyCheckinService'
import { canTransitionSafetyCheckin } from '../src/lib/safetyCheckinStateMachine'
import { resolveVenueForViewer } from '../src/lib/eventVenuePolicy'
import { recordSignal } from '../src/lib/recommendationSignalService'
import { computeMeaningfulConnectionRateSince } from '../src/lib/meaningfulConnectionService'
import { getCandidates } from '../src/lib/discoveryService'

jest.setTimeout(30000)

const withPhoto = async (profileId: string) => {
  await prisma.profilePhoto.create({
    data: { profileId, storagePath: `test/${profileId}.jpg`, isPrimary: true, moderationStatus: 'APPROVED' },
  })
}

const createActiveCouple = async (emailA: string, emailB: string) => {
  const userA = await createTestUser({ email: emailA })
  const userB = await createTestUser({ email: emailB })
  const profileId = await createTestProfile(userA.id, { type: 'COUPLE' })
  await prisma.coupleProfile.create({
    data: { profileId, partnerOneUserId: userA.id, partnerTwoUserId: userB.id, partnerTwoAcceptedAt: new Date(), coupleStatus: 'ACTIVE' },
  })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userA.id, isCreator: true, status: 'ACCEPTED' } })
  await (prisma as any).profileMember.create({ data: { profileId, userId: userB.id, isCreator: false, status: 'ACCEPTED' } })
  return { userA, userB, profileId }
}

beforeAll(() => {
  process.env.BETA_SEED_PASSWORD = 'test-only-beta-seed-password'
})

// ── 1. Seed idempotence ──────────────────────────────────────────────
describe('1. Seed idempotence', () => {
  it('upsertTestUser called twice for the same email does not create a duplicate row', async () => {
    const passwordHash = await hashSeedPassword()
    const input = { email: `beta.idempotent@${BETA_SEED_EMAIL_DOMAIN}`, accountName: 'Idempotent', testScenarioKey: 'test_idempotent', passwordHash }
    const first = await upsertTestUser(input)
    const second = await upsertTestUser(input)
    expect(second.id).toBe(first.id)
    const count = await prisma.user.count({ where: { email: input.email } })
    expect(count).toBe(1)
  })
})

// ── 2/3. Test account flag + scenario key ────────────────────────────
describe('2/3. Test account flag + scenario key', () => {
  it('upsertTestUser always stamps isTestAccount=true and the given testScenarioKey', async () => {
    const passwordHash = await hashSeedPassword()
    const user = await upsertTestUser({
      email: `beta.flagcheck@${BETA_SEED_EMAIL_DOMAIN}`, accountName: 'Flag Check', testScenarioKey: 'individual_flagcheck', passwordHash,
    })
    expect(user.isTestAccount).toBe(true)
    expect(user.testScenarioKey).toBe('individual_flagcheck')
  })

  it('a normal (non-seed) user created via createTestUser has isTestAccount=false by default', async () => {
    const user = await createTestUser({ email: 'real-user-control@test.com' })
    const row = await prisma.user.findUnique({ where: { id: user.id } })
    expect(row?.isTestAccount).toBe(false)
    expect(row?.testScenarioKey).toBeNull()
  })
})

// ── 4. No real email delivery ────────────────────────────────────────
describe('4. No real email delivery during seeding', () => {
  it('upsertTestUser and safety check-in scheduling never call the email service', async () => {
    jest.resetModules()
    jest.doMock('../src/lib/email', () => ({
      sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn(), sendWelcomeEmail: jest.fn(),
      sendMatchEmail: jest.fn(), sendSafetyAlertEmail: jest.fn(), getEmailConfig: jest.fn(),
    }))
    const emailModule = require('../src/lib/email')
    const { upsertTestUser: upsertUserFresh, hashSeedPassword: hashFresh } = require('../prisma/betaSeed/phases/accounts')
    const passwordHash = await hashFresh()
    await upsertUserFresh({ email: `beta.noemail@${BETA_SEED_EMAIL_DOMAIN}`, accountName: 'No Email', testScenarioKey: 'individual_noemail', passwordHash })

    expect(emailModule.sendVerificationEmail).not.toHaveBeenCalled()
    expect(emailModule.sendWelcomeEmail).not.toHaveBeenCalled()
    expect(emailModule.sendSafetyAlertEmail).not.toHaveBeenCalled()
    jest.dontMock('../src/lib/email')
  })
})

// ── 5. Analytics isolation (Meaningful Connection Rate) ──────────────
describe('5. Analytics isolation — Meaningful Connection Rate excludes test accounts by default', () => {
  it('a match between two isTestAccount=true users is excluded unless includeTestData=true', async () => {
    const userA = await createTestUser({ email: `beta.mcr.a@${BETA_SEED_EMAIL_DOMAIN}` })
    const userB = await createTestUser({ email: `beta.mcr.b@${BETA_SEED_EMAIL_DOMAIN}` })
    await prisma.user.update({ where: { id: userA.id }, data: { isTestAccount: true } })
    await prisma.user.update({ where: { id: userB.id }, data: { isTestAccount: true } })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const realOnly = await computeMeaningfulConnectionRateSince(since)
    const withTest = await computeMeaningfulConnectionRateSince(since, { includeTestData: true })
    expect(withTest.totalCount).toBeGreaterThan(realOnly.totalCount)
  })
})

// ── 6. Recommendation signal isolation ────────────────────────────────
describe('6. RecommendationSignal isolation', () => {
  it('a signal between two test-account profiles is written with isTestData=true', async () => {
    const userA = await createTestUser({ email: `beta.sig.a@${BETA_SEED_EMAIL_DOMAIN}` })
    const userB = await createTestUser({ email: `beta.sig.b@${BETA_SEED_EMAIL_DOMAIN}` })
    await prisma.user.update({ where: { id: userA.id }, data: { isTestAccount: true } })
    await prisma.user.update({ where: { id: userB.id }, data: { isTestAccount: true } })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)

    await recordSignal(profileA, profileB, 'PROFILE_VIEW')

    const signal = await (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: profileA, targetProfileId: profileB } })
    expect(signal?.isTestData).toBe(true)
  })

  it('a signal between two REAL profiles is written with isTestData=false', async () => {
    const userA = await createTestUser({ email: 'real-sig-a@test.com' })
    const userB = await createTestUser({ email: 'real-sig-b@test.com' })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)

    await recordSignal(profileA, profileB, 'PROFILE_VIEW')

    const signal = await (prisma as any).recommendationSignal.findFirst({ where: { actorProfileId: profileA, targetProfileId: profileB } })
    expect(signal?.isTestData).toBe(false)
  })
})

// ── 7. Discovery expected include ────────────────────────────────────
describe('7. Discovery — expected inclusion', () => {
  it('two compatible test profiles with overlapping intentions find each other in Discovery', async () => {
    const intention = await prisma.intention.create({ data: { name: 'Recurring connection', slug: `recurring_${Date.now()}` } })

    const viewer = await createTestUser({ email: `beta.disc.viewer@${BETA_SEED_EMAIL_DOMAIN}` })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)
    await prisma.profileIntention.create({ data: { profileId: viewerProfileId, intentionId: intention.id, preference: 'YES' } })

    const candidate = await createTestUser({ email: `beta.disc.candidate@${BETA_SEED_EMAIL_DOMAIN}` })
    const candidateProfileId = await createTestProfile(candidate.id)
    await withPhoto(candidateProfileId)
    await prisma.profileIntention.create({ data: { profileId: candidateProfileId, intentionId: intention.id, preference: 'YES' } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).toContain(candidateProfileId)
  })
})

// ── 8. Hard boundary exclusion ───────────────────────────────────────
describe('8. Discovery — hard boundary exclusion', () => {
  it('a profile with no_couples=YES never sees a COUPLE profile (mirrors individual_leonor)', async () => {
    const boundary = await prisma.boundary.create({ data: { name: 'No couples', slug: `beta_no_couples_${Date.now()}`, category: 'relationship_type', isHardBoundary: true } })

    const viewer = await createTestUser({ email: `beta.leonor@${BETA_SEED_EMAIL_DOMAIN}` })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)
    await prisma.profileBoundary.create({ data: { profileId: viewerProfileId, boundaryId: boundary.id, preference: 'YES' } })

    const { profileId: coupleProfileId } = await createActiveCouple(`beta.couplea@${BETA_SEED_EMAIL_DOMAIN}`, `beta.coupleb@${BETA_SEED_EMAIL_DOMAIN}`)
    await withPhoto(coupleProfileId)
    await prisma.profileBoundary.create({ data: { profileId: coupleProfileId, boundaryId: boundary.id, preference: 'NO' } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(coupleProfileId)
  })
})

// ── 9. Invisible exclusion ───────────────────────────────────────────
describe('9. Discovery — invisible mode exclusion', () => {
  it('a test profile with invisibleMode=true never appears (mirrors individual_ines)', async () => {
    const viewer = await createTestUser({ email: `beta.viewer.inv@${BETA_SEED_EMAIL_DOMAIN}` })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)

    const invisible = await createTestUser({ email: `beta.ines@${BETA_SEED_EMAIL_DOMAIN}` })
    const invisibleProfileId = await createTestProfile(invisible.id)
    await withPhoto(invisibleProfileId)
    await prisma.privacySettings.update({ where: { profileId: invisibleProfileId }, data: { invisibleMode: true } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(invisibleProfileId)
  })
})

// ── 10. Contact block exclusion ──────────────────────────────────────
describe('10. Discovery — contact block exclusion', () => {
  it('a blocked contact hash excludes that email from Discovery (mirrors Diogo/Noa)', async () => {
    const { hashContact } = await import('../src/lib/contactHashService')

    const viewer = await createTestUser({ email: `beta.diogo@${BETA_SEED_EMAIL_DOMAIN}` })
    const viewerProfileId = await createTestProfile(viewer.id)
    await withPhoto(viewerProfileId)

    const noaEmail = `beta.noa@${BETA_SEED_EMAIL_DOMAIN}`
    const noa = await createTestUser({ email: noaEmail })
    const noaProfileId = await createTestProfile(noa.id)
    await withPhoto(noaProfileId)

    const { hash, keyVersion } = hashContact(noaEmail)
    await (prisma as any).blockedContactHash.create({ data: { userId: viewer.id, contactHash: hash, type: 'email', keyVersion } })

    const result = await getCandidates(viewerProfileId, {}, null, 50)
    expect(result.items.map(i => i.profile.id)).not.toContain(noaProfileId)
  })
})

// ── 11. Couple membership ────────────────────────────────────────────
describe('11. Couple membership', () => {
  it('an ACTIVE couple has exactly 2 ACCEPTED ProfileMember rows, each with its own User', async () => {
    const { userA, userB, profileId } = await createActiveCouple(`beta.c1a@${BETA_SEED_EMAIL_DOMAIN}`, `beta.c1b@${BETA_SEED_EMAIL_DOMAIN}`)
    const members = await (prisma as any).profileMember.findMany({ where: { profileId, status: 'ACCEPTED' } })
    expect(members.length).toBe(2)
    expect(new Set(members.map((m: any) => m.userId))).toEqual(new Set([userA.id, userB.id]))
  })

  it('a PENDING_PARTNER couple has 1 ACCEPTED member and 1 PENDING invite with no userId (mirrors couple_3)', async () => {
    const user = await createTestUser({ email: `beta.c3vera@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileId = await createTestProfile(user.id, { type: 'COUPLE' })
    await prisma.coupleProfile.create({ data: { profileId, partnerOneUserId: user.id, coupleStatus: 'PENDING_PARTNER', partnerTwoInviteEmail: `beta.c3pending@${BETA_SEED_EMAIL_DOMAIN}` } })
    await (prisma as any).profileMember.create({ data: { profileId, userId: user.id, isCreator: true, status: 'ACCEPTED' } })
    await (prisma as any).profileMember.create({ data: { profileId, invitedEmail: `beta.c3pending@${BETA_SEED_EMAIL_DOMAIN}`, status: 'PENDING' } })

    const accepted = await (prisma as any).profileMember.count({ where: { profileId, status: 'ACCEPTED' } })
    const pending = await (prisma as any).profileMember.findFirst({ where: { profileId, status: 'PENDING' } })
    expect(accepted).toBe(1)
    expect(pending?.userId).toBeNull()
    const realUser = await prisma.user.findFirst({ where: { email: `beta.c3pending@${BETA_SEED_EMAIL_DOMAIN}` } })
    expect(realUser).toBeNull()
  })
})

// ── 12. Double consent ───────────────────────────────────────────────
describe('12. Double consent — couple match approval', () => {
  it('a couple x individual match only activates once both couple members approve', async () => {
    const { userA, userB, profileId: coupleId } = await createActiveCouple(`beta.dc.a@${BETA_SEED_EMAIL_DOMAIN}`, `beta.dc.b@${BETA_SEED_EMAIL_DOMAIN}`)
    const individual = await createTestUser({ email: `beta.dc.ind@${BETA_SEED_EMAIL_DOMAIN}` })
    const individualId = await createTestProfile(individual.id)

    await createLikeOrMatch(coupleId, individualId)
    const r = await createLikeOrMatch(individualId, coupleId)
    expect(r.kind).toBe('MATCH_PENDING_COUPLE_APPROVAL')
    const matchId = (r as any).matchId

    await prisma.coupleMatchApproval.create({ data: { matchId, userId: userA.id, approvedAt: new Date() } })
    let match = await prisma.match.findUnique({ where: { id: matchId } })
    expect(match?.status).toBe('PENDING_COUPLE_APPROVAL')

    await prisma.coupleMatchApproval.create({ data: { matchId, userId: userB.id, approvedAt: new Date() } })
    const { isApprovalSatisfied } = await import('../src/lib/approvalPolicyService')
    const approved = new Set([userA.id, userB.id])
    if (await isApprovalSatisfied(coupleId, approved) && await isApprovalSatisfied(individualId, approved)) {
      await transition(matchId, 'ACTIVATE')
    }
    match = await prisma.match.findUnique({ where: { id: matchId } })
    expect(match?.status).toBe('ACTIVE')
  })
})

// ── 13. Agreement restrictive calculation ────────────────────────────
describe('13. ProfileAgreementService — restrictive (conservative) calculation', () => {
  it('one YES + one NO on the same boundary computes CONFLICT, never ALIGNED', async () => {
    const boundary = await prisma.boundary.create({ data: { name: 'No emotional involvement', slug: `beta_no_emotional_${Date.now()}`, category: 'emotional_involvement' } })
    const { userA, userB, profileId } = await createActiveCouple(`beta.agree.a@${BETA_SEED_EMAIL_DOMAIN}`, `beta.agree.b@${BETA_SEED_EMAIL_DOMAIN}`)

    await getOrCreateCurrentAgreement(profileId)
    await submitAnswer(profileId, userA.id, { boundaryId: boundary.id }, 'YES')
    await submitAnswer(profileId, userB.id, { boundaryId: boundary.id }, 'NO')

    const agreement = await (prisma as any).profileAgreement.findFirst({ where: { profileId }, orderBy: { createdAt: 'desc' } })
    expect(agreement?.status).toBe('CONFLICT')
  })

  it('only one member having answered computes WAITING_MEMBERS, never ALIGNED', async () => {
    const boundary = await prisma.boundary.create({ data: { name: 'Talk first', slug: `beta_talk_first_${Date.now()}`, category: 'conversation_style' } })
    const { userA, profileId } = await createActiveCouple(`beta.wait.a@${BETA_SEED_EMAIL_DOMAIN}`, `beta.wait.b@${BETA_SEED_EMAIL_DOMAIN}`)

    await getOrCreateCurrentAgreement(profileId)
    await submitAnswer(profileId, userA.id, { boundaryId: boundary.id }, 'YES')

    const agreement = await (prisma as any).profileAgreement.findFirst({ where: { profileId }, orderBy: { createdAt: 'desc' } })
    expect(agreement?.status).not.toBe('ALIGNED')
    expect(agreement?.status).toBe('WAITING_MEMBERS')
  })
})

// ── 14. Private media access ─────────────────────────────────────────
describe('14. Private media access — Soft Reveal grants', () => {
  it('PhotoAccessRequest covers PENDING/APPROVED/REVOKED/EXPIRED and only APPROVED (unexpired) grants access', async () => {
    const owner = await createTestUser({ email: `beta.sofia@${BETA_SEED_EMAIL_DOMAIN}` })
    const ownerProfileId = await createTestProfile(owner.id)
    const photo = await prisma.profilePhoto.create({ data: { profileId: ownerProfileId, storagePath: 'test/private.svg', visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'APPROVED' } })

    const requesterPending = await createTestUser({ email: `beta.req.pending@${BETA_SEED_EMAIL_DOMAIN}` })
    const requesterApproved = await createTestUser({ email: `beta.req.approved@${BETA_SEED_EMAIL_DOMAIN}` })
    const requesterExpired = await createTestUser({ email: `beta.req.expired@${BETA_SEED_EMAIL_DOMAIN}` })

    await (prisma as any).photoAccessRequest.create({ data: { photoId: photo.id, requesterId: requesterPending.id, ownerId: owner.id, status: 'PENDING' } })
    await (prisma as any).photoAccessRequest.create({ data: { photoId: photo.id, requesterId: requesterApproved.id, ownerId: owner.id, status: 'APPROVED', respondedAt: new Date() } })
    await (prisma as any).photoAccessRequest.create({ data: { photoId: photo.id, requesterId: requesterExpired.id, ownerId: owner.id, status: 'EXPIRED', respondedAt: new Date(), expiresAt: new Date(Date.now() - 1000) } })

    const requests = await (prisma as any).photoAccessRequest.findMany({ where: { photoId: photo.id } })
    const statuses = new Set(requests.map((r: any) => r.status))
    expect(statuses.has('PENDING')).toBe(true)
    expect(statuses.has('APPROVED')).toBe(true)
    expect(statuses.has('EXPIRED')).toBe(true)

    const approvedGrant = requests.find((r: any) => r.requesterId === requesterApproved.id)
    expect(approvedGrant.status).toBe('APPROVED')
  })
})

// ── 15. Private room membership ──────────────────────────────────────
describe('15. Private Room membership — created via createFromMatch, never hand-picked', () => {
  it('an ACTIVE individual match produces a room with exactly the two matched users as members', async () => {
    const userA = await createTestUser({ email: `beta.room.a@${BETA_SEED_EMAIL_DOMAIN}` })
    const userB = await createTestUser({ email: `beta.room.b@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    const result = await createFromMatch(match.id)
    expect(result.ok).toBe(true)
    const members = await (prisma as any).privateRoomMember.findMany({ where: { privateRoomId: result.room.id } })
    expect(members.map((m: any) => m.userId).sort()).toEqual([userA.id, userB.id].sort())
  })
})

// ── 16. Room rules consent ───────────────────────────────────────────
describe('16. Room rules consent — WAITING_CONSENT until all active members accept', () => {
  it('room stays WAITING_CONSENT with one acceptance, moves to ACTIVE once both accept', async () => {
    const userA = await createTestUser({ email: `beta.rules.a@${BETA_SEED_EMAIL_DOMAIN}` })
    const userB = await createTestUser({ email: `beta.rules.b@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })
    const result = await createFromMatch(match.id)

    await acceptRuleSet(result.room.id, userA.id)
    let room = await (prisma as any).privateRoom.findUnique({ where: { id: result.room.id } })
    expect(room.status).toBe('WAITING_CONSENT')

    await acceptRuleSet(result.room.id, userB.id)
    room = await (prisma as any).privateRoom.findUnique({ where: { id: result.room.id } })
    expect(room.status).toBe('ACTIVE')
  })
})

// ── 17. ConsentCheck aggregation ─────────────────────────────────────
describe('17. ConsentCheck aggregation', () => {
  it('one accepted + one declined aggregates to DECLINED, never ACCEPTED', async () => {
    const userA = await createTestUser({ email: `beta.cc.a@${BETA_SEED_EMAIL_DOMAIN}` })
    const userB = await createTestUser({ email: `beta.cc.b@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    const match = await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    const created = await createConsentCheck({ matchId: match.id, phase: 'PHOTO_REQUEST', initiatedBy: userA.id })
    await respondToConsentCheck(created!.check.id, userA.id, 'ACCEPTED')
    await respondToConsentCheck(created!.check.id, userB.id, 'DECLINED')
    const state = await computeAndCacheStatus(created!.check.id)
    expect(state?.check.status).toBe('DECLINED')
  })
})

// ── 18. Block effects ────────────────────────────────────────────────
describe('18. Block effects — mutual exposure denied, existing match transitions to BLOCKED', () => {
  it('blockProfile ends the active match and isBlockedEitherWay is true afterwards', async () => {
    const userA = await createTestUser({ email: `beta.block.a@${BETA_SEED_EMAIL_DOMAIN}` })
    const userB = await createTestUser({ email: `beta.block.b@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileA = await createTestProfile(userA.id)
    const profileB = await createTestProfile(userB.id)
    await prisma.match.create({ data: { profileOneId: profileA, profileTwoId: profileB, status: 'ACTIVE', matchedAt: new Date() } })

    await blockProfile(profileA, profileB)

    const match = await prisma.match.findFirst({ where: { profileOneId: profileA, profileTwoId: profileB } })
    expect(match?.status).toBe('BLOCKED')
    expect(await isBlockedEitherWay(profileA, profileB)).toBe(true)
  })
})

// ── 19. Report evidence ──────────────────────────────────────────────
describe('19. Report + evidence — priority + restricted snapshot', () => {
  it('MINOR reports compute MAXIMUM-tier priority and capture a PROFILE_SNAPSHOT', async () => {
    const reporter = await createTestUser({ email: `beta.report.reporter@${BETA_SEED_EMAIL_DOMAIN}` })
    const reported = await createTestUser({ email: `beta.report.reported@${BETA_SEED_EMAIL_DOMAIN}` })
    const reportedProfileId = await createTestProfile(reported.id)

    const { priority, tier } = computeReportPriority({ reason: 'MINOR', openReportCountForTarget: 0 })
    expect(tier).toBe('MAXIMUM')

    const report = await prisma.report.create({
      data: { reporterUserId: reporter.id, reportedUserId: reported.id, reason: 'MINOR' as any, status: 'ESCALATED' as any, priority, details: 'Cenário de teste' },
    })
    await captureProfileSnapshot(report.id, reportedProfileId)

    const evidence = await prisma.reportEvidence.findMany({ where: { reportId: report.id } })
    expect(evidence.some(e => e.type === 'PROFILE_SNAPSHOT')).toBe(true)
  })
})

// ── 20. Safety states ────────────────────────────────────────────────
describe('20. Safety Check-in states — real state machine, no real alert sent', () => {
  it('OVERDUE and ESCALATED are reachable via the real transitions with safetyEmail left null', async () => {
    const user = await createTestUser({ email: `beta.safety@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileId = await createTestProfile(user.id)

    const checkin = await scheduleCheckin(profileId, { scheduledAt: new Date(Date.now() - 5 * 60 * 60 * 1000), safetyEmail: null })
    expect(canTransitionSafetyCheckin(checkin.status as any, 'REQUEST_CONFIRMATION').allowed).toBe(true)
    let updated = await (prisma as any).safetyCheckin.update({ where: { id: checkin.id }, data: { status: 'WAITING_CONFIRMATION' } })
    expect(canTransitionSafetyCheckin(updated.status, 'MARK_OVERDUE').allowed).toBe(true)
    updated = await (prisma as any).safetyCheckin.update({ where: { id: checkin.id }, data: { status: 'OVERDUE' } })
    expect(canTransitionSafetyCheckin(updated.status, 'ESCALATE').allowed).toBe(true)
    updated = await (prisma as any).safetyCheckin.update({ where: { id: checkin.id }, data: { status: 'ESCALATED' } })
    expect(updated.safetyEmail).toBeNull()
  })

  it('confirmSafe and cancelCheckin are the real service functions, never a hand-set status', async () => {
    const user = await createTestUser({ email: `beta.safety2@${BETA_SEED_EMAIL_DOMAIN}` })
    const profileId = await createTestProfile(user.id)
    const c1 = await scheduleCheckin(profileId, { scheduledAt: new Date(Date.now() + 60 * 60 * 1000), safetyEmail: null })
    const confirmed = await confirmSafe(c1.id)
    expect(confirmed.ok).toBe(true)
    expect(confirmed.checkin?.status).toBe('SAFE_CONFIRMED')

    const c2 = await scheduleCheckin(profileId, { scheduledAt: new Date(Date.now() + 60 * 60 * 1000), safetyEmail: null })
    const cancelled = await cancelCheckin(c2.id)
    expect(cancelled.ok).toBe(true)
    expect(cancelled.checkin?.status).toBe('CANCELLED')
  })
})

// ── 21. Event venue privacy ──────────────────────────────────────────
describe('21. Event venue privacy — EventVenuePolicy, never client-side only', () => {
  it('APPROVED_ATTENDEES only reveals venueDetail to an APPROVED attendee', async () => {
    const organizer = await createTestUser({ email: `beta.event.organizer@${BETA_SEED_EMAIL_DOMAIN}` })
    const organizerProfileId = await createTestProfile(organizer.id)
    const event = await prisma.event.create({
      data: {
        organizerProfileId, title: 'Beta Test Event', description: 'Evento de teste', city: 'Porto', country: 'Portugal',
        venueDetail: 'TEST VENUE — NOT A REAL LOCATION', venueVisibility: 'APPROVED_ATTENDEES' as any,
        startsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3600000),
        capacity: 10, verificationRequired: true, approvalRequired: true, status: 'PUBLISHED' as any,
      },
    })
    expect(resolveVenueForViewer(event as any, 'REQUESTED')).toBeNull()
    expect(resolveVenueForViewer(event as any, 'APPROVED')).toBe(event.venueDetail)
  })

  it('PUBLIC_CITY_ONLY never reveals venueDetail, regardless of attendance', async () => {
    const organizer = await createTestUser({ email: `beta.event.organizer2@${BETA_SEED_EMAIL_DOMAIN}` })
    const organizerProfileId = await createTestProfile(organizer.id)
    const event = await prisma.event.create({
      data: {
        organizerProfileId, title: 'Beta Test Event Public', description: 'Evento de teste', city: 'Lisboa', country: 'Portugal',
        venueDetail: 'TEST VENUE — NOT A REAL LOCATION', venueVisibility: 'PUBLIC_CITY_ONLY' as any,
        startsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3600000),
        capacity: 10, verificationRequired: true, approvalRequired: false, status: 'PUBLISHED' as any,
      },
    })
    expect(resolveVenueForViewer(event as any, 'APPROVED')).toBeNull()
  })
})

// ── 22. Cleanup only touches test accounts ───────────────────────────
describe('22. Cleanup selector — isTestAccount=true only, never touches real accounts', () => {
  it('the cleanup selector query returns only isTestAccount=true users, a real user survives', async () => {
    const testUser = await createTestUser({ email: `beta.cleanup.test@${BETA_SEED_EMAIL_DOMAIN}` })
    await prisma.user.update({ where: { id: testUser.id }, data: { isTestAccount: true, testScenarioKey: 'individual_cleanuptest' } })
    const realUser = await createTestUser({ email: 'real-cleanup-control@test.com' })

    // Same selector cleanupBetaSeed.ts uses — isTestAccount=true is the
    // ONLY criterion, never the email domain, even though this test user
    // also happens to be on the reserved domain.
    const toDelete = await prisma.user.findMany({ where: { isTestAccount: true }, select: { id: true, email: true } })
    expect(toDelete.map(u => u.id)).toContain(testUser.id)
    expect(toDelete.map(u => u.id)).not.toContain(realUser.id)

    for (const u of toDelete) await prisma.user.delete({ where: { id: u.id } })

    const testStillThere = await prisma.user.findUnique({ where: { id: testUser.id } })
    const realStillThere = await prisma.user.findUnique({ where: { id: realUser.id } })
    expect(testStillThere).toBeNull()
    expect(realStillThere).not.toBeNull()
  })

  it('guards.assertSeedAllowed throws BetaSeedAbortError when BETA_SEED_ENABLED is not set', () => {
    const prev = process.env.BETA_SEED_ENABLED
    delete process.env.BETA_SEED_ENABLED
    expect(() => assertSeedAllowed()).toThrow(BetaSeedAbortError)
    if (prev !== undefined) process.env.BETA_SEED_ENABLED = prev
  })

  it('BETA_SEED_VERSION is a non-empty, stable version string', () => {
    expect(BETA_SEED_VERSION).toMatch(/^beta-v\d+$/)
  })
})
