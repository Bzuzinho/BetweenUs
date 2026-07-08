// 3.2 — MediaAccessPolicy
//
// Single source of truth for "who gets to see which version of a photo".
// Pure decision logic lives here (no Prisma/network calls) so it can be
// unit-tested in isolation; the I/O needed to gather its inputs (active
// match? approved access request?) lives in mediaAccessService.ts.
//
// Mirrors the visibility tiers already defined on ProfilePhoto:
//   PUBLIC                 -> everyone sees the clean photo
//   BLURRED (default)      -> everyone sees the blurred variant, only the
//                              owner (or moderation) sees clean
//   PRIVATE_AFTER_MATCH    -> blurred to strangers, clean once an ACTIVE
//                              match exists between viewer and photo owner
//   PRIVATE_AFTER_APPROVAL -> blurred to strangers, clean once the owner
//                              has approved a PhotoAccessRequest for viewer
//
// A photo that hasn't cleared moderation is never shown to non-owners,
// regardless of visibilityLevel.

export type MediaAccessLevel = 'CLEAN' | 'BLURRED' | 'NONE'

export interface PolicyPhoto {
  visibilityLevel: string
  moderationStatus: string
}

export interface PolicyContext {
  isOwner: boolean
  // True only for admin/moderation routes that have an explicit, audited
  // reason to bypass viewer-facing gating (e.g. reviewing a report or a
  // pending-moderation photo). Never set this from a viewer-facing route.
  isAdminModeration: boolean
  hasActiveMatch: boolean
  hasApprovedAccessRequest: boolean
}

export const decideMediaAccessLevel = (
  photo: PolicyPhoto,
  ctx: PolicyContext
): MediaAccessLevel => {
  if (ctx.isOwner || ctx.isAdminModeration) return 'CLEAN'
  if (photo.moderationStatus !== 'APPROVED') return 'NONE'

  switch (photo.visibilityLevel) {
    case 'PUBLIC':
      return 'CLEAN'
    case 'PRIVATE_AFTER_MATCH':
      return ctx.hasActiveMatch ? 'CLEAN' : 'BLURRED'
    case 'PRIVATE_AFTER_APPROVAL':
      return ctx.hasApprovedAccessRequest ? 'CLEAN' : 'BLURRED'
    case 'BLURRED':
    default:
      return 'BLURRED'
  }
}

// Verification selfies are never shown to regular viewers — only to the
// owner and to admins acting in an explicit moderation context. There is no
// "blurred" tier for these.
export const canAccessVerificationSelfie = (ctx: {
  isOwner: boolean
  isAdminModeration: boolean
}): boolean => ctx.isOwner || ctx.isAdminModeration
