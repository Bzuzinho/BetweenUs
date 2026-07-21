import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  surface:'#102129', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  danger:'#F87171',
}

const fieldLabel = { fontSize:13, color:C.text2, display:'block', marginBottom:4 }
const inputStyle = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
  borderRadius:12, padding:'13px 16px', color:C.text, fontSize:14,
  outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box',
  marginBottom:12, WebkitAppearance:'none',
}

export default function LocationAutocomplete({
  countryCode,
  onCountryChange,
  locationId,
  locationLabel,
  onSelectLocation,
  customLocality,
  onCustomLocalityChange,
  showCustomLocality = true,
  label,
  required = true,
  disabled = false,
}) {
  const { t } = useI18n()
  const [countries, setCountries] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    api.get('/locations/countries').then(response => setCountries(response.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const handleOutside = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchError('')
    if (!countryCode || query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      api.get('/locations/search', { params:{ country:countryCode, q:query.trim() } })
        .then(response => setResults(response.data.results || []))
        .catch(() => {
          setResults([])
          setSearchError(t('location.searchError'))
        })
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, countryCode, t])

  const handleSelect = location => {
    onSelectLocation(location)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleClear = useCallback(() => {
    onSelectLocation(null)
    setQuery('')
  }, [onSelectLocation])

  const resolvedLabel = label || t('location.defaultLabel')

  return (
    <div ref={containerRef}>
      <label style={fieldLabel}>{t('location.country')}</label>
      <select
        style={{ ...inputStyle, cursor:disabled ? 'default' : 'pointer' }}
        value={countryCode || ''}
        disabled={disabled}
        onChange={event => {
          onCountryChange(event.target.value)
          onSelectLocation(null)
          setQuery('')
        }}
      >
        <option value="" style={{ background:C.surface }}>{t('location.chooseCountry')}</option>
        {countries.map(country => (
          <option key={country.code} value={country.code} style={{ background:C.surface }}>{country.name}</option>
        ))}
      </select>

      <label style={fieldLabel}>{resolvedLabel}{required ? ' *' : ` (${t('location.optional')})`}</label>

      {locationId && locationLabel ? (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
          background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12,
          padding:'13px 16px', marginBottom:12,
        }}>
          <span style={{ color:C.text, fontSize:14 }}>{locationLabel}</span>
          {!disabled && (
            <button type="button" onClick={handleClear} style={{
              background:'none', border:'none', color:C.primary, fontSize:13,
              cursor:'pointer', padding:0, fontWeight:600,
            }}>{t('location.change')}</button>
          )}
        </div>
      ) : (
        <div style={{ position:'relative', marginBottom:results.length || searching ? 0 : 12 }}>
          <input
            style={{ ...inputStyle, marginBottom:0 }}
            placeholder={countryCode ? t('location.typeTwo') : t('location.chooseFirst')}
            value={query}
            disabled={disabled || !countryCode}
            onChange={event => { setQuery(event.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
          {open && countryCode && query.trim().length >= 2 && (
            <div style={{
              position:'absolute', top:'100%', left:0, right:0, zIndex:20,
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
              marginTop:4, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {searching && <div style={{ padding:'12px 16px', color:C.muted, fontSize:13 }}>{t('location.searching')}</div>}
              {!searching && !searchError && results.length === 0 && (
                <div style={{ padding:'12px 16px', color:C.muted, fontSize:13 }}>{t('location.noResults')} “{query.trim()}”.</div>
              )}
              {!searching && searchError && (
                <div style={{ padding:'12px 16px', color:C.danger, fontSize:13 }}>{searchError}</div>
              )}
              {!searching && results.map(result => (
                <div
                  key={result.id}
                  onMouseDown={event => { event.preventDefault(); handleSelect(result) }}
                  style={{
                    padding:'12px 16px', color:C.text, fontSize:14, cursor:'pointer',
                    borderBottom:`1px solid ${C.border}`,
                  }}
                >
                  {result.label}
                </div>
              ))}
            </div>
          )}
          <div style={{ height:12 }} />
        </div>
      )}

      {required && !locationId && (
        <div style={{ fontSize:11, color:C.muted, marginTop:-6, marginBottom:12 }}>
          {t('location.chooseFromList')}
        </div>
      )}

      {showCustomLocality && (
        <>
          <label style={fieldLabel}>{t('location.customLabel')}</label>
          <input
            style={inputStyle}
            placeholder={t('location.customPlaceholder')}
            value={customLocality || ''}
            disabled={disabled}
            onChange={event => onCustomLocalityChange(event.target.value)}
          />
        </>
      )}
    </div>
  )
}
