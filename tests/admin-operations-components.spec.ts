import { test, expect } from '@playwright/test'
import { adminOperationsTranslations } from '../client/src/i18n/adminOperationsTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin operations copy is localized', () => {
  for (const language of languages) {
    const admin = adminOperationsTranslations[language].admin
    expect(admin.verifications.approve).toBeTruthy()
    expect(admin.verifications.reject).toBeTruthy()
    expect(admin.conversations.reasonRequired).toBeTruthy()
    expect(admin.conversations.messageCount).toContain('{count}')
    expect(admin.audit.tabs.logs).toBeTruthy()
    expect(admin.audit.duration).toContain('{minutes}')
    expect(admin.beta.usage).toContain('{used}')
    expect(admin.beta.usage).toContain('{max}')
  }
})
