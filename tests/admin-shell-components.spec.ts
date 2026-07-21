import { test, expect } from '@playwright/test'
import { ADMIN_TABS } from '../client/src/components/admin/AdminTabBar.jsx'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

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
