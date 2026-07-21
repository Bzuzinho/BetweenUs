import { useEffect, useRef, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import { ADMIN_ROLES } from './adminRoleContracts'

export default function AdminCreateUserModal({ colors, onClose, onCreated }) {
  const C = colors
  const { t } = useI18n()
  const [form, setForm] = useState({ email:'', password:'', adminRole:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const firstInput = useRef(null)

  useEffect(() => {
    firstInput.current?.focus()
    const close = event => { if (event.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])

  const save = async () => {
    if (!form.email.trim() || !form.password || !form.reason.trim()) return setError(t('admin.userCreate.required'))
    setSaving(true); setError('')
    try {
      const response = await api.post('/admin/users', {
        email:form.email.trim(), password:form.password,
        adminRole:form.adminRole || undefined, reason:form.reason.trim(),
      })
      onCreated?.(response.data.user)
      onClose?.()
    } catch (responseError) { setError(responseError.response?.data?.error || t('admin.userCreate.error')) }
    finally { setSaving(false) }
  }

  return (
    <div role="presentation" onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="admin-create-user-title" onClick={event => event.stopPropagation()} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, width:'100%', maxWidth:540, padding:24 }}>
        <h3 id="admin-create-user-title" style={{ color:C.text, fontSize:18, fontWeight:500, margin:'0 0 16px' }}>{t('admin.userCreate.title')}</h3>
        {error && <div role="alert" style={{ color:C.danger, fontSize:12, marginBottom:10 }}>{error}</div>}
        <input ref={firstInput} value={form.email} onChange={event => setForm(previous => ({...previous, email:event.target.value}))} type="email" placeholder={t('admin.userCreate.email')} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, marginBottom:10 }} />
        <input value={form.password} onChange={event => setForm(previous => ({...previous, password:event.target.value}))} type="password" placeholder={t('admin.userCreate.password')} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, marginBottom:10 }} />
        <select value={form.adminRole} onChange={event => setForm(previous => ({...previous, adminRole:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, marginBottom:10 }}>
          {ADMIN_ROLES.map(role => <option key={String(role)} value={role || ''}>{t(`admin.users.roles.${role || 'USER'}.label`)}</option>)}
        </select>
        <input value={form.reason} onChange={event => setForm(previous => ({...previous, reason:event.target.value}))} placeholder={t('admin.userCreate.reason')} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, marginBottom:14 }} />
        <div style={{ display:'flex', gap:10 }}><button type="button" onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:12, color:C.muted }}>{t('admin.modal.cancel')}</button><button type="button" onClick={save} disabled={saving} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:12, color:'#0A141A', fontWeight:600 }}>{saving ? '…' : t('admin.userCreate.create')}</button></div>
      </div>
    </div>
  )
}
