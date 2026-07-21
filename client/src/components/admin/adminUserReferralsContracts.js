export const ADMIN_REFERRAL_STATUSES = ['REGISTERED', 'SUBSCRIBED', 'CREDITED']

export const adminReferralStatus = referral => {
  if (referral?.creditGranted) return 'CREDITED'
  if (referral?.subscribedAt) return 'SUBSCRIBED'
  return 'REGISTERED'
}
