import { test, expect } from '@playwright/test'
import { ADMIN_ACCOUNT_FILTERS, ADMIN_USER_STATUS_FILTERS, buildAdminUsersQuery } from '../client/src/components/admin/adminUserContracts.js'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin user list filters keep backend query semantics stable', () => {
  expect(ADMIN_ACCOUNT_FILTERS).toEqual(['all', 'real', 'test'])
  expect(ADMIN_USER_STATUS_FILTERS).toEqual(['active', 'DELETED', 'ALL'])
  expect(buildAdminUsersQuery()).toBe('')
  expect(buildAdminUsersQuery({ search:'ana@example.com', accountFilter:'real', statusFilter:'DELETED' }))
    .toBe('?search=ana%40example.com&accountFilter=real&status=DELETED')
  expect(buildAdminUsersQuery({ search:'  Ana  ', accountFilter:'all', statusFilter:'active' }))
    .toBe('?search=Ana')
})

test('admin user queue copy is localized in every supported language', () => {
  for (const language of languages) {
    const users = adminTranslations[language].admin.users
    expect(users.search).toBeTruthy()
    expect(users.create).toBeTruthy()
    expect(users.empty).toBeTruthy()
    expect(users.loadError).toBeTruthy()
    expect(users.risk).toContain('{score}')
    expect(users.deletedDates).toContain('{deletedAt}')
    expect(users.deletedDates).toContain('{hardDeleteAt}')

    for (const filter of ADMIN_ACCOUNT_FILTERS) expect(users.accountFilters[filter]).toBeTruthy()
    for (const filter of ADMIN_USER_STATUS_FILTERS) expect(users.statusFilters[filter]).toBeTruthy()
  }
})
