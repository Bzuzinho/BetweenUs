import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminProfileTypeSettings({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ label:'', description:'', active:true, sortOrder:0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/catalog/admin/profile-type-config')
      .then(response => setItems((response.data.profileTypeConfigs || []).sort((a,b) => a.sortOrder - b.sortOrder)))
      .catch(responseError => setError(responseError.response?.data?.error || t('admin.settings.profileTypes.loadError')))
      .finally(() => setLoading(false))
  }, [t])
  useEffect(() => { load() }, [load])

  const open = item => { setEditing(item); setForm({ label:item.label, description:item.description || '', active:item.active, sortOrder:item.sortOrder || 0 }); setError('') }
  const save = async () => {
    if (!form.label.trim()) return setError(t('admin.settings.catalogs.required'))
    setSaving(true); setError('')
    try { await api.put(`/catalog/admin/profile-type-config/${editing.type}`, { ...form, sortOrder:Number(form.sortOrder) }); setEditing(null); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.profileTypes.saveError')) }
    finally { setSaving(false) }
  }

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (editing) return <section aria-label={t('admin.settings.profileTypes.title')}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}><button type="button" onClick={() => setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20 }}>←</button><h3 style={{ color:C.text, fontSize:16, margin:0, flex:1 }}>{t('admin.settings.profileTypes.edit').replace('{type}', editing.type)}</h3><button type="button" onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600 }}>{saving ? '…' : t('admin.settings.common.save')}</button></div>
    {error && <div role="alert" style={{ color:C.danger, marginBottom:10 }}>{error}</div>}
    {[['label','text'],['description','textarea'],['sortOrder','number']].map(([field,type]) => <label key={field} style={{ display:'block', marginBottom:10 }}><span style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t(`admin.settings.fields.${field}`)}</span>{type === 'textarea' ? <textarea rows={3} value={form[field]} onChange={event => setForm(previous => ({...previous,[field]:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.text }} /> : <input type={type} value={form[field]} onChange={event => setForm(previous => ({...previous,[field]:type === 'number' ? Number(event.target.value) : event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.text }} />}</label>)}
    <label style={{ color:C.text2 }}><input type="checkbox" checked={form.active} onChange={event => setForm(previous => ({...previous,active:event.target.checked}))} /> {t('admin.settings.fields.active')}</label>
  </section>

  return <section aria-label={t('admin.settings.profileTypes.title')}>
    <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.primary, fontSize:13 }}>{t('admin.settings.profileTypes.description')}</div>
    {error && <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />}
    {!error && items.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.profileTypes.empty')} compact />}
    {items.map(item => <div key={item.type} style={{ background:C.surface, border:`1px solid ${item.active ? C.border : C.danger}`, borderRadius:14, padding:'12px 14px', marginBottom:8, display:'flex', justifyContent:'space-between', gap:12 }}><div><div style={{ color:C.text, fontWeight:500 }}>{item.label}</div><div style={{ color:C.muted, fontSize:11 }}>{item.type}{item.description ? ` · ${item.description}` : ''}</div></div><button type="button" onClick={() => open(item)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2 }}>{t('admin.settings.common.edit')}</button></div>)}
  </section>
}
