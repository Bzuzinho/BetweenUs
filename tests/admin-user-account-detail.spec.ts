import { test, expect } from '@playwright/test'
import { ADMIN_USER_STATUSES, availableAdminUserActions, canViewSensitiveTaxId } from '../client/src/components/admin/adminUserDetailContracts.js'
import { adminUserDetailTranslations } from '../client/src/i18n/adminUserDetailTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin user status contracts and sensitive field access remain stable', () => {
  expect(ADMIN_USER_STATUSES).toEqual(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'])
  expect(canViewSensitiveTaxId('SUPER_ADMIN')).toBe(true)
  expect(canViewSensitiveTaxId('ADMIN')).toBe(true)
  expect(canViewSensitiveTaxId('FINANCE')).toBe(true)
  expect(canViewSensitiveTaxId('MODERATOR')).toBe(false)
  expect(canViewSensitiveTaxId(undefined)).toBe(false)
})

test('admin user actions reflect the current account status', () => {
  expect(availableAdminUserActions('ACTIVE')).toMatchObject({ canSuspend:true, canActivate:false, canEvaluateActivation:false, canDelete:true })
  expect(availableAdminUserActions('SUSPENDED')).toMatchObject({ canSuspend:false, canActivate:true, canDelete:true })
  expect(availableAdminUserActions('PENDING_VERIFICATION')).toMatchObject({ canEvaluateActivation:true, canActivate:false })
  expect(availableAdminUserActions('BANNED')).toMatchObject({ canBan:false, canDelete:true })
  expect(availableAdminUserActions('DELETED')).toMatchObject({ canResetPassword:false, canDelete:false })
})

test('admin user account detail copy is complete in every language', () => {
  for (const language of languages) {
    const detail = adminUserDetailTranslations[language].admin.users.detail
    expect(detail.loadError).toBeTruthy()
    expect(detail.actionError).toBeTruthy()
    expect(detail.statusUpdated).toContain('{status}')
    expect(detail.activate).toBeTruthy()
    expect(detail.suspend).toBeTruthy()
    expect(detail.ban).toBeTruthy()
    expect(detail.resetPassword).toBeTruthy()
    expect(detail.delete).toBeTruthy()
    expect(detail.nifRestricted).toBeTruthy()

    for (const status of ADMIN_USER_STATUSES) expect(detail.status[status]).toBeTruthy()
    for (const key of ['canAppearInDiscovery','canLike','canMatch','canChat']) expect(detail.eligibility[key]).toBeTruthy()
  }
})
