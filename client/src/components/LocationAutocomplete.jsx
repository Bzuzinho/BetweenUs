import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../lib/api'

// Sistema de localidades (GeoNames) — componente reutilizável partilhado
// por onboarding (CreateProfilePage), EditProfilePage e Travel Mode
// (TravelModeSection). Nunca GPS, nunca geocoding em runtime: só país
// (select, alimentado por GET /locations/countries) + pesquisa por prefixo
// no catálogo interno (GET /locations/search, mínimo 2 caracteres,
// debounced) — a escolha de uma opção da lista é sempre obrigatória para
// gravar uma localidade de referência (locationId); texto livre sozinho
// nunca é aceite como localização de referência. `customLocality` é um
// campo à parte, só apresentação (bairro/zona), nunca usado para
// distância — ver server/src/lib/distanceService.ts.
//
// O componente é "controlado" pelo pai: recebe countryCode/locationId/
// locationLabel/customLocality e reporta mudanças via onCountryChange/
// onSelectLocation/onCustomLocalityChange — nunca guarda o valor
// seleccionado como única fonte de verdade, para o formulário do pai poder
// pré-preencher (edição) ou persistir num draft (onboarding) sem
// duplicação de estado.
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
  label = 'Localidade de referência',
  required = true,
  disabled = false,
}) {
  const [countries, setCountries] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    api.get('/locations/countries').then(r => setCountries(r.data || [])).catch(() => {})
  }, [])

  // Fecha o dropdown ao clicar fora — usa mousedown (não click) para
  // correr ANTES do onMouseDown de selecção de uma opção, evitando a
  // corrida clássica "blur fecha antes do clique registar".
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchError('')
    if (!countryCode || query.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      api.get('/locations/search', { params: { country: countryCode, q: query.trim() } })
        .then(r => setResults(r.data.results || []))
        .catch(() => { setResults([]); setSearchError('Erro ao pesquisar. Tenta novamente.') })
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, countryCode])

  const handleSelect = (loc) => {
    onSelectLocation(loc)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleClear = useCallback(() => {
    onSelectLocation(null)
    setQuery('')
  }, [onSelectLocation])

  return (
    <div ref={containerRef}>
      <label style={fieldLabel}>País</label>
      <select
        style={{ ...inputStyle, cursor: disabled ? 'default' : 'pointer' }}
        value={countryCode || ''}
        disabled={disabled}
        onChange={e => {
          onCountryChange(e.target.value)
          onSelectLocation(null) // país mudou — a localidade seleccionada já não é válida
          setQuery('')
        }}
      >
        <option value="" style={{ background: C.surface }}>Escolhe um país</option>
        {countries.map(c => (
          <option key={c.code} value={c.code} style={{ background: C.surface }}>{c.name}</option>
        ))}
      </select>

      <label style={fieldLabel}>{label}{required ? ' *' : ' (opcional)'}</label>

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
            }}>Alterar</button>
          )}
        </div>
      ) : (
        <div style={{ position:'relative', marginBottom: results.length || searching ? 0 : 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0 }}
            placeholder={countryCode ? 'Escreve pelo menos 2 letras…' : 'Escolhe primeiro um país'}
            value={query}
            disabled={disabled || !countryCode}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
          {open && countryCode && query.trim().length >= 2 && (
            <div style={{
              position:'absolute', top:'100%', left:0, right:0, zIndex:20,
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
              marginTop:4, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {searching && <div style={{ padding:'12px 16px', color:C.muted, fontSize:13 }}>A procurar…</div>}
              {!searching && !searchError && results.length === 0 && (
                <div style={{ padding:'12px 16px', color:C.muted, fontSize:13 }}>Sem resultados para "{query.trim()}".</div>
              )}
              {!searching && searchError && (
                <div style={{ padding:'12px 16px', color:C.danger, fontSize:13 }}>{searchError}</div>
              )}
              {!searching && results.map(r => (
                <div
                  key={r.id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(r) }}
                  style={{
                    padding:'12px 16px', color:C.text, fontSize:14, cursor:'pointer',
                    borderBottom:`1px solid ${C.border}`,
                  }}
                >
                  {r.label}
                </div>
              ))}
            </div>
          )}
          <div style={{ height:12 }} />
        </div>
      )}

      {required && !locationId && (
        <div style={{ fontSize:11, color:C.muted, marginTop:-6, marginBottom:12 }}>
          Escolhe uma localidade da lista — texto livre sozinho não é guardado como localização de referência.
        </div>
      )}

      {showCustomLocality && (
        <>
          <label style={fieldLabel}>Localidade específica (opcional)</label>
          <input
            style={inputStyle}
            placeholder="Ex: bairro ou zona — só para apresentação"
            value={customLocality || ''}
            disabled={disabled}
            onChange={e => onCustomLocalityChange(e.target.value)}
          />
        </>
      )}
    </div>
  )
}
