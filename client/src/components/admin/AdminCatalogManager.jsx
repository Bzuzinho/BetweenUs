import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { ADMIN_CATALOG_CONFIGS, BOUNDARY_CONSTRAINT_TYPES, BOUNDARY_RULE_TYPES } from './adminSettingsContracts'

const fieldStyle = C => ({ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text, fontSize:14 })

export default function AdminCatalogManager({ colors, catalog }) {
  const C = colors
  const { t } = useI18n()
  const config = ADMIN_CATALOG_CONFIGS[catalog]
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(config?.defaults || {})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(() => {
    if (!config) return
    setLoading(true); setError('')
    api.get(config.endpoint)
      .then(response => setItems(response.data[config.responseKey] || []))
      .catch(responseError => setError(responseError.response?.data?.error || t('admin.settings.catalogs.loadError')))
      .finally(() => setLoading(false))
  }, [config, t])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ ...config.defaults }); setEditing('new'); setError(''); setMessage('') }
  const openEdit = item => {
    const next = { ...config.defaults }
    Object.keys(next).forEach(key => { if (item[key] !== undefined && item[key] !== null) next[key] = item[key] })
    setForm(next); setEditing(item); setError(''); setMessage('')
  }

  const payload = useMemo(() => {
    const data = { ...form }
    if (config.boundary && data.ruleType !== 'CANDIDATE_CONSTRAINT') data.constraintType = null
    if (config.boundary && data.constraintType === '') data.constraintType = null
    data.sortOrder = Number(data.sortOrder || 0)
    return data
  }, [form, config])

  const save = async () => {
    const labelField = config.itemLabelKey
    if (!String(form[labelField] || '').trim() || !String(form.slug || '').trim()) {
      setError(t('admin.settings.catalogs.required'))
      return
    }
    setSaving(true); setError(''); setMessage('')
    try {
      if (editing === 'new') await api.post(config.endpoint, payload)
      else await api.put(`${config.endpoint}/${editing.id}`, payload)
      setEditing(null); setMessage(t('admin.settings.catalogs.saved')); load()
    } catch (responseError) {
      setError(responseError.response?.data?.error || t('admin.settings.catalogs.saveError'))
    } finally { setSaving(false) }
  }

  const toggle = async item => {
    try { await api.put(`${config.endpoint}/${item.id}`, { active:!item.active }); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.catalogs.saveError')) }
  }

  const remove = async item => {
    if (item.usageCount > 0) {
      if (!window.confirm(t('admin.settings.catalogs.inUse').replace('{count}', item.usageCount))) return
      return toggle({ ...item, active:true })
    }
    if (!window.confirm(t('admin.settings.catalogs.deleteConfirm'))) return
    try { await api.delete(`${config.endpoint}/${item.id}`); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.catalogs.deleteError')) }
  }

  if (!config) return null
  if (loading) return <AdminAsyncState colors={C} state="loading" />

  if (editing !== null) return (
    <section aria-label={t(config.titleKey)}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button type="button" onClick={() => setEditing(null)} aria-label={t('admin.settings.common.back')} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>{editing === 'new' ? t('admin.settings.catalogs.new') : t('admin.settings.catalogs.edit')} {t(config.singularKey)}</h3>
        <button type="button" onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600, cursor:'pointer' }}>{saving ? '…' : t('admin.settings.common.save')}</button>
      </div>
      {error && <div role="alert" style={{ color:C.danger, marginBottom:10 }}>{error}</div>}
      {config.fields.map(field => (
        <label key={field} style={{ display:'block', marginBottom:10 }}>
          <span style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>{t(`admin.settings.fields.${field}`)}</span>
          {field === 'description' ? (
            <textarea rows={3} value={form[field] || ''} onChange={event => setForm(previous => ({...previous, [field]:event.target.value}))} style={{ ...fieldStyle(C), resize:'vertical' }} />
          ) : field === 'ruleType' ? (
            <select value={form.ruleType} onChange={event => setForm(previous => ({...previous, ruleType:event.target.value}))} style={fieldStyle(C)}>{BOUNDARY_RULE_TYPES.map(value => <option key={value} value={value}>{t(`admin.settings.boundaryRule.${value}`)}</option>)}</select>
          ) : field === 'constraintType' ? (
            <select value={form.constraintType || ''} disabled={form.ruleType !== 'CANDIDATE_CONSTRAINT'} onChange={event => setForm(previous => ({...previous, constraintType:event.target.value}))} style={fieldStyle(C)}><option value="">—</option>{BOUNDARY_CONSTRAINT_TYPES.map(value => <option key={value} value={value}>{t(`admin.settings.boundaryConstraint.${value}`)}</option>)}</select>
          ) : (
            <input type={field === 'sortOrder' ? 'number' : 'text'} value={form[field] ?? ''} disabled={field === 'slug' && editing !== 'new'} onChange={event => setForm(previous => ({...previous, [field]:field === 'sortOrder' ? Number(event.target.value) : event.target.value}))} style={fieldStyle(C)} />
          )}
        </label>
      ))}
      {config.boundary && <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:10 }}>
        {[['isHardBoundary','hardBoundary'],['sensitive','sensitive']].map(([field,key]) => <label key={field} style={{ color:C.text2, fontSize:13 }}><input type="checkbox" checked={Boolean(form[field])} onChange={event => setForm(previous => ({...previous, [field]:event.target.checked}))} /> {t(`admin.settings.fields.${key}`)}</label>)}
      </div>}
      <label style={{ color:C.text2, fontSize:13 }}><input type="checkbox" checked={Boolean(form.active)} onChange={event => setForm(previous => ({...previous, active:event.target.checked}))} /> {t('admin.settings.fields.active')}</label>
    </section>
  )

  return (
    <section aria-label={t(config.titleKey)}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}><div style={{ fontSize:15, fontWeight:500, color:C.text }}>{t(config.titleKey)} · {items.length}</div><button type="button" onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600, cursor:'pointer' }}>+ {t('admin.settings.catalogs.new')}</button></div>
      {message && <div role="status" style={{ color:C.success, marginBottom:10 }}>{message}</div>}
      {error && <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />}
      {!error && items.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.catalogs.empty')} compact />}
      {items.map(item => (
        <div key={item.id} style={{ background:C.surface, border:`1px solid ${item.active ? C.border : 'rgba(248,113,113,0.2)'}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{item[config.itemLabelKey]} {!item.active && <span style={{ color:C.muted, fontSize:11 }}>({t('admin.settings.catalogs.inactive')})</span>}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.slug}{item.category ? ` · ${item.category}` : ''}{item.usageCount != null ? ` · ${t('admin.settings.catalogs.usage').replace('{count}', item.usageCount)}` : ''}</div>
          <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}><button type="button" onClick={() => openEdit(item)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2 }}>{t('admin.settings.common.edit')}</button><button type="button" onClick={() => toggle(item)} style={{ background:item.active ? C.dangerDim : C.successDim, border:`1px solid ${item.active ? C.danger : C.success}`, borderRadius:6, padding:'5px 12px', color:item.active ? C.danger : C.success }}>{item.active ? t('admin.settings.common.deactivate') : t('admin.settings.common.activate')}</button><button type="button" onClick={() => remove(item)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted }}>{t('admin.settings.common.delete')}</button></div>
        </div>
      ))}
    </section>
  )
}
