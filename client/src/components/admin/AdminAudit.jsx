import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminAudit({ colors }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [logs, setLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [view, setView] = useState('logs')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/admin/audit'),
      api.get('/admin/service/sessions').catch(() => ({ data:{ sessions:[] } })),
    ]).then(([logsResponse, sessionsResponse]) => {
      setLogs(logsResponse.data.logs || [])
      setSessions(sessionsResponse.data.sessions || [])
    }).catch(() => setError(t('admin.audit.loadError'))).finally(() => setLoading(false))
  }, [t])

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error) return <AdminAsyncState colors={C} state="error" message={error} />

  const dateTime = value => formatDate(value, { dateStyle:'short', timeStyle:'short' })

  return (
    <section aria-label={t('admin.tabs.audit.label')}>
      <div role="tablist" style={{ display:'flex', gap:6, marginBottom:14 }}>
        {['logs','sessions'].map(key => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} style={{ background:view === key ? C.primaryDim : C.surface, border:`1px solid ${view === key ? C.primary : C.border}`, borderRadius:8, padding:'7px 14px', color:view === key ? C.primary : C.muted, cursor:'pointer' }}>{t(`admin.audit.tabs.${key}`)}</button>)}
      </div>

      {view === 'logs' && (logs.length === 0 ? <AdminAsyncState colors={C} state="unavailable" message={t('admin.audit.emptyLogs')} compact /> : <div className="admin-card-grid">{logs.map(log => (
        <article key={log.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:3 }}><span style={{ color:C.primary, fontWeight:500, fontSize:12 }}>{log.action}</span><span style={{ color:C.muted, fontSize:10 }}>{dateTime(log.createdAt)}</span></div>
          <div style={{ fontSize:11, color:C.text2 }}>{t('admin.audit.by')} {log.admin?.email}</div>
          {log.reason && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>↳ {log.reason}</div>}
        </article>
      ))}</div>)}

      {view === 'sessions' && (sessions.length === 0 ? <AdminAsyncState colors={C} state="unavailable" message={t('admin.audit.emptySessions')} compact /> : <div className="admin-card-grid">{sessions.map(session => (
        <article key={session.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}><span style={{ color:C.primary, fontSize:12, fontWeight:500 }}>{session.role}</span><span style={{ color:session.endedAt ? C.muted : C.success, fontSize:11 }}>{session.endedAt ? t('admin.audit.duration').replace('{minutes}', session.durationMin ?? 0) : t('admin.audit.active')}</span></div>
          <div style={{ fontSize:11, color:C.muted }}>{dateTime(session.startedAt)}{session.endedAt ? ` → ${dateTime(session.endedAt)}` : ''}</div>
        </article>
      ))}</div>)}
    </section>
  )
}
