import { test, expect } from '@playwright/test'
import { ADMIN_USER_DETAIL_TABS, visibleAdminUserDetailTabs } from '../client/src/components/admin/adminUserDetailNavigationContracts.js'
import { adminUserNavigationTranslations } from '../client/src/i18n/adminUserNavigationTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin user detail navigation stays stable', () => {
  expect(ADMIN_USER_DETAIL_TABS).toEqual(['info','profile','couple','subscription','referrals','verification','privacy','history'])
  expect(visibleAdminUserDetailTabs()).not.toContain('couple')
  expect(visibleAdminUserDetailTabs({ hasCoupleContext:true })).toContain('couple')
})

test('admin user detail navigation is localized', () => {
  for (const language of languages) {
    const navigation = adminUserNavigationTranslations[language].admin.userNavigation
    expect(navigation.label).toBeTruthy()
    expect(navigation.unavailable).toBeTruthy()
    for (const tab of ADMIN_USER_DETAIL_TABS) expect(navigation.tabs[tab]).toBeTruthy()
  }
})
