import { test, expect } from '@playwright/test'
import { ADMIN_DISPLAYED_SUBSCRIPTION_PLANS, STRIPE_PRODUCTS_URL } from '../client/src/components/admin/adminSubscriptionPlansContracts.js'
import { adminSubscriptionPlansTranslations } from '../client/src/i18n/adminSubscriptionPlansTranslations.js'

const languages = ['pt-PT', 'en', 'fr'] as const

test('admin displayed subscription plans stay stable', () => {
  expect(ADMIN_DISPLAYED_SUBSCRIPTION_PLANS.map(plan => plan.slug)).toEqual(['FREE', 'PREMIUM'])
  expect(STRIPE_PRODUCTS_URL).toBe('https://dashboard.stripe.com/products')
})

test('admin subscription plans are localized', () => {
  for (const language of languages) {
    const subscriptions = adminSubscriptionPlansTranslations[language].admin.settings.subscriptions
    expect(subscriptions.openStripe).toBeTruthy()
    for (const plan of ADMIN_DISPLAYED_SUBSCRIPTION_PLANS) {
      expect(subscriptions.plans[plan.translationKey].name).toBeTruthy()
      for (const feature of plan.featureKeys) expect(subscriptions.features[feature]).toBeTruthy()
    }
  }
})
