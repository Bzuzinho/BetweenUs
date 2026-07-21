import { test, expect } from '@playwright/test'
import { ADMIN_LOCATION_ENDPOINTS, ADMIN_LOCATION_SEARCH_MIN_LENGTH, ADMIN_UNRESOLVED_PROFILE_LIMIT } from '../client/src/components/admin/adminLocationsContracts.js'
import { adminLocationsTranslations } from '../client/src/i18n/adminLocationsTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin locations endpoints and limits stay stable', () => {
  expect(ADMIN_LOCATION_ENDPOINTS.search).toBe('/locations/admin/search')
  expect(ADMIN_LOCATION_ENDPOINTS.unresolved).toBe('/locations/admin/profiles-without-reference')
  expect(ADMIN_LOCATION_ENDPOINTS.deactivate('loc-1')).toBe('/locations/admin/loc-1/deactivate')
  expect(ADMIN_LOCATION_ENDPOINTS.assignProfile('profile-1')).toBe('/locations/admin/profiles/profile-1/location')
  expect(ADMIN_LOCATION_SEARCH_MIN_LENGTH).toBe(2)
  expect(ADMIN_UNRESOLVED_PROFILE_LIMIT).toBe(50)
})

test('admin locations copy is localized', () => {
  for (const language of languages) {
    const locations = adminLocationsTranslations[language].admin.settings.locations
    expect(locations.title).toBeTruthy()
    expect(locations.confirmDeactivate).toContain('{location}')
    expect(locations.fixPlaceholder).toContain('{country}')
    expect(locations.profileFixed).toBeTruthy()
  }
})
