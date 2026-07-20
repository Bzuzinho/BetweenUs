import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80', danger:'#F87171',
}

const GESTURES = [
  { icon:'✌️', key:'peace' },
  { icon:'👍', key:'thumb' },
  { icon:'🤙', key:'shaka' },
  { icon:'☝️', key:'finger' },
]

export default function VerificationPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const [gesture] = useState(() => GESTURES[Math.floor(Math.random() * GESTURES.length)])

  useEffect(() => {
    api.get('/verifications/me')
      .then(response => setStatus(response.data.status))
      .catch(() => setStatus('NONE'))
      .finally(() => setLoading(false))
  }, [])

  const handleFile = event => {
    const file = event.target.files?.[0]
    if (!file) return
    setMsg('')
    setError('')
    if (file.size > 10 * 1024 * 1024) {
      setError(t('verification.fileTooLarge'))
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = result => setPreview({ file, url:result.target?.result })
    reader.onerror = () => setError(t('verification.uploadError'))
    reader.readAsDataURL(file)
  }

  const clearPreview = () => {
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!preview || uploading) return
    setUploading(true)
    setError('')
    setMsg('')
    try {
      const formData = new FormData()
      formData.append('selfie', preview.file)
      const response = await api.post('/verifications/submit', formData, {
        headers:{ 'Content-Type':'multipart/form-data' },
      })
      setStatus(response.data.status || 'PENDING')
      clearPreview()
      setMsg(t('verification.submitted'))
    } catch {
      setError(t('verification.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', color:C.primary }}>
      {t('verification.loading')}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')} aria-label={t('common.back')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.text, margin:0 }}>{t('verification.title')}</h1>
        </div>

        {status === 'APPROVED' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:70, marginBottom:20 }}>✅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.text, marginBottom:12 }}>{t('verification.verifiedTitle')}</div>
            <div style={{ background:'rgba(74,222,128,0.1)', border:`1px solid ${C.success}`, borderRadius:20, padding:'10px 20px', display:'inline-block', color:C.success, fontSize:14, fontWeight:600, marginBottom:20 }}>✓ {t('verification.verifiedBadge')}</div>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>{t('verification.verifiedText')}</p>
          </div>
        )}

        {status === 'PENDING' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:70, marginBottom:20 }}>⏳</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text, marginBottom:12 }}>{t('verification.pendingTitle')}</div>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>{msg || t('verification.pendingText')}</p>
          </div>
        )}

        {status === 'REJECTED' && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:20, padding:20, marginBottom:20, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
            <div style={{ color:C.danger, fontWeight:600, fontSize:15, marginBottom:8 }}>{t('verification.rejectedTitle')}</div>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, margin:0 }}>{t('verification.rejectedText')}</p>
          </div>
        )}

        {(status === 'NONE' || status === 'REJECTED') && (
          <>
            <div style={{ background:C.primaryDim, border:'1px solid rgba(184,167,255,0.25)', borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, color:C.primary, fontWeight:600, marginBottom:10 }}>{t('verification.howTitle')}</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
                {t('verification.steps', []).map((step, index) => <div key={step}>{index + 1}. {step}</div>)}
              </div>
            </div>

            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:20, textAlign:'center' }}>
              <div style={{ fontSize:13, color:C.text2, marginBottom:8 }}>{t('verification.challenge')}</div>
              <div style={{ fontSize:60, marginBottom:8 }}>{gesture.icon}</div>
              <div style={{ fontSize:18, color:C.text, fontWeight:600 }}>{t(`verification.gestures.${gesture.key}`)}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:8 }}>{t('verification.visibilityHelp')}</div>
            </div>

            {msg && <div style={{ background:'rgba(74,222,128,0.1)', border:`1px solid ${C.success}`, borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.success, fontSize:13 }}>{msg}</div>}
            {error && <div role="alert" style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.danger, fontSize:13 }}>{error}</div>}

            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20 }}>
              {preview ? (
                <>
                  <div style={{ position:'relative', marginBottom:14 }}>
                    <img src={preview.url} alt={t('verification.previewAlt')} style={{ width:'100%', height:220, objectFit:'cover', borderRadius:14 }} />
                    <button onClick={clearPreview} aria-label={t('verification.removePreview')} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.65)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', fontSize:14 }}>✕</button>
                  </div>
                  <button onClick={handleSubmit} disabled={uploading} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#0A141A', cursor:uploading?'not-allowed':'pointer', opacity:uploading?0.7:1 }}>
                    {uploading ? t('verification.sending') : `${t('verification.submit')} →`}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => fileRef.current?.click()} style={{ width:'100%', height:140, background:'none', border:`2px dashed ${C.border}`, borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', gap:8, marginBottom:14, color:C.muted }}>
                    <span style={{ fontSize:40 }}>🤳</span>
                    <span style={{ fontSize:13 }}>{t('verification.choose')}</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={handleFile} />
                  <button onClick={() => fileRef.current?.click()} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#0A141A', cursor:'pointer' }}>{t('verification.takeSelfie')} 🤳</button>
                </>
              )}
            </div>

            <p style={{ color:C.muted, fontSize:11, lineHeight:1.6, textAlign:'center', marginTop:16 }}>🔒 {t('verification.privacy')}</p>
          </>
        )}
      </div>
    </div>
  )
}
