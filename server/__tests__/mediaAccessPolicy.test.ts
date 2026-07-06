// 3.9 — pure unit tests for 3.2's MediaAccessPolicy. No DB needed: this is
// exactly the kind of decision logic that should be testable in isolation,
// which is why mediaAccessPolicy.ts has zero I/O.
import { decideMediaAccessLevel, canAccessVerificationSelfie } from '../src/lib/mediaAccessPolicy'

const basePhoto = { visibilityLevel: 'PUBLIC', moderationStatus: 'APPROVED' }
const baseCtx = { isOwner: false, isAdminModeration: false, hasActiveMatch: false, hasApprovedAccessRequest: false }

describe('decideMediaAccessLevel', () => {
  it('owner always gets CLEAN, regardless of visibility tier or moderation', () => {
    expect(decideMediaAccessLevel(
      { visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'PENDING' },
      { ...baseCtx, isOwner: true }
    )).toBe('CLEAN')
  })

  it('admin moderation context always gets CLEAN', () => {
    expect(decideMediaAccessLevel(
      { visibilityLevel: 'BLURRED', moderationStatus: 'PENDING' },
      { ...baseCtx, isAdminModeration: true }
    )).toBe('CLEAN')
  })

  it('non-owner, non-admin gets NONE if the photo has not cleared moderation', () => {
    expect(decideMediaAccessLevel(
      { visibilityLevel: 'PUBLIC', moderationStatus: 'PENDING' },
      baseCtx
    )).toBe('NONE')
    expect(decideMediaAccessLevel(
      { visibilityLevel: 'PUBLIC', moderationStatus: 'REJECTED' },
      baseCtx
    )).toBe('NONE')
  })

  it('PUBLIC + approved: everyone gets CLEAN', () => {
    expect(decideMediaAccessLevel(basePhoto, baseCtx)).toBe('CLEAN')
  })

  it('BLURRED + approved: non-owner always gets BLURRED, never CLEAN', () => {
    const photo = { visibilityLevel: 'BLURRED', moderationStatus: 'APPROVED' }
    expect(decideMediaAccessLevel(photo, baseCtx)).toBe('BLURRED')
    expect(decideMediaAccessLevel(photo, { ...baseCtx, hasActiveMatch: true, hasApprovedAccessRequest: true })).toBe('BLURRED')
  })

  it('PRIVATE_AFTER_MATCH: BLURRED without a match, CLEAN with one', () => {
    const photo = { visibilityLevel: 'PRIVATE_AFTER_MATCH', moderationStatus: 'APPROVED' }
    expect(decideMediaAccessLevel(photo, baseCtx)).toBe('BLURRED')
    expect(decideMediaAccessLevel(photo, { ...baseCtx, hasActiveMatch: true })).toBe('CLEAN')
    // an approved access request alone should NOT unlock a match-gated photo
    expect(decideMediaAccessLevel(photo, { ...baseCtx, hasApprovedAccessRequest: true })).toBe('BLURRED')
  })

  it('PRIVATE_AFTER_APPROVAL: BLURRED without approval, CLEAN with it', () => {
    const photo = { visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'APPROVED' }
    expect(decideMediaAccessLevel(photo, baseCtx)).toBe('BLURRED')
    expect(decideMediaAccessLevel(photo, { ...baseCtx, hasApprovedAccessRequest: true })).toBe('CLEAN')
    // an active match alone should NOT unlock an approval-gated photo
    expect(decideMediaAccessLevel(photo, { ...baseCtx, hasActiveMatch: true })).toBe('BLURRED')
  })

  it('unknown visibilityLevel defaults to BLURRED rather than leaking CLEAN', () => {
    expect(decideMediaAccessLevel(
      { visibilityLevel: 'SOMETHING_NEW', moderationStatus: 'APPROVED' },
      baseCtx
    )).toBe('BLURRED')
  })
})

describe('canAccessVerificationSelfie', () => {
  it('owner can access their own selfie', () => {
    expect(canAccessVerificationSelfie({ isOwner: true, isAdminModeration: false })).toBe(true)
  })
  it('admin moderation context can access', () => {
    expect(canAccessVerificationSelfie({ isOwner: false, isAdminModeration: true })).toBe(true)
  })
  it('no one else can — there is no blurred tier for selfies', () => {
    expect(canAccessVerificationSelfie({ isOwner: false, isAdminModeration: false })).toBe(false)
  })
})
