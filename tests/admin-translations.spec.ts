import { test, expect } from '@playwright/test'
import { adminTranslations } from '../client/src/i18n/adminTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

const flatten = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key))
}

test('admin shell translations expose the same keys in every language', () => {
  const baseline = flatten(adminTranslations['pt-PT']).sort()

  for (const language of languages) {
    expect(flatten(adminTranslations[language]).sort()).toEqual(baseline)
  }
})

test('admin shell translations contain no empty values', () => {
  for (const language of languages) {
    const values = JSON.stringify(adminTranslations[language])
    expect(values).not.toContain('""')
  }
})
