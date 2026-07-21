import { test, expect } from '@playwright/test'
import {
  SHARED_PROFILE_TYPES,
  SHARED_MEMBER_STATUSES,
  INDIVIDUAL_DISCOVERY_POLICIES,
  sharedProfileTypeKey,
  discoveryPolicyKey,
} from '../client/src/components/admin/adminCoupleContextContracts.js'
import { adminCoupleContextTranslations } from '../client/src/i18n/adminCoupleContextTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin couple context contracts stay stable', () => {
  expect(SHARED_PROFILE_TYPES).toEqual(['COUPLE', 'GROUP'])
  expect(SHARED_MEMBER_STATUSES).toEqual(['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED'])
  expect(INDIVIDUAL_DISCOVERY_POLICIES).toEqual(['SHARED_ONLY', 'INDIVIDUAL_AND_SHARED'])
  expect(sharedProfileTypeKey('GROUP')).toBe('group')
  expect(sharedProfileTypeKey('COUPLE')).toBe('couple')
  expect(discoveryPolicyKey('INDIVIDUAL_AND_SHARED')).toBe('individualAndShared')
  expect(discoveryPolicyKey('SHARED_ONLY')).toBe('sharedOnly')
})

test('admin couple context copy is localized', () => {
  for (const language of languages) {
    const context = adminCoupleContextTranslations[language].admin.coupleContext
    expect(context.title).toBeTruthy()
    expect(context.viewRaw).toBeTruthy()
    expect(context.rawWarning).toBeTruthy()
    expect(context.type.couple).toBeTruthy()
    expect(context.type.group).toBeTruthy()
    expect(context.discovery.sharedOnly).toBeTruthy()
    expect(context.discovery.individualAndShared).toBeTruthy()
    for (const status of SHARED_MEMBER_STATUSES) expect(context.memberStatus[status]).toBeTruthy()
  }
})
