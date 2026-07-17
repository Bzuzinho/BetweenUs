import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import LocationAutocomplete from './LocationAutocomplete'

// Fase 3D — Travel Mode por país/cidade (sem georreferenciação), extraído
// de CouplePage.jsx para ser reutilizável também por um perfil INDIVIDUAL
// PREMIUM (ver PrivacySettingsPage.jsx) — a própria API (/travel/me,
// POST /travel, .../approve, DELETE) já resolve sempre para o perfil
// activo do utilizador (resolveMyProfileId no backend), seja ele
// INDIVIDUAL ou COUPLE; o backend (hasEntitlement 'TRAVEL_MODE') já trata
// as regras de quem pode usar — este componente nunca decide isso, só
// mostra o que a API devolve ou recusa.
const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

const inputStyle = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
  borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14,
  outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12
}

const sectionStyle = {
  background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:20, padding:20, marginBottom:16
}

const sectionTitle = {
  fontSize:14, color:C.text, fontWeight:600, marginBottom:4,
  display:'flex', alignItems:'center', gap:8
}

// Fase 3D — datas formatadas em português, sem hora (nunca mostramos
// localização exata, só o intervalo de dias).
const formatTravelDate = (d) => new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })

// `helperText` — única diferença de copy entre o uso em contexto de casal
// (CouplePage, requer aprovação) e individual (PrivacySettingsPage, activa
// de imediato); tudo o resto (textos de relevância, cooldown, etc.) é
// idêntico porque vem do mesmo endpoint.
export default function TravelModeSection({ helperText = 'Ativar viagem requer aprovação de todos os membros do perfil.' }) {
  const [travels, setTravels] = useState([])
  const [homeLocation, setHomeLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  // Sistema de localidades — destinationLocationId vem do catálogo
  // GeoNames (nunca texto livre); customDestinationLocality é só
  // apresentação. countryCode arranca em PT (único país importado até
  // agora — ver docs/product/GEONAMES_IMPORT.md).
  const [form, setForm] = useState({
    countryCode:'PT', destinationLocationId:null, destinationLocationLabel:null,
    customDestinationLocality:'', startDate:'', endDate:'',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get('/travel/me')
      .then(r => {
        setTravels(r.data.travelModes || [])
        setHomeLocation(r.data.homeLocation || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const current = travels.find(t => t.status === 'WAITING_MEMBER_APPROVAL' || t.status === 'SCHEDULED')

  const propose = async () => {
    if (!form.destinationLocationId || !form.startDate || !form.endDate) return
    setBusy(true); setError('')
    try {
      await api.post('/travel', {
        destinationLocationId: form.destinationLocationId,
        customDestinationLocality: form.customDestinationLocality.trim() || undefined,
        startDate: form.startDate, endDate: form.endDate,
      })
      setForm({ countryCode:'PT', destinationLocationId:null, destinationLocationLabel:null, customDestinationLocality:'', startDate:'', endDate:'' })
      setShowForm(false)
      load()
    } catch (err) {
      const code = err.response?.data?.code
      setError(code === 'PREMIUM_REQUIRED' ? 'Travel Mode requer Between Plus.' : (err.response?.data?.error || 'Erro.'))
    }
    finally { setBusy(false) }
  }
  const approve = async (id) => {
    setBusy(true)
    try { await api.post(`/travel/${id}/approve`); load() }
    catch (err) { setError(err.response?.data?.error || 'Erro.') }
    finally { setBusy(false) }
  }
  const cancel = async (id) => {
    setBusy(true)
    try { await api.delete(`/travel/${id}`); load() }
    finally { setBusy(false) }
  }

  if (loading) return null

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>✈️ Travel Mode</div>
      <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        {helperText}
      </p>

      {error && (
        <div style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:12,
          padding:'10px 14px', marginBottom:12, color:C.danger, fontSize:12 }}>
          {error}
        </div>
      )}

      {/* Sistema de localidades — displayLabel já resolve tanto perfis com
          catálogo (nome da localidade) como legacy (city/country em texto
          livre), nunca coordenadas (ver server's withoutCoordinates). */}
      {homeLocation?.displayLabel && (
        <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
          Localização habitual: {homeLocation.displayLabel}
        </div>
      )}

      {current && (
        <div style={{ background:C.input, border:`1px solid ${C.border}`,
          borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:4 }}>
            {current.location?.displayLabel || current.city}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>
            {current.status === 'WAITING_MEMBER_APPROVAL' && '⏳ A aguardar aprovação'}
            {current.status === 'SCHEDULED' && current.relevance === 'FUTURE' &&
              `Vais estar em ${current.location?.displayLabel || current.city} entre ${formatTravelDate(current.startDate)} e ${formatTravelDate(current.endDate)}.`}
            {current.status === 'SCHEDULED' && current.relevance === 'ACTIVE' &&
              `Em Travel Mode em ${current.location?.displayLabel || current.city} até ${formatTravelDate(current.endDate)}.`}
            {current.status === 'SCHEDULED' && !current.relevance &&
              `${new Date(current.startDate).toLocaleDateString('pt-PT')} — ${new Date(current.endDate).toLocaleDateString('pt-PT')}`}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {current.status === 'WAITING_MEMBER_APPROVAL' && (
              <button onClick={() => approve(current.id)} disabled={busy}
                style={{ flex:1, background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                  border:'none', borderRadius:50, padding:10, fontSize:12,
                  fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
                Aprovar
              </button>
            )}
            <button onClick={() => cancel(current.id)} disabled={busy}
              style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:50, padding:10, fontSize:12, color:C.muted, cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!current && !showForm && (
        <button onClick={() => setShowForm(true)} style={{ width:'100%', background:C.input,
          border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13,
          color:C.text2, cursor:'pointer' }}>
          + Propor viagem
        </button>
      )}

      {showForm && (
        <div>
          {/* Sistema de localidades — mesmo componente do onboarding/
              EditProfilePage: escolha obrigatória de um destino do
              catálogo GeoNames, nunca texto livre sozinho. */}
          <LocationAutocomplete
            countryCode={form.countryCode}
            onCountryChange={code => setForm(p => ({ ...p, countryCode: code }))}
            locationId={form.destinationLocationId}
            locationLabel={form.destinationLocationLabel}
            onSelectLocation={loc => setForm(p => ({
              ...p,
              destinationLocationId: loc?.id || null,
              destinationLocationLabel: loc?.label || null,
              countryCode: loc?.countryCode || p.countryCode,
            }))}
            customLocality={form.customDestinationLocality}
            onCustomLocalityChange={v => setForm(p => ({ ...p, customDestinationLocality: v }))}
            label="Destino"
          />
          <input style={inputStyle} type="date" value={form.startDate}
            onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          <input style={inputStyle} type="date" value={form.endDate}
            onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, background:'transparent',
              border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13,
              color:C.muted, cursor:'pointer' }}>Cancelar</button>
            <button onClick={propose} disabled={busy} style={{ flex:2,
              background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:12, fontSize:13,
              fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>Propor</button>
          </div>
        </div>
      )}
    </div>
  )
}
