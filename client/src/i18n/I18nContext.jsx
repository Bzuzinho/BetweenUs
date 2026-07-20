import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SUPPORTED_LANGUAGES, translations } from './translations'

const STORAGE_KEY = 'betweenus.language'
const DEFAULT_LANGUAGE = 'pt-PT'
const I18nContext = createContext(null)

const resolveLanguage = value => SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE

const getNestedValue = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)

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
      ?? getNestedValue(translations[DEFAULT_LANGUAGE], key)
      ?? fallback
      ?? key
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
