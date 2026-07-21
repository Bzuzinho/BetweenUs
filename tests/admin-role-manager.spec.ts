import { test, expect } from '@playwright/test'
import { ADMIN_ROLES, canManageAdminRoles } from '../client/src/components/admin/adminRoleContracts.js'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const
const roleKeys = ['USER', 'CONTENT_REVIEWER', 'SUPPORT', 'MODERATOR', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'] as const

test('admin role contract remains stable and restricted to super administrators', () => {
  expect(ADMIN_ROLES).toEqual([null, 'CONTENT_REVIEWER', 'SUPPORT', 'MODERATOR', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'])
  expect(canManageAdminRoles('SUPER_ADMIN')).toBe(true)
  expect(canManageAdminRoles('ADMIN')).toBe(false)
  expect(canManageAdminRoles('MODERATOR')).toBe(false)
  expect(canManageAdminRoles(null)).toBe(false)
})

test('admin role manager translations cover every role and action', () => {
  for (const language of languages) {
    const users = adminTranslations[language].admin.users

    for (const role of roleKeys) {
      expect(users.roles[role].label).toBeTruthy()
      expect(users.roles[role].description).toBeTruthy()
      expect(users.roles[role].label).not.toBe(role)
    }

    expect(users.roleManager.title).toBeTruthy()
    expect(users.roleManager.current).toBeTruthy()
    expect(users.roleManager.change).toBeTruthy()
    expect(users.roleManager.reasonRequired).toBeTruthy()
    expect(users.roleManager.reasonPlaceholder).toBeTruthy()
    expect(users.roleManager.save).toBeTruthy()
    expect(users.roleManager.updated).toBeTruthy()
    expect(users.roleManager.error).toBeTruthy()
  }
})
