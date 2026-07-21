import { test, expect } from '@playwright/test'
import { ADMIN_REFERRAL_STATUSES, adminReferralStatus } from '../client/src/components/admin/adminUserReferralsContracts.js'
import { adminUserReferralsTranslations } from '../client/src/i18n/adminUserReferralsTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin referral statuses stay stable', () => {
  expect(ADMIN_REFERRAL_STATUSES).toEqual(['REGISTERED', 'SUBSCRIBED', 'CREDITED'])
  expect(adminReferralStatus({})).toBe('REGISTERED')
  expect(adminReferralStatus({ subscribedAt:'2026-01-01' })).toBe('SUBSCRIBED')
  expect(adminReferralStatus({ subscribedAt:'2026-01-01', creditGranted:true })).toBe('CREDITED')
})

test('admin referral copy is localized', () => {
  for (const language of languages) {
    const referrals = adminUserReferralsTranslations[language].admin.userReferrals
    expect(referrals.title).toBeTruthy()
    expect(referrals.invitedCount).toContain('{count}')
    for (const status of ADMIN_REFERRAL_STATUSES) expect(referrals.status[status]).toBeTruthy()
  }
})
