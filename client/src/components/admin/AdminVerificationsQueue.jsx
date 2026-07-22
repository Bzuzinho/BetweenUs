import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import AdminReasonModal from './AdminReasonModal'

function VerificationSelfie({ colors, userId, alt }) {
  const C = colors
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    api.get(`/verifications/admin/${userId}/selfie-url`).then(response => { if (active) setUrl(response.data.url || '') }).catch(() => {})
    return () => { active = false }
  }, [userId])
  if (!url) return null
  return <img src={url} alt={alt} style={{ width:'100%', maxHeight:260, objectFit:'cover', borderRadius:10, marginBottom:10 }} />
}

export default function AdminVerificationsQueue({ colors, onSelectUser }) {
  const C = colors
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rejecting, setRejecting] = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/admin/verifications')
      .then(response => setItems(response.data.verifications || []))
      .catch(() => setError(t('admin.verifications.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const moderate = async (userId, status, reason) => {
    setError(''); setMessage('')
    try {
      const response = await api.put(`/admin/verifications/${userId}`, { status, ...(reason ? { reason } : {}) })
      setItems(previous => previous.filter(item => item.userId !== userId))
      if (response.data?.activation?.activated) setMessage(t('admin.verifications.activationSuccess'))
    } catch { setError(t('admin.verifications.actionError')) }
  }

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error && items.length === 0) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />

  return (
    <section aria-label={t('admin.tabs.verifications.label')}>
      {rejecting && <AdminReasonModal colors={C} title={t('admin.verifications.rejectTitle')} onConfirm={reason => { const id = rejecting; setRejecting(null); moderate(id, 'REJECTED', reason) }} onCancel={() => setRejecting(null)} />}
      {message && <div role="status" style={{ color:C.success, marginBottom:10 }}>{message}</div>}
      {error && <div role="alert" style={{ color:C.danger, marginBottom:10 }}>{error}</div>}
      {items.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.verifications.empty')} compact />}
      <div className="admin-card-grid">{items.map(item => (
        <article key={item.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
          <button type="button" onClick={() => onSelectUser?.(item.userId)} style={{ width:'100%', border:'none', background:'none', padding:0, cursor:'pointer', display:'flex', justifyContent:'space-between', textAlign:'left', color:'inherit', marginBottom:8 }}>
            <div><div style={{ fontSize:14, fontWeight:500, color:C.text }}>{item.user?.profile?.displayName || t('admin.verifications.noProfile')}</div><div style={{ fontSize:12, color:C.muted }}>{item.user?.email}</div></div><span aria-hidden="true" style={{ color:C.muted }}>›</span>
          </button>
          {item.selfieStoragePath ? <VerificationSelfie colors={C} userId={item.userId} alt={t('admin.verifications.selfieAlt')} /> : <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{t('admin.verifications.noImage')}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button type="button" onClick={() => moderate(item.userId, 'APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, cursor:'pointer' }}>{t('admin.verifications.approve')}</button>
            <button type="button" onClick={() => setRejecting(item.userId)} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:10, color:C.danger, cursor:'pointer' }}>{t('admin.verifications.reject')}</button>
          </div>
        </article>
      ))}</div>
    </section>
  )
}
