import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', danger:'#F87171',
}

export default function VerifyEmailPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const userId = params.get('userId')
    const token = params.get('token')
    if (!userId || !token) {
      setStatus('resend')
      return
    }

    api.post('/auth/email/confirm', { userId, token })
      .then(() => setStatus('success'))
      .catch(() => {
        setStatus('error')
        setMsg(t('emailVerify.expiredText'))
      })
  }, [params, t])

  const resendEmail = async () => {
    if (!email) return
    setResending(true)
    try {
      await api.post('/auth/email/verify', { email })
      setMsg(t('emailVerify.sent'))
      setStatus('resend_sent')
    } catch {
      setMsg(t('emailVerify.sendError'))
    } finally {
      setResending(false)
    }
  }

  const wrap = content => (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontStyle:'italic', background:C.primary, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 }}>Between Us</h1>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:28 }}>{content}</div>
      </div>
    </div>
  )

  if (status === 'loading') return wrap(<div style={{ textAlign:'center', color:C.muted }}>{t('emailVerify.loading')}</div>)

  if (status === 'success') return wrap(
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:22, marginBottom:8 }}>{t('emailVerify.successTitle')}</h2>
      <p style={{ color:C.text2, fontSize:14, lineHeight:1.6, marginBottom:24 }}>{t('emailVerify.successText')}</p>
      <button onClick={() => navigate('/create-profile')} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#0A141A', cursor:'pointer' }}>{t('emailVerify.completeProfile')} →</button>
    </div>
  )

  const form = (
    <>
      <input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" placeholder={t('emailVerify.emailPlaceholder')} style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, fontSize:14, marginBottom:10 }}/>
      <button onClick={resendEmail} disabled={resending || !email} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:13, fontSize:14, fontWeight:700, color:'#0A141A', cursor:'pointer', opacity:!email||resending?0.6:1 }}>
        {resending ? t('emailVerify.sending') : status === 'error' ? t('emailVerify.resend') : t('emailVerify.send')}
      </button>
    </>
  )

  if (status === 'error') return wrap(
    <div>
      <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>⏱</div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8 }}>{t('emailVerify.expiredTitle')}</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:20, lineHeight:1.6 }}>{msg}</p>
      {form}
    </div>
  )

  return wrap(
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8 }}>{t('emailVerify.title')}</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:20, lineHeight:1.6 }}>{status === 'resend_sent' ? msg : t('emailVerify.description')}</p>
      {status !== 'resend_sent' && form}
      <p style={{ textAlign:'center', marginTop:16, color:C.muted, fontSize:13 }}>
        <Link to="/login" style={{ color:C.primary, textDecoration:'none' }}>← {t('emailVerify.back')}</Link>
      </p>
    </div>
  )
}
