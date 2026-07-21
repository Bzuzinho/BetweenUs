import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminLocationsManager({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('PT')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [unresolved, setUnresolved] = useState([])
  const [loadingUnresolved, setLoadingUnresolved] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fixingProfileId, setFixingProfileId] = useState(null)
  const [fixQuery, setFixQuery] = useState('')
  const [fixResults, setFixResults] = useState([])

  const loadUnresolved = useCallback(() => {
    setLoadingUnresolved(true)
    api.get('/locations/admin/profiles-without-reference', { params:{ limit:50 } })
      .then(response => setUnresolved(response.data.profiles || []))
      .catch(() => setError(t('admin.settings.locations.unresolvedLoadError')))
      .finally(() => setLoadingUnresolved(false))
  }, [t])

  useEffect(() => { loadUnresolved() }, [loadUnresolved])

  const search = async () => {
    setLoading(true); setError('')
    try {
      const response = await api.get('/locations/admin/search', { params:{ country, q:query } })
      setResults(response.data.locations || [])
    } catch { setError(t('admin.settings.locations.searchError')) }
    finally { setLoading(false) }
  }

  const deactivate = async location => {
    if (!window.confirm(t('admin.settings.locations.confirmDeactivate').replace('{location}', location.label))) return
    setError(''); setMessage('')
    try {
      await api.put(`/locations/admin/${location.id}/deactivate`)
      setResults(previous => previous.map(item => item.id === location.id ? { ...item, active:false } : item))
      setMessage(t('admin.settings.locations.deactivated'))
    } catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.locations.deactivateError')) }
  }

  const searchFix = async value => {
    setFixQuery(value)
    if (value.trim().length < 2) return setFixResults([])
    try {
      const response = await api.get('/locations/admin/search', { params:{ country, q:value } })
      setFixResults(response.data.locations || [])
    } catch { setFixResults([]) }
  }

  const applyFix = async (profileId, locationId) => {
    setError(''); setMessage('')
    try {
      await api.put(`/locations/admin/profiles/${profileId}/location`, { homeLocationId:locationId })
      setMessage(t('admin.settings.locations.profileFixed'))
      setFixingProfileId(null)
      setFixQuery('')
      setFixResults([])
      loadUnresolved()
    } catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.locations.fixError')) }
  }

  return (
    <section aria-label={t('admin.settings.locations.title')}>
      <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:C.primary, lineHeight:1.5 }}>{t('admin.settings.locations.description')}</div>
      {message && <div role="status" style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:'10px 14px', marginBottom:14, color:C.success }}>{message}</div>}
      {error && <div role="alert" style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', marginBottom:14, color:C.danger }}>{error}</div>}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:12 }}>{t('admin.settings.locations.searchTitle')}</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
          <input value={country} onChange={event => setCountry(event.target.value.toUpperCase())} placeholder={t('admin.settings.locations.country')} style={{ width:90, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text }} />
          <input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && search()} placeholder={t('admin.settings.locations.locationName')} style={{ flex:1, minWidth:200, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text }} />
          <button type="button" onClick={search} disabled={loading} style={{ background:C.primary, border:'none', borderRadius:10, padding:'0 20px', color:'#0A141A', fontWeight:600 }}>{loading ? t('admin.settings.locations.searching') : t('admin.settings.locations.search')}</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {results.map(location => <div key={location.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}><div><div style={{ fontSize:13, color:C.text }}>{location.label}</div><div style={{ fontSize:11, color:C.muted }}>{location.active ? t('admin.settings.locations.active') : t('admin.settings.locations.inactive')}</div></div>{location.active && <button type="button" onClick={() => deactivate(location)} style={{ background:'none', border:`1px solid ${C.danger}`, borderRadius:8, padding:'6px 12px', color:C.danger }}>{t('admin.settings.locations.deactivate')}</button>}</div>)}
        </div>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{t('admin.settings.locations.unresolvedTitle')}</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{t('admin.settings.locations.unresolvedDescription')}</div>
        {loadingUnresolved ? <AdminAsyncState colors={C} state="loading" compact /> : unresolved.length === 0 ? <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.locations.noneUnresolved')} compact /> : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {unresolved.map(profile => <div key={profile.id} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}><div><div style={{ fontSize:13, color:C.text }}>{profile.displayName || t('admin.settings.locations.unnamed')} <span style={{ color:C.muted }}>· {profile.type}</span></div><div style={{ fontSize:11, color:C.muted }}>{[profile.city, profile.country].filter(Boolean).join(', ') || t('admin.settings.locations.noLegacyLocation')}</div></div><button type="button" onClick={() => { setFixingProfileId(profile.id); setFixQuery(''); setFixResults([]) }} style={{ background:'none', border:`1px solid ${C.primary}`, borderRadius:8, padding:'6px 12px', color:C.primary }}>{t('admin.settings.locations.fix')}</button></div>{fixingProfileId === profile.id && <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}><input value={fixQuery} onChange={event => searchFix(event.target.value)} placeholder={t('admin.settings.locations.fixPlaceholder').replace('{country}', country)} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text, marginBottom:8 }} />{fixResults.map(location => <button key={location.id} type="button" onClick={() => applyFix(profile.id, location.id)} style={{ width:'100%', textAlign:'left', padding:'8px 10px', fontSize:13, color:C.text, background:'none', border:'none', borderRadius:8 }}>{location.label}</button>)}<button type="button" onClick={() => setFixingProfileId(null)} style={{ marginTop:6, background:'none', border:'none', color:C.muted }}>{t('admin.modal.cancel')}</button></div>}</div>)}
        </div>}
      </div>
    </section>
  )
}
