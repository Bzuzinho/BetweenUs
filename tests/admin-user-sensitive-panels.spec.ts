import { test, expect } from '@playwright/test'
import { ADMIN_PRIVACY_FIELDS, ADMIN_VERIFICATION_STATUSES } from '../client/src/components/admin/adminUserSensitiveContracts.js'
import { adminUserSensitiveTranslations } from '../client/src/i18n/adminUserSensitiveTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin verification and privacy contracts remain stable', () => {
  expect(ADMIN_VERIFICATION_STATUSES).toEqual(['NONE', 'PENDING', 'APPROVED', 'REJECTED'])
  expect(ADMIN_PRIVACY_FIELDS).toEqual([
    'visibleInDiscovery',
    'showDistance',
    'showOnlineStatus',
    'allowPhotoRequests',
    'invisibleMode',
    'notificationMode',
    'minDistanceKm',
  ])
})

test('admin privacy verification and history copy is localized', () => {
  for (const language of languages) {
    const admin = adminUserSensitiveTranslations[language].admin
    expect(admin.userPrivacy.title).toBeTruthy()
    expect(admin.userPrivacy.readOnly).toBeTruthy()
    for (const field of ADMIN_PRIVACY_FIELDS) expect(admin.userPrivacy.fields[field]).toBeTruthy()

    expect(admin.userVerification.title).toBeTruthy()
    expect(admin.userVerification.actionError).toBeTruthy()
    for (const status of ADMIN_VERIFICATION_STATUSES) {
      expect(admin.userVerification.status[status]).toBeTruthy()
      expect(admin.userVerification.status[status]).not.toBe(status)
    }

    expect(admin.userHistory.title).toBeTruthy()
    expect(admin.userHistory.restricted).toBeTruthy()
    expect(admin.userHistory.before).toBeTruthy()
    expect(admin.userHistory.after).toBeTruthy()
  }
})
