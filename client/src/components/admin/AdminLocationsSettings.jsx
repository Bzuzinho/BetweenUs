import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminLocationsSettings({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('PT')
  const [results, setResults] = useState([])
  const [unresolved, setUnresolved] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingUnresolved, setLoadingUnresolved] = useState(true)
  const [fixing, setFixing] = useState(null)
  const [fixQuery, setFixQuery] = useState('')
  const [fixResults, setFixResults] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadUnresolved = useCallback(() => {
    setLoadingUnresolved(true)
    api.get('/locations/admin/profiles-without-reference', { params:{ limit:50 } })
      .then(response => setUnresolved(response.data.profiles || []))
      .catch(() => setError(t('admin.settings.locations.loadUnresolvedError')))
      .finally(() => setLoadingUnresolved(false))
  }, [t])
  useEffect(() => { loadUnresolved() }, [loadUnresolved])

  const search = async () => {
    setLoading(true); setError('')
    try { const response = await api.get('/locations/admin/search', { params:{ country, q:query } }); setResults(response.data.locations || []) }
    catch { setError(t('admin.settings.locations.searchError')) }
    finally { setLoading(false) }
  }

  const deactivate = async id => {
    if (!window.confirm(t('admin.settings.locations.deactivateConfirm'))) return
    setError(''); setMessage('')
    try { await api.put(`/locations/admin/${id}/deactivate`); setResults(previous => previous.map(item => item.id === id ? {...item, active:false} : item)); setMessage(t('admin.settings.locations.deactivated')) }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.locations.deactivateError')) }
  }

  const searchFix = async value => {
    setFixQuery(value)
    if (value.trim().length < 2) return setFixResults([])
    try { const response = await api.get('/locations/admin/search', { params:{ country, q:value } }); setFixResults(response.data.locations || []) }
    catch { setFixResults([]) }
  }

  const applyFix = async (profileId, locationId) => {
    setError(''); setMessage('')
    try { await api.put(`/locations/admin/profiles/${profileId}/location`, { homeLocationId:locationId }); setMessage(t('admin.settings.locations.corrected')); setFixing(null); loadUnresolved() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.locations.correctError')) }
  }

  return <section aria-label={t('admin.settings.locations.title')}>
    <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:C.primary }}>{t('admin.settings.locations.description')}</div>
    {message && <div role="status" style={{ color:C.success, marginBottom:12 }}>{message}</div>}
    {error && <div role="alert" style={{ color:C.danger, marginBottom:12 }}>{error}</div>}
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:20 }}>
      <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:12 }}>{t('admin.settings.locations.catalogSearch')}</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}><input value={country} onChange={event => setCountry(event.target.value.toUpperCase())} maxLength={2} aria-label={t('admin.settings.locations.country')} style={{ width:70, background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.text }} /><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && search()} placeholder={t('admin.settings.locations.query')} style={{ flex:'1 1 220px', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.text }} /><button type="button" onClick={search} disabled={loading} style={{ background:C.primary, border:'none', borderRadius:10, padding:'0 20px', color:'#0A141A', fontWeight:600 }}>{loading ? '…' : t('admin.settings.common.search')}</button></div>
      {results.map(location => <div key={location.id} style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', marginBottom:6 }}><div><div style={{ color:C.text, fontSize:13 }}>{location.label}</div><div style={{ color:C.muted, fontSize:11 }}>{location.active ? t('admin.settings.common.active') : t('admin.settings.common.inactive')}</div></div>{location.active && <button type="button" onClick={() => deactivate(location.id)} style={{ background:'none', border:`1px solid ${C.danger}`, borderRadius:8, padding:'6px 12px', color:C.danger }}>{t('admin.settings.common.deactivate')}</button>}</div>)}
    </div>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
      <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t('admin.settings.locations.unresolvedTitle')}</div><div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{t('admin.settings.locations.unresolvedDescription')}</div>
      {loadingUnresolved && <AdminAsyncState colors={C} state="loading" compact />}
      {!loadingUnresolved && unresolved.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.locations.noUnresolved')} compact />}
      {unresolved.map(profile => <div key={profile.id} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', marginBottom:8 }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><div><div style={{ color:C.text, fontSize:13 }}>{profile.displayName || t('admin.settings.locations.unnamed')} · {profile.type}</div><div style={{ color:C.muted, fontSize:11 }}>{[profile.city,profile.country].filter(Boolean).join(', ') || t('admin.settings.locations.noLegacy')}</div></div><button type="button" onClick={() => { setFixing(profile.id); setFixQuery(''); setFixResults([]) }} style={{ background:'none', border:`1px solid ${C.primary}`, borderRadius:8, padding:'6px 12px', color:C.primary }}>{t('admin.settings.locations.correct')}</button></div>{fixing === profile.id && <div style={{ marginTop:10, borderTop:`1px solid ${C.border}`, paddingTop:10 }}><input value={fixQuery} onChange={event => searchFix(event.target.value)} placeholder={t('admin.settings.locations.query')} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.text }} />{fixResults.map(location => <button key={location.id} type="button" onClick={() => applyFix(profile.id, location.id)} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', color:C.text, padding:'8px 10px' }}>{location.label}</button>)}<button type="button" onClick={() => setFixing(null)} style={{ background:'none', border:'none', color:C.muted, marginTop:6 }}>{t('admin.settings.common.cancel')}</button></div>}</div>)}
    </div>
  </section>
}
