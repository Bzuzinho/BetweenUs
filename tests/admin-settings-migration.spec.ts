import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { ADMIN_CATALOG_CONFIGS, ADMIN_ROLE_REFERENCE, ADMIN_SETTINGS_TABS, BOUNDARY_CONSTRAINT_TYPES, BOUNDARY_RULE_TYPES, CIRCLE_STATUSES, CIRCLE_VISIBILITIES, EVENT_STATUSES, GUIDE_CATEGORIES } from '../client/src/components/admin/adminSettingsContracts.js'
import { adminSettingsTranslations } from '../client/src/i18n/adminSettingsTranslations.js'

const languages = ['pt-PT','en','fr'] as const

test('admin settings expose all migrated tabs and stable technical contracts', () => {
  expect(ADMIN_SETTINGS_TABS).toEqual(['profiles','adminRoles','genders','orientations','intentions','boundaries','privateInterests','locations','subscriptions','email','guide','events','circles','recommendations','referrals'])
  expect(Object.keys(ADMIN_CATALOG_CONFIGS)).toEqual(['genders','orientations','intentions','privateInterests','boundaries'])
  expect(BOUNDARY_RULE_TYPES).toEqual(['MUTUAL_ALIGNMENT','REQUIRE_TARGET_ACCEPTANCE','PERSONAL_PREFERENCE','CANDIDATE_CONSTRAINT'])
  expect(BOUNDARY_CONSTRAINT_TYPES).toEqual(['EXCLUDE_COUPLES','COUPLES_ONLY','INDIVIDUALS_ONLY','VERIFIED_ONLY'])
  expect(EVENT_STATUSES).toEqual(['DRAFT','PENDING_REVIEW','PUBLISHED','CANCELLED','COMPLETED','SUSPENDED'])
  expect(CIRCLE_VISIBILITIES).toEqual(['DISCOVERABLE','PRIVATE','INVITE_ONLY'])
  expect(CIRCLE_STATUSES).toEqual(['DRAFT','ACTIVE','PAUSED','ARCHIVED'])
  expect(GUIDE_CATEGORIES).toHaveLength(9)
  expect(ADMIN_ROLE_REFERENCE.map(role => role.value)).toEqual(['CONTENT_REVIEWER','SUPPORT','MODERATOR','FINANCE','ADMIN','SUPER_ADMIN'])
})

test('every settings tab and technical value is localized', () => {
  for (const language of languages) {
    const settings = adminSettingsTranslations[language].admin.settings
    for (const tab of ADMIN_SETTINGS_TABS) expect(settings.tabs[tab]).toBeTruthy()
    for (const value of BOUNDARY_RULE_TYPES) expect(settings.boundaryRule[value]).toBeTruthy()
    for (const value of BOUNDARY_CONSTRAINT_TYPES) expect(settings.boundaryConstraint[value]).toBeTruthy()
    for (const value of EVENT_STATUSES) expect(settings.events.status[value]).toBeTruthy()
    for (const value of CIRCLE_VISIBILITIES) expect(settings.circles.visibility[value]).toBeTruthy()
    for (const value of CIRCLE_STATUSES) expect(settings.circles.status[value]).toBeTruthy()
    for (const value of GUIDE_CATEGORIES) expect(settings.guide.category[value]).toBeTruthy()
    expect(settings.catalogs.usage).toContain('{count}')
    expect(settings.locations.corrected).toBeTruthy()
    expect(settings.recommendations.state.READY_FOR_REVIEW.label).toBeTruthy()
  }
})

test('runtime routes settings through the modular admin page', () => {
  const modular = readFileSync('client/src/pages/AdminModularPage.jsx','utf8')
  const router = readFileSync('client/src/pages/AdminPageRouter.jsx','utf8')
  const settingsPage = readFileSync('client/src/components/admin/AdminSettingsPage.jsx','utf8')

  expect(modular).toContain("'configuracoes'")
  expect(modular).toContain('<AdminSettingsPage colors={C} />')
  expect(settingsPage).toContain('ADMIN_SETTINGS_TABS.map')
  expect(router).toContain('MODULAR_ADMIN_TABS.includes')
})
