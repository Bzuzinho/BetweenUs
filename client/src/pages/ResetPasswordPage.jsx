import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3', danger:'#F87171',
}

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password:'', confirm:'' })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const userId = params.get('userId')
  const token = params.get('token')

  const handleSubmit = async () => {
    if (!form.password || form.password !== form.confirm) return setError(t('reset.mismatch'))
    if (form.password.length < 8) return setError(t('reset.short'))
    if (!userId || !token) return setError(t('reset.invalidLink'))

    setLoading(true)
    setError('')
    try {
      await api.post('/auth/password/reset', { userId, token, password:form.password })
      setDone(true)
    } catch {
      setError(t('reset.resetError'))
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
          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8 }}>{t('reset.doneTitle')}</h2>
              <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>{t('reset.doneText')}</p>
              <button onClick={() => navigate('/login')} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#0A141A', cursor:'pointer' }}>{t('reset.login')}</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:20, marginTop:0 }}>{t('reset.title')}</h2>
              {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:14, color:C.danger, fontSize:13 }}>{error}</div>}
              <input type="password" placeholder={t('reset.newPassword')} autoComplete="new-password" value={form.password} onChange={event => setForm(previous => ({ ...previous, password:event.target.value }))} style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px', color:C.text, fontSize:15, marginBottom:10 }}/>
              <input type="password" placeholder={t('reset.confirmPassword')} autoComplete="new-password" value={form.confirm} onChange={event => setForm(previous => ({ ...previous, confirm:event.target.value }))} onKeyDown={event => event.key === 'Enter' && handleSubmit()} style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px', color:C.text, fontSize:15, marginBottom:14 }}/>
              <button onClick={handleSubmit} disabled={loading} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#0A141A', cursor:'pointer', opacity:loading?0.7:1, minHeight:50 }}>
                {loading ? t('reset.saving') : t('reset.submit')}
              </button>
            </>
          )}
          <p style={{ textAlign:'center', marginTop:16, color:C.muted, fontSize:13 }}>
            <Link to="/login" style={{ color:C.primary, textDecoration:'none' }}>← {t('reset.backToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
