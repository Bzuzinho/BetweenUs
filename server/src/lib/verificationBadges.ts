// 3.4 — Public badge exposure for identity verification.
//
// Verification stays 1-record-per-user (see schema.prisma note above the
// VerificationType enum), so today this only ever returns zero or one
// badge. Shaped as an array on purpose so multi-type verification can be
// added later without changing every consumer of this helper.
export interface BadgeableVerification {
  type: string
  status: string
}

export const getVerificationBadges = (verification?: BadgeableVerification | null): string[] => {
  if (!verification || verification.status !== 'APPROVED') return []
  return [`${verification.type.toLowerCase()}_verified`]
}
