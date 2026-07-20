import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3', danger:'#F87171',
}

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/password/forgot', { email })
      setSent(true)
    } catch {
      setError(t('forgot.sendError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontStyle:'italic', background:C.primary, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 }}>Between Us</h1>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:28 }}>
          {sent ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8 }}>{t('forgot.sentTitle')}</h2>
              <p style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>{t('forgot.sentText')}</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8, marginTop:0 }}>{t('forgot.title')}</h2>
              <p style={{ color:C.muted, fontSize:14, marginBottom:20, lineHeight:1.6 }}>{t('forgot.description')}</p>
              {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:14, color:C.danger, fontSize:13 }}>{error}</div>}
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} onKeyDown={event => event.key === 'Enter' && handleSubmit()} placeholder={t('forgot.emailPlaceholder')} autoComplete="email" style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px', color:C.text, fontSize:15, marginBottom:12 }}/>
              <button onClick={handleSubmit} disabled={loading || !email} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#0A141A', cursor:'pointer', opacity:!email||loading?0.6:1, minHeight:50 }}>
                {loading ? t('forgot.sending') : t('forgot.submit')}
              </button>
            </>
          )}
          <p style={{ textAlign:'center', marginTop:20, color:C.muted, fontSize:13 }}>
            <Link to="/login" style={{ color:C.primary, textDecoration:'none' }}>← {t('forgot.backToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
