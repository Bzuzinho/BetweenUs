import { test, expect } from '@playwright/test'
import { adminSettingsTranslations } from '../client/src/i18n/adminSettingsTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin email and referral settings copy is localized', () => {
  for (const language of languages) {
    const settings = adminSettingsTranslations[language].admin.settings
    expect(settings.email.title).toBeTruthy()
    expect(settings.email.sent).toContain('{email}')
    expect(settings.email.status.ok).toBeTruthy()
    expect(settings.referrals.title).toBeTruthy()
    expect(settings.referrals.current).toContain('{required}')
    expect(settings.referrals.current).toContain('{months}')
  }
})
