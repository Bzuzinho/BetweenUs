import { test, expect } from '@playwright/test'
import { ADMIN_SETTINGS_TABS, LEGACY_ADMIN_SETTINGS_KEYS } from '../client/src/components/admin/adminSettingsContracts.js'
import { adminSettingsTranslations } from '../client/src/i18n/adminSettingsTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin settings keeps all fifteen managers stable', () => {
  expect(ADMIN_SETTINGS_TABS).toHaveLength(15)
  expect(Object.keys(LEGACY_ADMIN_SETTINGS_KEYS)).toEqual(ADMIN_SETTINGS_TABS)
})

test('admin settings navigation is localized', () => {
  for (const language of languages) {
    const navigation = adminSettingsTranslations[language].admin.settings.navigation
    expect(navigation.label).toBeTruthy()
    for (const tab of ADMIN_SETTINGS_TABS) expect(navigation.tabs[tab]).toBeTruthy()
  }
})
