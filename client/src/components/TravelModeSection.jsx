import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import LocationAutocomplete from './LocationAutocomplete'
import { useI18n } from '../i18n/I18nContext'

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

export default function TravelModeSection({ helperText }) {
  const { t, formatDate } = useI18n()
  const [travels, setTravels] = useState([])
  const [homeLocation, setHomeLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    countryCode:'PT', destinationLocationId:null, destinationLocationLabel:null,
    customDestinationLocality:'', startDate:'', endDate:'',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get('/travel/me')
      .then(response => {
        setTravels(response.data.travelModes || [])
        setHomeLocation(response.data.homeLocation || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const current = travels.find(item => item.status === 'WAITING_MEMBER_APPROVAL' || item.status === 'SCHEDULED')
  const shortDate = value => formatDate(value, { day:'numeric', month:'long' })

  const propose = async () => {
    if (!form.destinationLocationId || !form.startDate || !form.endDate) return
    setBusy(true)
    setError('')
    try {
      await api.post('/travel', {
        destinationLocationId:form.destinationLocationId,
        customDestinationLocality:form.customDestinationLocality.trim() || undefined,
        startDate:form.startDate,
        endDate:form.endDate,
      })
      setForm({ countryCode:'PT', destinationLocationId:null, destinationLocationLabel:null, customDestinationLocality:'', startDate:'', endDate:'' })
      setShowForm(false)
      load()
    } catch (requestError) {
      setError(requestError.response?.data?.code === 'PREMIUM_REQUIRED' ? t('travel.premiumRequired') : t('travel.genericError'))
    } finally {
      setBusy(false)
    }
  }

  const approve = async id => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/travel/${id}/approve`)
      load()
    } catch {
      setError(t('travel.genericError'))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async id => {
    setBusy(true)
    setError('')
    try {
      await api.delete(`/travel/${id}`)
      load()
    } catch {
      setError(t('travel.genericError'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  const destination = current?.location?.displayLabel || current?.city
  const statusText = current?.status === 'WAITING_MEMBER_APPROVAL'
    ? `⏳ ${t('travel.waiting')}`
    : current?.status === 'SCHEDULED' && current?.relevance === 'FUTURE'
      ? `${t('travel.futurePrefix')} ${destination} ${t('travel.futureBetween')} ${shortDate(current.startDate)} — ${shortDate(current.endDate)}.`
      : current?.status === 'SCHEDULED' && current?.relevance === 'ACTIVE'
        ? `${t('travel.activePrefix')} ${destination} ${t('travel.activeUntil')} ${shortDate(current.endDate)}.`
        : current?.status === 'SCHEDULED'
          ? `${shortDate(current.startDate)} — ${shortDate(current.endDate)}`
          : ''

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>✈️ {t('travel.title')}</div>
      <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        {helperText || t('travel.defaultHelper')}
      </p>

      {error && (
        <div style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:12,
          padding:'10px 14px', marginBottom:12, color:C.danger, fontSize:12 }}>
          {error}
        </div>
      )}

      {homeLocation?.displayLabel && (
        <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
          {t('travel.homeLocation')}: {homeLocation.displayLabel}
        </div>
      )}

      {current && (
        <div style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:4 }}>{destination}</div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>{statusText}</div>
          <div style={{ display:'flex', gap:8 }}>
            {current.status === 'WAITING_MEMBER_APPROVAL' && (
              <button onClick={() => approve(current.id)} disabled={busy}
                style={{ flex:1, background:C.primary, border:'none', borderRadius:50, padding:10, fontSize:12,
                  fontWeight:600, color:'#1A0A2E', cursor:'pointer', opacity:busy ? 0.6 : 1 }}>
                {t('travel.approve')}
              </button>
            )}
            <button onClick={() => cancel(current.id)} disabled={busy}
              style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:50,
                padding:10, fontSize:12, color:C.muted, cursor:'pointer', opacity:busy ? 0.6 : 1 }}>
              {t('travel.cancel')}
            </button>
          </div>
        </div>
      )}

      {!current && !showForm && (
        <button onClick={() => setShowForm(true)} style={{ width:'100%', background:C.input,
          border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13,
          color:C.text2, cursor:'pointer' }}>
          {t('travel.proposeTrip')}
        </button>
      )}

      {showForm && (
        <div>
          <LocationAutocomplete
            countryCode={form.countryCode}
            onCountryChange={code => setForm(previous => ({ ...previous, countryCode:code }))}
            locationId={form.destinationLocationId}
            locationLabel={form.destinationLocationLabel}
            onSelectLocation={location => setForm(previous => ({
              ...previous,
              destinationLocationId:location?.id || null,
              destinationLocationLabel:location?.label || null,
              countryCode:location?.countryCode || previous.countryCode,
            }))}
            customLocality={form.customDestinationLocality}
            onCustomLocalityChange={value => setForm(previous => ({ ...previous, customDestinationLocality:value }))}
            label={t('travel.destination')}
          />
          <input style={inputStyle} type="date" value={form.startDate}
            onChange={event => setForm(previous => ({ ...previous, startDate:event.target.value }))} />
          <input style={inputStyle} type="date" value={form.endDate}
            onChange={event => setForm(previous => ({ ...previous, endDate:event.target.value }))} />
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, background:'transparent',
              border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13,
              color:C.muted, cursor:'pointer' }}>{t('travel.cancel')}</button>
            <button onClick={propose} disabled={busy} style={{ flex:2,
              background:C.primary, border:'none', borderRadius:50, padding:12, fontSize:13,
              fontWeight:600, color:'#1A0A2E', cursor:'pointer', opacity:busy ? 0.6 : 1 }}>{t('travel.propose')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
