import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { EVENT_STATUSES } from './adminSettingsContracts'

export default function AdminEventsSettings({ colors }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('PENDING_REVIEW')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    const endpoint = filter === 'PENDING_REVIEW' ? '/events/admin/queue' : '/events/admin/all'
    api.get(endpoint).then(response => setEvents(response.data.events || [])).catch(responseError => setError(responseError.response?.data?.error || t('admin.settings.events.loadError'))).finally(() => setLoading(false))
  }, [filter, t])
  useEffect(() => { load() }, [load])

  const act = async (id, action) => {
    setError('')
    try { await api.post(`/events/admin/${id}/${action}`); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.events.actionError')) }
  }

  return <section aria-label={t('admin.settings.events.title')}>
    <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.primary, fontSize:13 }}>{t('admin.settings.events.description')}</div>
    <div style={{ display:'flex', gap:6, marginBottom:16 }}>{['PENDING_REVIEW','ALL'].map(value => <button key={value} type="button" onClick={() => setFilter(value)} style={{ background:filter === value ? C.primaryDim : C.surface, border:`1.5px solid ${filter === value ? C.primary : C.border}`, borderRadius:10, padding:'8px 14px', color:filter === value ? C.primary : C.text2 }}>{t(`admin.settings.events.filter.${value}`)}</button>)}</div>
    {loading && <AdminAsyncState colors={C} state="loading" />}
    {!loading && error && <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />}
    {!loading && !error && events.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.events.empty')} />}
    {!loading && !error && events.map(event => <div key={event.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><div><div style={{ color:C.text, fontWeight:500 }}>{event.title}</div><div style={{ color:C.muted, fontSize:11 }}>{event.city}, {event.country} · {formatDate(event.startsAt)} · {event.organizerProfile?.displayName || event.organizerProfileId}</div></div><span style={{ color:event.status === 'PUBLISHED' ? C.success : ['CANCELLED','SUSPENDED'].includes(event.status) ? C.danger : event.status === 'PENDING_REVIEW' ? C.warning : C.muted, fontSize:11 }}>{EVENT_STATUSES.includes(event.status) ? t(`admin.settings.events.status.${event.status}`) : event.status}</span></div><div style={{ display:'flex', gap:6, marginTop:10 }}>{event.status === 'PENDING_REVIEW' && <><button type="button" onClick={() => act(event.id,'approve')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:6, padding:'5px 12px', color:C.success }}>{t('admin.settings.common.approve')}</button><button type="button" onClick={() => act(event.id,'reject')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:6, padding:'5px 12px', color:C.danger }}>{t('admin.settings.common.reject')}</button></>}{event.status === 'PUBLISHED' && <button type="button" onClick={() => act(event.id,'suspend')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:6, padding:'5px 12px', color:C.danger }}>{t('admin.settings.common.suspend')}</button>}{event.status === 'SUSPENDED' && <button type="button" onClick={() => act(event.id,'resume')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:6, padding:'5px 12px', color:C.success }}>{t('admin.settings.common.resume')}</button>}</div></div>)}
  </section>
}
