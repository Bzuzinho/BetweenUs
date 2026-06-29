import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

const VISIBILITY_OPTS = [
  { value:'PUBLIC', label:'Pública', desc:'Visível para todos', icon:'🌍' },
  { value:'BLURRED', label:'Desfocada', desc:'Desfocada até match', icon:'🌫️' },
  { value:'PRIVATE_AFTER_MATCH', label:'Privada', desc:'Visível após match', icon:'🔒' },
  { value:'PRIVATE_AFTER_APPROVAL', label:'Aprovação', desc:'Só com aprovação', icon:'🤝' },
]

function PhotoCard({ photo, onDelete, onUpdate }) {
  const [vis, setVis] = useState(photo.visibilityLevel)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const changeVisibility = async (newVis) => {
    setSaving(true)
    setVis(newVis)
    try {
      await api.put(`/photos/${photo.id}`, { visibilityLevel: newVis })
      onUpdate(photo.id, { visibilityLevel: newVis })
    } catch { setVis(photo.visibilityLevel) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm) { onDelete(photo.id); return }
    setDeleting(true)
    try {
      await api.delete(`/photos/${photo.id}`)
      onDelete(photo.id)
    } catch { setDeleting(false) }
  }

  const currentOpt = VISIBILITY_OPTS.find(o => o.value === vis) || VISIBILITY_OPTS[1]

  return (
    <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
      borderRadius:16, overflow:'hidden', position:'relative' }}>

      {/* Photo preview */}
      <div style={{ height:160, position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg,#3D2060,#0E0818)' }}>
        <img src={photo.storagePath} alt=""
          style={{ width:'100%', height:'100%', objectFit:'cover',
            filter: vis === 'BLURRED' ? 'blur(8px) brightness(0.7)' : 'none',
            transition:'filter 0.3s' }} />

        {/* Primary badge */}
        {photo.isPrimary && (
          <div style={{ position:'absolute', top:8, left:8,
            background:colors.accent, borderRadius:20, padding:'3px 8px',
            fontSize:10, color:'#1A0A2E', fontWeight:700 }}>Principal</div>
        )}

        {/* Visibility icon */}
        <div style={{ position:'absolute', top:8, right:8,
          background:'rgba(0,0,0,0.6)', borderRadius:20,
          padding:'3px 8px', fontSize:14 }}>
          {currentOpt.icon}
        </div>

        {/* Delete */}
        <button onClick={handleDelete} disabled={deleting}
          style={{ position:'absolute', bottom:8, right:8,
            background:'rgba(224,92,122,0.8)', border:'none',
            borderRadius:'50%', width:28, height:28,
            cursor:'pointer', fontSize:12, color:'white',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          {deleting ? '⏳' : '✕'}
        </button>
      </div>

      {/* Visibility selector */}
      <div style={{ padding:'10px 12px' }}>
        <div style={{ fontSize:11, color:colors.muted, marginBottom:6 }}>
          {currentOpt.label} — {currentOpt.desc}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {VISIBILITY_OPTS.map(o => (
            <button key={o.value} onClick={() => changeVisibility(o.value)}
              title={o.label}
              style={{ flex:1, background: vis === o.value
                ? 'rgba(201,149,107,0.2)' : colors.bgInput,
                border:`1px solid ${vis === o.value ? colors.accent : colors.plum}`,
                borderRadius:8, padding:'5px 2px', cursor:'pointer',
                fontSize:14, transition:'all 0.2s', opacity: saving ? 0.6 : 1 }}>
              {o.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PhotosPage() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [newVisibility, setNewVisibility] = useState('BLURRED')
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/photos/me')
      .then(res => setPhotos(res.data.photos || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Ficheiro demasiado grande. Máximo 10MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setPreview({ file, url: ev.target?.result })
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview) return
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('photo', preview.file)
      formData.append('visibility', newVisibility)

      const res = await api.post('/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPhotos(prev => [...prev, res.data])
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer upload.')
    } finally { setUploading(false) }
  }

  const handleDelete = (id) => setPhotos(prev => prev.filter(p => p.id !== id))
  const handleUpdate = (id, changes) => setPhotos(prev =>
    prev.map(p => p.id === id ? { ...p, ...changes } : p))

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background:'none', border:'none',
              color:colors.lavLight, fontSize:20, cursor:'pointer' }}>←</button>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              fontWeight:700, color:colors.white }}>As minhas fotos</h1>
            <p style={{ color:colors.muted, fontSize:12 }}>
              {photos.length}/6 fotos · Soft Reveal ativado
            </p>
          </div>
        </div>

        {/* Soft Reveal explainer */}
        <div style={{ background:'rgba(201,149,107,0.08)',
          border:'1px solid rgba(201,149,107,0.2)',
          borderRadius:16, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, color:colors.accent,
            fontWeight:600, marginBottom:6 }}>📷 Soft Reveal</div>
          <div style={{ fontSize:12, color:colors.muted, lineHeight:1.6 }}>
            🌍 <strong style={{color:colors.lavLight}}>Pública</strong> — visível para todos<br/>
            🌫️ <strong style={{color:colors.lavLight}}>Desfocada</strong> — desfocada até match<br/>
            🔒 <strong style={{color:colors.lavLight}}>Privada</strong> — só após match<br/>
            🤝 <strong style={{color:colors.lavLight}}>Aprovação</strong> — só com tua autorização
          </div>
        </div>

        {/* Upload area */}
        {photos.length < 6 && (
          <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:20, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:13, color:colors.lavLight,
              fontWeight:600, marginBottom:12 }}>➕ Adicionar foto</div>

            {error && (
              <div style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
                padding:'10px 14px', marginBottom:12,
                color:'#E05C7A', fontSize:12 }}>{error}</div>
            )}

            {/* Preview */}
            {preview ? (
              <div style={{ position:'relative', marginBottom:12 }}>
                <img src={preview.url} alt="preview"
                  style={{ width:'100%', height:200, objectFit:'cover',
                    borderRadius:12,
                    filter: newVisibility === 'BLURRED'
                      ? 'blur(8px)' : 'none' }} />
                <button onClick={() => setPreview(null)}
                  style={{ position:'absolute', top:8, right:8,
                    background:'rgba(0,0,0,0.6)', border:'none',
                    borderRadius:'50%', width:28, height:28,
                    cursor:'pointer', color:'white', fontSize:14 }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ height:120, border:`2px dashed ${colors.plum}`,
                  borderRadius:12, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  cursor:'pointer', marginBottom:12, gap:8,
                  transition:'border-color 0.2s' }}>
                <span style={{ fontSize:32 }}>📷</span>
                <span style={{ color:colors.muted, fontSize:13 }}>
                  Toca para escolher foto
                </span>
                <span style={{ color:colors.muted, fontSize:11 }}>
                  JPG, PNG, WEBP · Max 10MB
                </span>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*"
              style={{ display:'none' }} onChange={handleFileSelect} />

            {/* Visibility for new photo */}
            {preview && (
              <>
                <div style={{ fontSize:12, color:colors.lavLight,
                  marginBottom:8 }}>Visibilidade desta foto:</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                  gap:6, marginBottom:14 }}>
                  {VISIBILITY_OPTS.map(o => (
                    <div key={o.value} onClick={() => setNewVisibility(o.value)}
                      style={{ background: newVisibility === o.value
                        ? 'rgba(201,149,107,0.15)' : colors.bgInput,
                        border:`1.5px solid ${newVisibility === o.value
                          ? colors.accent : colors.plum}`,
                        borderRadius:10, padding:'8px 10px', cursor:'pointer',
                        transition:'all 0.2s' }}>
                      <div style={{ fontSize:16, marginBottom:2 }}>{o.icon}</div>
                      <div style={{ fontSize:11, color: newVisibility === o.value
                        ? colors.accent : colors.lavLight, fontWeight:600 }}>
                        {o.label}
                      </div>
                      <div style={{ fontSize:10, color:colors.muted }}>
                        {o.desc}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleUpload} disabled={uploading}
                  style={{ width:'100%',
                    background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                    border:'none', borderRadius:50, padding:13, fontSize:14,
                    fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                    opacity: uploading ? 0.7 : 1, fontFamily:'Inter,sans-serif' }}>
                  {uploading ? 'A fazer upload...' : 'Guardar foto ✓'}
                </button>
              </>
            )}

            {!preview && (
              <button onClick={() => fileRef.current?.click()}
                style={{ width:'100%', background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                  border:'none', borderRadius:50, padding:13, fontSize:14,
                  fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                  fontFamily:'Inter,sans-serif' }}>
                Escolher foto
              </button>
            )}
          </div>
        )}

        {/* Photo grid */}
        {loading ? (
          <div style={{ textAlign:'center', color:colors.muted,
            fontSize:13, padding:40 }}>A carregar fotos...</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🖼️</div>
            <div style={{ color:colors.muted, fontSize:14 }}>
              Ainda sem fotos. Adiciona a primeira.
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {photos.map(p => (
              <PhotoCard key={p.id} photo={p}
                onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
