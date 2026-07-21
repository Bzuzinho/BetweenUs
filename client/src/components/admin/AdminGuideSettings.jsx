import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { GUIDE_CATEGORIES } from './adminSettingsContracts'

const emptyForm = { title:'', category:'PRIVACY', summary:'', body:'', icon:'○', published:false, sortOrder:0, slug:'', locale:'pt', seoTitle:'', seoDescription:'' }

export default function AdminGuideSettings({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [articles, setArticles] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/guide/admin/all').then(response => setArticles(response.data.articles || [])).catch(responseError => setError(responseError.response?.data?.error || t('admin.settings.guide.loadError'))).finally(() => setLoading(false))
  }, [t])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ ...emptyForm, sortOrder:articles.length }); setEditing('new'); setError(''); setMessage('') }
  const openEdit = article => { setForm({ ...emptyForm, ...article, summary:article.summary || '', body:article.body || '', slug:article.slug || '', locale:article.locale || 'pt', seoTitle:article.seoTitle || '', seoDescription:article.seoDescription || '' }); setEditing(article); setError(''); setMessage('') }
  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return setError(t('admin.settings.guide.required'))
    setSaving(true); setError(''); setMessage('')
    try { if (editing === 'new') await api.post('/guide/admin', form); else await api.put(`/guide/admin/${editing.id}`, form); setEditing(null); setMessage(t('admin.settings.guide.saved')); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.guide.saveError')) }
    finally { setSaving(false) }
  }
  const togglePublish = async article => { try { await api.post(`/guide/admin/${article.id}/${article.published ? 'unpublish' : 'publish'}`); load() } catch { setError(t('admin.settings.guide.saveError')) } }
  const remove = async id => { if (!window.confirm(t('admin.settings.guide.deleteConfirm'))) return; try { await api.delete(`/guide/admin/${id}`); load() } catch { setError(t('admin.settings.guide.deleteError')) } }

  const input = { width:'100%', boxSizing:'border-box', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text }

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (editing !== null) return <section aria-label={t('admin.settings.guide.title')}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}><button type="button" onClick={() => setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20 }}>←</button><h3 style={{ color:C.text, fontSize:16, margin:0, flex:1 }}>{editing === 'new' ? t('admin.settings.guide.new') : t('admin.settings.guide.edit')}</h3><button type="button" onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600 }}>{saving ? '…' : t('admin.settings.common.save')}</button></div>
    {error && <div role="alert" style={{ color:C.danger, marginBottom:10 }}>{error}</div>}
    <label style={{ display:'block', marginBottom:10 }}><span style={{ fontSize:11, color:C.muted }}>{t('admin.settings.fields.title')}</span><input value={form.title} onChange={event => setForm(previous => ({...previous,title:event.target.value}))} style={input} /></label>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:10 }}><label><span style={{ fontSize:11, color:C.muted }}>{t('admin.settings.fields.category')}</span><select value={form.category} onChange={event => setForm(previous => ({...previous,category:event.target.value}))} style={input}>{GUIDE_CATEGORIES.map(value => <option key={value} value={value}>{t(`admin.settings.guide.category.${value}`)}</option>)}</select></label><label><span style={{ fontSize:11, color:C.muted }}>{t('admin.settings.fields.locale')}</span><input value={form.locale} onChange={event => setForm(previous => ({...previous,locale:event.target.value}))} style={input} /></label><label><span style={{ fontSize:11, color:C.muted }}>{t('admin.settings.fields.sortOrder')}</span><input type="number" value={form.sortOrder} onChange={event => setForm(previous => ({...previous,sortOrder:Number(event.target.value)}))} style={input} /></label></div>
    {[['slug','input'],['summary','textarea'],['body','textarea'],['seoTitle','input'],['seoDescription','textarea']].map(([field,type]) => <label key={field} style={{ display:'block', marginBottom:10 }}><span style={{ fontSize:11, color:C.muted }}>{t(`admin.settings.fields.${field}`)}</span>{type === 'textarea' ? <textarea rows={field === 'body' ? 12 : 3} value={form[field]} onChange={event => setForm(previous => ({...previous,[field]:event.target.value}))} style={{...input,resize:'vertical'}} /> : <input value={form[field]} onChange={event => setForm(previous => ({...previous,[field]:event.target.value}))} style={input} />}</label>)}
    <label style={{ color:C.text2 }}><input type="checkbox" checked={form.published} onChange={event => setForm(previous => ({...previous,published:event.target.checked}))} /> {t('admin.settings.guide.published')}</label>
  </section>

  return <section aria-label={t('admin.settings.guide.title')}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}><h3 style={{ color:C.text, margin:0 }}>{t('admin.settings.guide.title')}</h3><button type="button" onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600 }}>+ {t('admin.settings.guide.new')}</button></div>
    {message && <div role="status" style={{ color:C.success, marginBottom:10 }}>{message}</div>}
    {error && <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />}
    {!error && articles.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.settings.guide.empty')} compact />}
    {articles.map(article => <div key={article.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:8 }}><div style={{ display:'flex', gap:10 }}><span style={{ fontSize:20 }}>{article.icon || '○'}</span><div style={{ flex:1 }}><div style={{ color:C.text, fontWeight:500 }}>{article.title}</div><div style={{ color:C.muted, fontSize:11 }}>{t(`admin.settings.guide.category.${article.category}`, article.category)} · {article.locale || 'pt'} · {article.published ? t('admin.settings.guide.publishedState') : t('admin.settings.guide.draftState')}</div>{article.summary && <div style={{ color:C.text2, fontSize:12, marginTop:4 }}>{article.summary}</div>}</div></div><div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}><button type="button" onClick={() => openEdit(article)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2 }}>{t('admin.settings.common.edit')}</button><button type="button" onClick={() => togglePublish(article)} style={{ background:article.published ? C.dangerDim : C.successDim, border:`1px solid ${article.published ? C.danger : C.success}`, borderRadius:6, padding:'5px 12px', color:article.published ? C.danger : C.success }}>{article.published ? t('admin.settings.guide.unpublish') : t('admin.settings.guide.publish')}</button><button type="button" onClick={() => remove(article.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted }}>{t('admin.settings.common.delete')}</button></div></div>)}
  </section>
}
