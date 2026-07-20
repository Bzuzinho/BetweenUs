import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SUPPORTED_LANGUAGES, translations } from './translations'
import { exploreTranslations } from './exploreTranslations'
import { accountTranslations } from './accountTranslations'
import { passwordTranslations } from './passwordTranslations'
import { emailTranslations } from './emailTranslations'
import { premiumTranslations } from './premiumTranslations'
import { legalTranslations } from './legalTranslations'
import { privacyTranslations } from './privacyTranslations'
import { verificationTranslations } from './verificationTranslations'
import { contactsTranslations } from './contactsTranslations'
import { photosTranslations } from './photosTranslations'
import { referralsTranslations } from './referralsTranslations'
import { profileFormTranslations } from './profileFormTranslations'
import { authRouteTranslations } from './authRouteTranslations'
import { otpTranslations } from './otpTranslations'

const STORAGE_KEY = 'betweenus.language'
const DEFAULT_LANGUAGE = 'pt-PT'
const I18nContext = createContext(null)

const resolveLanguage = value => SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE
const getNestedValue = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)

const supplementalCatalogs = {
  explore: exploreTranslations,
  account: accountTranslations,
  common: accountTranslations,
  forgot: passwordTranslations,
  reset: passwordTranslations,
  emailVerify: emailTranslations,
  premium: premiumTranslations,
  legal: legalTranslations,
  privacySettings: privacyTranslations,
  verification: verificationTranslations,
  contactsBlock: contactsTranslations,
  photos: photosTranslations,
  referrals: referralsTranslations,
  profileForm: profileFormTranslations,
  editProfile: profileFormTranslations,
  authRoute: authRouteTranslations,
  otp: otpTranslations,
}

function getSupplementalValue(language, key) {
  const namespace = key.split('.')[0]
  const catalog = supplementalCatalogs[namespace]
  if (!catalog) return undefined
  return getNestedValue(catalog[language], key)
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => resolveLanguage(localStorage.getItem(STORAGE_KEY)))

  const setLanguage = useCallback(value => {
    const next = resolveLanguage(value)
    localStorage.setItem(STORAGE_KEY, next)
    setLanguageState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useCallback((key, fallback) => {
    return getNestedValue(translations[language], key)
      ?? getSupplementalValue(language, key)
      ?? getNestedValue(translations[DEFAULT_LANGUAGE], key)
      ?? getSupplementalValue(DEFAULT_LANGUAGE, key)
      ?? fallback
      ?? key
  }, [language])

  const formatDate = useCallback((value, options = {}) => {
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(language, options).format(date)
  }, [language])

  const formatNumber = useCallback((value, options = {}) => {
    return new Intl.NumberFormat(language, options).format(value)
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, t, formatDate, formatNumber }),
    [language, setLanguage, t, formatDate, formatNumber]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
