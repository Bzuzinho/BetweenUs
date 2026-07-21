import { test, expect } from '@playwright/test'
import { ADMIN_PROFILE_DETAIL_STATUSES } from '../client/src/components/admin/AdminUserProfilePanel.jsx'
import { adminUserPanelsTranslations } from '../client/src/i18n/adminUserPanelsTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin profile detail keeps moderation statuses stable', () => {
  expect(ADMIN_PROFILE_DETAIL_STATUSES).toEqual([
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'HIDDEN',
    'SUSPENDED',
  ])
})

test('admin profile and subscription copy is localized', () => {
  for (const language of languages) {
    const admin = adminUserPanelsTranslations[language].admin
    expect(admin.userProfile.title).toBeTruthy()
    expect(admin.userProfile.photoCount).toContain('{count}')
    for (const status of ADMIN_PROFILE_DETAIL_STATUSES) {
      expect(admin.userProfile.status[status]).toBeTruthy()
      expect(admin.userProfile.status[status]).not.toBe(status)
    }

    expect(admin.userSubscription.title).toBeTruthy()
    expect(admin.userSubscription.amountPaid).toBeTruthy()
    expect(admin.userSubscription.totalPaid).toBeTruthy()
    expect(admin.userSubscription.failedPayments).toBeTruthy()
    expect(admin.userSubscription.noLocalHistory).toBeTruthy()
    expect(admin.userSubscription.testAccountNote).toBeTruthy()
  }
})
