import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const VISIBILITY_VALUES = ['PUBLIC', 'BLURRED', 'PRIVATE_AFTER_MATCH', 'PRIVATE_AFTER_APPROVAL']

function PhotoCard({ photo, onDelete, onUpdate, t }) {
  const [visibility, setVisibility] = useState(photo.visibilityLevel)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const option = value => t(`photos.visibility.${value}`, {})
  const current = option(visibility)

  const changeVisibility = async value => {
    const previous = visibility
    setSaving(true)
    setVisibility(value)
    try {
      await api.put(`/photos/${photo.id}`, { visibilityLevel:value })
      onUpdate(photo.id, { visibilityLevel:value })
    } catch {
      setVisibility(previous)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await api.delete(`/photos/${photo.id}`)
      onDelete(photo.id)
    } catch {
      setDeleting(false)
    }
  }

  return <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
    <div style={{ height:160, position:'relative', overflow:'hidden', background:C.elevated }}>
      <img src={photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:visibility==='BLURRED'?'blur(8px) brightness(.7)':'none' }}/>
      {photo.isPrimary && <div style={{ position:'absolute', top:8, left:8, background:C.primary, borderRadius:20, padding:'3px 8px', fontSize:10, color:'#0A141A', fontWeight:700 }}>{t('photos.primary')}</div>}
      <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', borderRadius:20, padding:'3px 8px' }}>{current.icon}</div>
      <button aria-label={t('photos.deleteLabel')} onClick={remove} disabled={deleting} style={{ position:'absolute', bottom:8, right:8, background:'rgba(248,113,113,.85)', border:'none', borderRadius:'50%', width:30, height:30, color:'#fff', cursor:'pointer' }}>{deleting?'⏳':'✕'}</button>
    </div>
    <div style={{ padding:'10px 12px' }}>
      <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{current.label} — {current.desc}</div>
      <div style={{ display:'flex', gap:4 }}>
        {VISIBILITY_VALUES.map(value => {
          const item = option(value)
          return <button key={value} title={item.label} onClick={() => changeVisibility(value)} disabled={saving} style={{ flex:1, background:visibility===value?C.primaryDim:C.input, border:`1px solid ${visibility===value?C.primary:C.border}`, borderRadius:8, padding:'5px 2px', cursor:'pointer', opacity:saving ? 0.6 : 1 }}>{item.icon}</button>
        })}
      </div>
    </div>
  </div>
}

export default function PhotosPage() {
  const navigate = useNavigate()
  const { t, formatNumber } = useI18n()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [newVisibility, setNewVisibility] = useState('BLURRED')
  const fileRef = useRef(null)
  const option = value => t(`photos.visibility.${value}`, {})

  useEffect(() => {
    api.get('/photos/me').then(res => setPhotos(res.data.photos || [])).catch(() => setError(t('photos.uploadError'))).finally(() => setLoading(false))
  }, [t])

  const selectFile = event => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) return setError(t('photos.fileTooLarge'))
    const reader = new FileReader()
    reader.onload = value => setPreview({ file, url:value.target?.result })
    reader.readAsDataURL(file)
  }

  const upload = async () => {
    if (!preview) return
    setUploading(true)
    setError('')
    try {
      const data = new FormData()
      data.append('photo', preview.file)
      data.append('visibility', newVisibility)
      const response = await api.post('/photos', data, { headers:{ 'Content-Type':'multipart/form-data' } })
      setPhotos(previous => [...previous, response.data])
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setError(t('photos.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
        <div><h1 style={{ fontSize:22, color:C.text, margin:0 }}>{t('photos.title')}</h1><p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>{formatNumber(photos.length)}/6 {t('photos.countSuffix')} · {t('photos.softRevealActive')}</p></div>
      </div>

      <div style={{ background:C.primaryDim, border:'1px solid rgba(184,167,255,.25)', borderRadius:16, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:13, color:C.primary, fontWeight:600, marginBottom:8 }}>📷 Soft Reveal</div>
        {VISIBILITY_VALUES.map(value => { const item=option(value); return <div key={value} style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>{item.icon} <strong style={{ color:C.text2 }}>{item.label}</strong> — {item.desc}</div> })}
      </div>

      {photos.length < 6 && <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:20 }}>
        <div style={{ fontSize:13, color:C.text2, fontWeight:600, marginBottom:12 }}>➕ {t('photos.add')}</div>
        {error && <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.3)', borderRadius:12, padding:'10px 14px', marginBottom:12, color:C.danger, fontSize:12 }}>{error}</div>}
        {preview ? <>
          <div style={{ position:'relative', marginBottom:12 }}><img src={preview.url} alt={t('photos.previewAlt')} style={{ width:'100%', height:200, objectFit:'cover', borderRadius:12, filter:newVisibility==='BLURRED'?'blur(8px)':'none' }}/><button aria-label={t('photos.deleteLabel')} onClick={() => setPreview(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', border:'none', borderRadius:'50%', width:28, height:28, color:'#fff' }}>✕</button></div>
          <div style={{ fontSize:12, color:C.text2, marginBottom:8 }}>{t('photos.visibilityTitle')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>{VISIBILITY_VALUES.map(value => { const item=option(value); return <button key={value} onClick={() => setNewVisibility(value)} style={{ background:newVisibility===value?C.primaryDim:C.input, border:`1px solid ${newVisibility===value?C.primary:C.border}`, borderRadius:10, padding:'8px 10px', color:C.text2, textAlign:'left' }}>{item.icon} <strong>{item.label}</strong><div style={{ fontSize:10, color:C.muted }}>{item.desc}</div></button> })}</div>
          <button onClick={upload} disabled={uploading} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:13, fontWeight:600, color:'#0A141A', opacity:uploading ? 0.7 : 1 }}>{uploading?t('photos.uploading'):t('photos.upload')}</button>
        </> : <>
          <div onClick={() => fileRef.current?.click()} style={{ height:120, border:`2px dashed ${C.border}`, borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', marginBottom:12, gap:8 }}><span style={{ fontSize:32 }}>📷</span><span style={{ color:C.muted, fontSize:13 }}>{t('photos.chooseHint')}</span><span style={{ color:C.muted, fontSize:11 }}>{t('photos.formats')}</span></div>
          <button onClick={() => fileRef.current?.click()} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:13, fontWeight:600, color:'#0A141A' }}>{t('photos.choose')}</button>
        </>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={selectFile}/>
      </div>}

      {loading ? <div style={{ textAlign:'center', color:C.muted, padding:40 }}>{t('photos.loading')}</div> : photos.length===0 ? <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted }}><div style={{ fontSize:48 }}>🖼️</div>{t('photos.empty')}</div> : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{photos.map(photo => <PhotoCard key={photo.id} photo={photo} t={t} onDelete={id => setPhotos(previous => previous.filter(item => item.id!==id))} onUpdate={(id, changes) => setPhotos(previous => previous.map(item => item.id===id?{...item,...changes}:item))}/>)}</div>}
    </div>
  </div>
}
