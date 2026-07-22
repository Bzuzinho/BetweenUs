import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminConversations({ colors }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/admin/conversations')
      .then(response => setConversations(response.data.conversations || []))
      .catch(() => setError(t('admin.conversations.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const openConversation = async conversation => {
    if (!reason.trim()) return setError(t('admin.conversations.reasonRequired'))
    setError('')
    try {
      const response = await api.get(`/admin/conversations/${conversation.id}?reason=${encodeURIComponent(reason.trim())}`)
      setSelected(conversation)
      setMessages(response.data.messages || [])
    } catch { setError(t('admin.conversations.openError')) }
  }

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error && conversations.length === 0) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />

  if (selected) return (
    <section aria-label={t('admin.conversations.detailTitle')}>
      <button type="button" onClick={() => { setSelected(null); setMessages([]) }} aria-label={t('admin.conversations.back')} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', marginBottom:14 }}>←</button>
      <div style={{ fontSize:11, color:C.warning, marginBottom:14, background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:10, padding:'8px 12px' }}>{t('admin.conversations.auditWarning')}</div>
      {messages.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.conversations.noMessages')} compact />}
      {messages.map(message => (
        <article key={message.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:10, marginBottom:6 }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>{message.sender?.profile?.displayName || message.sender?.email} · {formatDate(message.createdAt, { dateStyle:'short', timeStyle:'short' })}</div>
          <div style={{ fontSize:13, color:message.deletedAt ? C.muted : C.text }}>{message.deletedAt ? t('admin.conversations.deletedMessage') : message.body}</div>
        </article>
      ))}
    </section>
  )

  return (
    <section aria-label={t('admin.tabs.conversations.label')}>
      <div style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:14 }}>
        <label style={{ fontSize:12, color:C.text2, fontWeight:500, display:'block', marginBottom:8 }}>{t('admin.conversations.reasonLabel')}</label>
        <input value={reason} onChange={event => setReason(event.target.value)} placeholder={t('admin.conversations.reasonPlaceholder')} style={{ width:'100%', boxSizing:'border-box', minHeight:44, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'10px 12px', color:C.text }} />
        {error && <div role="alert" style={{ color:C.danger, fontSize:12, marginTop:6 }}>{error}</div>}
      </div>
      {conversations.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.conversations.empty')} compact />}
      <div className="admin-card-grid">{conversations.map(conversation => (
        <button key={conversation.id} type="button" onClick={() => openConversation(conversation)} style={{ width:'100%', minHeight:78, textAlign:'left', background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', color:'inherit' }}>
          <div><div style={{ fontSize:13, fontWeight:500, color:C.text }}>{conversation.match?.profileOne?.displayName} ↔ {conversation.match?.profileTwo?.displayName}</div><div style={{ fontSize:11, color:C.muted }}>{t('admin.conversations.messageCount').replace('{count}', conversation._count?.messages || 0)}</div></div><span aria-hidden="true" style={{ color:C.muted }}>›</span>
        </button>
      ))}</div>
    </section>
  )
}
