import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { CIRCLE_STATUSES, CIRCLE_VISIBILITIES } from './adminSettingsContracts'

const emptyForm = { name:'', description:'', city:'', country:'', visibility:'DISCOVERABLE', status:'DRAFT' }

export default function AdminCirclesSettings({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [circles, setCircles] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/circles/admin/all').then(response => setCircles(response.data.circles || [])).catch(responseError => setError(responseError.response?.data?.error || t('admin.settings.circles.loadError'))).finally(() => setLoading(false))
  }, [t])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ ...emptyForm }); setEditing('new'); setError('') }
  const openEdit = circle => { setForm({ ...emptyForm, ...circle }); setEditing(circle); setError('') }
  const save = async () => {
    if (!form.name.trim()) return setError(t('admin.settings.circles.required'))
    setSaving(true); setError('')
    try { if (editing === 'new') await api.post('/circles/admin', form); else await api.put(`/circles/admin/${editing.id}`, form); setEditing(null); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.circles.saveError')) }
    finally { setSaving(false) }
  }
  const remove = async id => { if (!window.confirm(t('admin.settings.circles.deleteConfirm'))) return; try { await api.delete(`/circles/admin/${id}`); load() } catch { setError(t('admin.settings.circles.deleteError')) } }
  const input = { width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text }

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (editing !== null) return <section aria-label={t('admin.settings.circles.title')}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}><button type="button" onClick={() => setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20 }}>←</button><h3 style={{ color:C.text, fontSize:16, margin:0, flex:1 }}>{editing === 'new' ? t('admin.settings.circles.new') : t('admin.settings.circles.edit')}</h3><button type="button" onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600 }}>{saving ? '…' : t('admin.settings.common.save')}</button></div>
    {error && <div role="alert" style={{ color:C.danger, marginBottom:10 }}>{error}</div>}
    {[['name','input'],['description','textarea'],['city','input'],['country','input']].map(([field,type]) => <label key={field} style={{ display:'block', marginBottom:10 }}><span style={{ fontSize:11, color:C.muted }}>{t(`admin.settings.fields.${field}`)}</span>{type === 'textarea' ? <textarea rows={4} value={form[field]} onChange={event => setForm(previous => ({...previous,[field]:event.target.value}))} style={{...input,resize:'vertical'}} /> : <input value={form[field]} onChange={event => setForm(previous => ({...previous,[field]:event.target.value}))} style={input} />}</label>)}
    <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{t('admin.settings.fields.visibility')}</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{CIRCLE_VISIBILITIES.map(value => <button key={value} type="button" onClick={() => setForm(previous => ({...previous,visibility:value}))} style={{ background:form.visibility === value ? C.primaryDim : C.elevated, border:`1px solid ${form.visibility === value ? C.primary : C.border}`, borderRadius:8, padding:'6px 12px', color:form.visibility === value ? C.primary : C.text2 }}>{t(`admin.settings.circles.visibility.${value}`)}</button>)}</div></div>
    <div><div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{t('admin.settings.fields.status')}</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{CIRCLE_STATUSES.map(value => <button key={value} type="button" onClick={() => setForm(previous => ({...previous,status:value}))} style={{ background:form.status === value ? C.primaryDim : C.elevated, border:`1px solid ${form.status === value ? C.primary : C.border}`, borderRadius:8, padding:'6px 12px', color:form.status === value ? C.primary : C.text2 }}>{t(`admin.settings.circles.status.${value}`)}</button>)}</div></div>
  </section>

  return <section aria-label={t('admin.settings.circles.title')}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}><div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', color:C.primary, fontSize:13, flex:1 }}>{t('admin.settings.circles.description')}</div><button type="button" onClick={openNew} style={{ marginLeft:10, background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600 }}>+ {t('admin.settings.circles.new')}</button></div>
    {error && <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />}
    {!error && circles.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.circles.empty')} compact />}
    {circles.map(circle => <div key={circle.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:8 }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><div><div style={{ color:C.text, fontWeight:500 }}>{circle.name}</div><div style={{ color:C.muted, fontSize:11 }}>{[circle.city,circle.country].filter(Boolean).join(', ')} · {t(`admin.settings.circles.visibility.${circle.visibility}`, circle.visibility)} · {t(`admin.settings.circles.status.${circle.status}`, circle.status)}</div></div><div style={{ display:'flex', gap:6 }}><button type="button" onClick={() => openEdit(circle)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2 }}>{t('admin.settings.common.edit')}</button><button type="button" onClick={() => remove(circle.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted }}>{t('admin.settings.common.delete')}</button></div></div>{circle.description && <div style={{ color:C.text2, fontSize:12, marginTop:6 }}>{circle.description}</div>}</div>)}
  </section>
}
