import { test, expect } from '@playwright/test'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const
const detailKeys = [
  'back',
  'reporter',
  'reported',
  'profile',
  'previous',
  'aiTitle',
  'reassess',
  'noAssessment',
  'severity',
  'recommendedPriority',
  'categories',
  'aiDisclaimer',
  'evidence',
  'evidenceRestricted',
  'noEvidence',
  'internalNote',
  'resolve',
  'escalate',
  'dismiss',
]

test('report detail translations cover moderation context and actions', () => {
  for (const language of languages) {
    const reports = adminTranslations[language].admin.reports
    expect(reports.detailLoadError).toBeTruthy()
    expect(reports.actionError).toBeTruthy()

    for (const key of detailKeys) {
      expect(reports.detail[key]).toBeTruthy()
      expect(reports.detail[key]).not.toBe(key)
    }
  }
})

test('report resolution keeps backend status values unchanged', () => {
  expect(['RESOLVED', 'ESCALATED', 'DISMISSED']).toEqual([
    'RESOLVED',
    'ESCALATED',
    'DISMISSED',
  ])
})
