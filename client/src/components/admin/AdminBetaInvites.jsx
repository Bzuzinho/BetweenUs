import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminBetaInvites({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [invites, setInvites] = useState([])
  const [form, setForm] = useState({ email:'', maxUses:1 })
  const [newInvite, setNewInvite] = useState(null)
  const [copied, setCopied] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/admin/beta/invites')
      .then(response => setInvites(response.data.invites || []))
      .catch(() => setError(t('admin.beta.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const createInvite = async () => {
    setError('')
    try {
      const response = await api.post('/admin/beta/invites', { email:form.email || undefined, maxUses:Number(form.maxUses) })
      setNewInvite(response.data)
      setForm({ email:'', maxUses:1 })
      load()
    } catch (responseError) { setError(responseError.response?.data?.error || t('admin.beta.actionError')) }
  }

  const toggle = async id => { try { await api.put(`/admin/beta/invites/${id}/toggle`); load() } catch { setError(t('admin.beta.actionError')) } }
  const remove = async id => { try { await api.delete(`/admin/beta/invites/${id}`); load() } catch { setError(t('admin.beta.actionError')) } }
  const copy = (url, id) => navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error && invites.length === 0) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />

  return (
    <section aria-label={t('admin.tabs.beta.label')}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:12, color:C.text2, fontWeight:500, marginBottom:10 }}>{t('admin.beta.createTitle')}</div>
        {error && <div role="alert" style={{ color:C.danger, fontSize:12, marginBottom:8 }}>{error}</div>}
        <input value={form.email} onChange={event => setForm(previous => ({...previous, email:event.target.value}))} placeholder={t('admin.beta.emailOptional')} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, marginBottom:10 }} />
        <input type="number" min="1" value={form.maxUses} onChange={event => setForm(previous => ({...previous, maxUses:event.target.value}))} aria-label={t('admin.beta.maxUses')} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, marginBottom:10 }} />
        <button type="button" onClick={createInvite} style={{ width:'100%', background:C.primary, border:'none', borderRadius:12, padding:12, color:'#0A141A', fontWeight:600, cursor:'pointer' }}>{t('admin.beta.create')}</button>
        {newInvite?.inviteUrl && <div style={{ marginTop:12, background:C.elevated, borderRadius:10, padding:'10px 12px', fontSize:12, color:C.text2, wordBreak:'break-all' }}>{newInvite.inviteUrl}<button type="button" onClick={() => copy(newInvite.inviteUrl, 'new')} style={{ marginLeft:8, color:C.primary, background:'none', border:'none', cursor:'pointer' }}>{copied === 'new' ? '✓' : t('admin.beta.copy')}</button></div>}
      </div>

      {invites.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.beta.empty')} compact />}
      {invites.map(invite => {
        const url = `${window.location.origin}/join/${invite.code}`
        return <article key={invite.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}><span style={{ color:C.primary, fontWeight:600, fontSize:16, letterSpacing:1 }}>{invite.code}</span><span style={{ color:invite.active ? C.success : C.muted, fontSize:11 }}>{invite.active ? t('admin.beta.active') : t('admin.beta.inactive')}</span></div>
          <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>{t('admin.beta.usage').replace('{used}', invite.useCount).replace('{max}', invite.maxUses)}{invite.email ? ` · ${invite.email}` : ''}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button type="button" onClick={() => copy(url, invite.id)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', color:C.text2, cursor:'pointer' }}>{copied === invite.id ? '✓' : t('admin.beta.copy')}</button>
            <button type="button" onClick={() => toggle(invite.id)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', color:C.text2, cursor:'pointer' }}>{invite.active ? t('admin.beta.deactivate') : t('admin.beta.activate')}</button>
            {!invite.usedById && <button type="button" onClick={() => remove(invite.id)} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:'7px 12px', color:C.danger, cursor:'pointer' }}>{t('admin.beta.delete')}</button>}
          </div>
        </article>
      })}
    </section>
  )
}
