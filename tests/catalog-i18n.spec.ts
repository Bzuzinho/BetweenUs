import { test, expect } from '@playwright/test'
import {
  catalogTranslations,
  catalogLabel,
  intentionLabel,
  intentionDescription,
} from '../client/src/i18n/catalogTranslations.js'

const LANGUAGES = ['pt-PT', 'en', 'fr'] as const

const INTENTION_SLUGS = [
  'casual_encounter', 'recurring_connection', 'trio_experience', 'swing',
  'polyamory', 'online_only', 'friends_with_benefits', 'fetish_exploration',
  'seek_couple', 'seek_third', 'conversation_only', 'open_relationship',
  'still_exploring',
]

const GENDER_SLUGS = [
  'man', 'woman', 'non_binary', 'transgender_man', 'transgender_woman',
  'gender_fluid', 'agender', 'questioning', 'other', 'prefer_not_to_say',
]

const ORIENTATION_SLUGS = [
  'straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual',
  'demisexual', 'queer', 'questioning', 'other', 'prefer_not_to_say',
]

const BOUNDARY_CATEGORY_SLUGS = [
  'relationship_type', 'meeting_type', 'privacy', 'conversation_style',
]

const BOUNDARY_SLUGS = [
  'no_emotional_involvement', 'open_to_emotional',
  'recurring_emotional_connection', 'no_couples', 'couples_only',
  'singles_only', 'online_only', 'open_to_meeting', 'one_time_only',
  'recurring_ok', 'meet_after_conversation', 'spontaneous_meeting',
  'no_face_photos', 'face_visible_before_match', 'face_visible_after_match',
  'private_gallery_requests', 'no_known_contacts', 'verified_only',
  'discretion_required', 'talk_first', 'talk_online_first', 'direct_approach',
  'slow_pace', 'fast_pace',
]

const getNested = (object: any, path: string) =>
  path.split('.').reduce((value, key) => value?.[key], object)

const translatorFor = (language: typeof LANGUAGES[number]) =>
  (key: string, fallback = '') => getNested(catalogTranslations[language], key) ?? fallback

for (const language of LANGUAGES) {
  test(`catalog translations cover all seeded slugs in ${language}`, () => {
    const catalog = catalogTranslations[language].catalog

    for (const slug of INTENTION_SLUGS) {
      expect(catalog.intentions[slug]?.label, `missing intention label: ${slug}`).toBeTruthy()
      expect(catalog.intentions[slug]?.description, `missing intention description: ${slug}`).toBeTruthy()
    }

    for (const slug of GENDER_SLUGS) {
      expect(catalog.genders[slug], `missing gender: ${slug}`).toBeTruthy()
    }

    for (const slug of ORIENTATION_SLUGS) {
      expect(catalog.orientations[slug], `missing orientation: ${slug}`).toBeTruthy()
    }

    for (const slug of BOUNDARY_CATEGORY_SLUGS) {
      expect(catalog.boundaryCategories[slug], `missing boundary category: ${slug}`).toBeTruthy()
    }

    for (const slug of BOUNDARY_SLUGS) {
      expect(catalog.boundaries[slug], `missing boundary: ${slug}`).toBeTruthy()
    }
  })

  test(`catalog helpers preserve backend fallback values in ${language}`, () => {
    const t = translatorFor(language)
    const unknown = {
      slug: 'future_custom_value',
      name: 'Backend fallback name',
      description: 'Backend fallback description',
    }

    expect(catalogLabel(t, 'genders', unknown.slug, unknown.name)).toBe(unknown.name)
    expect(intentionLabel(t, unknown)).toBe(unknown.name)
    expect(intentionDescription(t, unknown)).toBe(unknown.description)
  })
}

test('catalog languages expose the same stable slug sets', () => {
  const [reference, ...others] = LANGUAGES.map(language => catalogTranslations[language].catalog)

  for (const catalog of others) {
    expect(Object.keys(catalog.intentions).sort()).toEqual(Object.keys(reference.intentions).sort())
    expect(Object.keys(catalog.genders).sort()).toEqual(Object.keys(reference.genders).sort())
    expect(Object.keys(catalog.orientations).sort()).toEqual(Object.keys(reference.orientations).sort())
    expect(Object.keys(catalog.boundaryCategories).sort()).toEqual(Object.keys(reference.boundaryCategories).sort())
    expect(Object.keys(catalog.boundaries).sort()).toEqual(Object.keys(reference.boundaries).sort())
  }
})
