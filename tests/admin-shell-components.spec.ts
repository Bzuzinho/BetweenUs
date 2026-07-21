import { test, expect } from '@playwright/test'
import { ADMIN_TABS } from '../client/src/components/admin/AdminTabBar.jsx'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

const queueKeys = [
  'verificationsPending',
  'profilesPendingReview',
  'reportsPending',
  'reportsCritical',
  'photosPending',
]

test('every extracted admin tab has a localized label and description', () => {
  const keys = ADMIN_TABS.map(tab => tab.key)
  expect(new Set(keys).size).toBe(keys.length)

  for (const language of languages) {
    for (const tab of ADMIN_TABS) {
      const translation = adminTranslations[language].admin.tabs[tab.translationKey]
      expect(translation?.label).toBeTruthy()
      expect(translation?.description).toBeTruthy()
      expect(translation.label).not.toBe(tab.translationKey)
    }
  }
})

test('admin navigation keeps technical route keys stable', () => {
  expect(ADMIN_TABS.map(tab => tab.key)).toEqual([
    'dashboard',
    'reports',
    'photos',
    'profiles',
    'users',
    'verifications',
    'conversations',
    'audit',
    'beta',
    'configuracoes',
  ])
})

test('localized reason modal strings exist in every language', () => {
  for (const language of languages) {
    const modal = adminTranslations[language].admin.modal
    expect(modal.reasonRequired).toBeTruthy()
    expect(modal.internalNote).toBeTruthy()
    expect(modal.cancel).toBeTruthy()
    expect(modal.confirm).toBeTruthy()
  }
})

test('notification shell translations cover all work queues and actions', () => {
  for (const language of languages) {
    const notifications = adminTranslations[language].admin.notifications
    expect(notifications.title).toBeTruthy()
    expect(notifications.clearAll).toBeTruthy()
    expect(notifications.empty).toBeTruthy()
    expect(notifications.delete).toBeTruthy()
    expect(notifications.criticalCount).toContain('{count}')

    for (const key of queueKeys) {
      expect(notifications.queue[key]).toBeTruthy()
      expect(notifications.queue[key]).not.toBe(key)
    }
  }
})

test('service status translations cover moderator and support states', () => {
  for (const language of languages) {
    const service = adminTranslations[language].admin.service
    expect(service.active).toBeTruthy()
    expect(service.inactive).toBeTruthy()
    expect(service.activeDescription).toBeTruthy()
    expect(service.startModerator).toBeTruthy()
    expect(service.startSupport).toBeTruthy()
    expect(service.start).toBeTruthy()
    expect(service.stop).toBeTruthy()
  }
})

test('admin account menu translations cover every extracted action', () => {
  for (const language of languages) {
    const account = adminTranslations[language].admin.account
    expect(account.adminAccount).toBeTruthy()
    expect(account.changePassword).toBeTruthy()
    expect(account.logout).toBeTruthy()
    expect(account.fallbackName).toBeTruthy()

    expect(account.adminAccount).not.toBe('adminAccount')
    expect(account.changePassword).not.toBe('changePassword')
    expect(account.logout).not.toBe('logout')
  }
})

test('common async states are localized in every supported language', () => {
  for (const language of languages) {
    const common = adminTranslations[language].admin.common
    expect(common.loading).toBeTruthy()
    expect(common.retry).toBeTruthy()
    expect(common.unavailable).toBeTruthy()
    expect(common.error).toBeTruthy()

    expect(common.loading).not.toBe('loading')
    expect(common.retry).not.toBe('retry')
    expect(common.unavailable).not.toBe('unavailable')
    expect(common.error).not.toBe('error')
  }
})
