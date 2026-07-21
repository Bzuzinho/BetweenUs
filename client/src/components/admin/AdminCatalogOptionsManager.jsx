import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminCatalogOptionsManager({ colors, config }) {
  const C = colors
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ label:'', slug:'', description:'', category:'', active:true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setLoadError('')
    api.get(config.basePath)
      .then(response => setItems(response.data[config.dataKey] || []))
      .catch(() => setLoadError(t('admin.settings.catalog.loadError').replace('{catalog}', t(config.labelKey))))
      .finally(() => setLoading(false))
  }, [config, t])

  useEffect(() => { load() }, [load])

  const emptyForm = () => ({ label:'', slug:'', description:'', category:'', active:true })
  const openNew = () => { setForm(emptyForm()); setEditing('new'); setError('') }
  const openEdit = item => { setForm({ label:item.label ?? item.name ?? '', slug:item.slug, description:item.description || '', category:item.category || '', active:item.active }); setEditing(item); setError('') }

  const payload = () => {
    const nameField = config.nameField || 'label'
    return { [nameField]:form.label, slug:form.slug, description:form.description, ...(config.showCategory ? { category:form.category } : {}), active:form.active }
  }

  const save = async () => {
    if (!form.label.trim() || !form.slug.trim()) return setError(t('admin.settings.catalog.required'))
    setSaving(true); setError('')
    try {
      if (editing === 'new') await api.post(config.basePath, payload())
      else await api.put(`${config.basePath}/${editing.id}`, payload())
      setEditing(null); load()
    } catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.catalog.saveError')) }
    finally { setSaving(false) }
  }

  const toggle = async item => {
    try { await api.put(`${config.basePath}/${item.id}`, { active:!item.active }); load() }
    catch { setError(t('admin.settings.catalog.saveError')) }
  }

  const remove = async item => {
    if (item.usageCount > 0) {
      if (!window.confirm(t('admin.settings.catalog.inUseConfirm').replace('{count}', item.usageCount))) return
      return toggle({ ...item, active:true })
    }
    if (!window.confirm(t('admin.settings.catalog.deleteConfirm'))) return
    try { await api.delete(`${config.basePath}/${item.id}`); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.catalog.deleteError')) }
  }

  if (editing !== null) return (
    <section aria-label={t(config.labelKey)}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button type="button" onClick={() => setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20 }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>{editing === 'new' ? t('admin.settings.catalog.newTitle').replace('{catalog}', t(config.singularKey)) : t('admin.settings.catalog.editTitle')}</h3>
        <button type="button" onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600 }}>{saving ? '…' : t('admin.settings.catalog.save')}</button>
      </div>
      {error && <div role="alert" style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{error}</div>}
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.settings.catalog.name')} *</label>
      <input value={form.label} onChange={event => setForm(previous => ({...previous, label:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, marginBottom:10 }} />
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.settings.catalog.slug')} *</label>
      <input value={form.slug} disabled={editing !== 'new'} onChange={event => setForm(previous => ({...previous, slug:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, marginBottom:10 }} />
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.settings.catalog.description')}</label>
      <textarea rows={2} value={form.description} onChange={event => setForm(previous => ({...previous, description:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, marginBottom:10, resize:'vertical' }} />
      {config.showCategory && <><label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.settings.catalog.category')}</label><input value={form.category} onChange={event => setForm(previous => ({...previous, category:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, marginBottom:10 }} /></>}
      <label style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:C.elevated, borderRadius:10, padding:'12px 14px', color:C.text }}><span>{t('admin.settings.catalog.active')}</span><input type="checkbox" checked={form.active} onChange={event => setForm(previous => ({...previous, active:event.target.checked}))} /></label>
    </section>
  )

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (loadError) return <AdminAsyncState colors={C} state="error" message={loadError} onRetry={load} />

  return (
    <section aria-label={t(config.labelKey)}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}><div style={{ fontSize:15, fontWeight:500, color:C.text }}>{t('admin.settings.catalog.count').replace('{total}', items.length).replace('{active}', items.filter(item => item.active).length)}</div><button type="button" onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600 }}>+ {t('admin.settings.catalog.new')}</button></div>
      {error && <div role="alert" style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{error}</div>}
      {items.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.catalog.empty').replace('{catalog}', t(config.labelKey))} compact />}
      {items.map(item => <article key={item.id} style={{ background:C.surface, border:`1px solid ${item.active ? C.border : C.danger}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}><div style={{ fontSize:14, fontWeight:500, color:C.text }}>{item.label ?? item.name} {!item.active && <span style={{ color:C.muted, fontSize:11 }}>({t('admin.settings.catalog.inactive')})</span>}</div><div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.slug}{item.category ? ` · ${item.category}` : ''} · {t('admin.settings.catalog.usage').replace('{count}', item.usageCount || 0)}</div>{item.description && <div style={{ fontSize:12, color:C.text2, marginTop:4 }}>{item.description}</div>}<div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}><button type="button" onClick={() => openEdit(item)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2 }}>{t('admin.settings.catalog.edit')}</button><button type="button" onClick={() => toggle(item)} style={{ background:item.active ? C.dangerDim : C.successDim, border:`1px solid ${item.active ? C.danger : C.success}`, borderRadius:6, padding:'5px 12px', color:item.active ? C.danger : C.success }}>{item.active ? t('admin.settings.catalog.deactivate') : t('admin.settings.catalog.activate')}</button><button type="button" onClick={() => remove(item)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted }}>{t('admin.settings.catalog.delete')}</button></div></article>)}
    </section>
  )
}
