import { test, expect } from '@playwright/test'
import { PROFILE_DECISIONS, PROFILE_STATUSES } from '../client/src/components/admin/adminProfileContracts.js'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const
const fieldKeys = ['gender', 'orientation', 'relationshipStatus', 'discretion', 'photos', 'status']

test('profile moderation keeps backend status and decision contracts stable', () => {
  expect(PROFILE_STATUSES).toEqual(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DRAFT'])
  expect(PROFILE_DECISIONS).toEqual({ approve: 'APPROVED', reject: 'REJECTED' })
})

test('profile moderation translations cover queue, detail and actions', () => {
  for (const language of languages) {
    const profiles = adminTranslations[language].admin.profiles

    expect(profiles.empty).toBeTruthy()
    expect(profiles.loadError).toBeTruthy()
    expect(profiles.actionError).toBeTruthy()
    expect(profiles.unknownProfile).toBeTruthy()
    expect(profiles.back).toBeTruthy()
    expect(profiles.created).toBeTruthy()
    expect(profiles.approve).toBeTruthy()
    expect(profiles.reject).toBeTruthy()
    expect(profiles.rejectTitle).toBeTruthy()
    expect(profiles.gallery).toContain('{count}')

    for (const status of PROFILE_STATUSES) {
      expect(profiles.status[status]).toBeTruthy()
      expect(profiles.status[status]).not.toBe(status)
    }

    for (const key of fieldKeys) {
      expect(profiles.fields[key]).toBeTruthy()
      expect(profiles.fields[key]).not.toBe(key)
    }
  }
})
