import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resolvePostLoginRoute } from '../lib/postLoginRoute'
import { Logo } from '../lib/design'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  danger:'#F87171',
}

export default function LoginPage() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Clear any stale tokens on mount — prevents "Token inválido" ghost errors
  useEffect(() => {
    // If user landed here from a redirect due to expired session,
    // tokens are already cleared. Just ensure clean state.
    setError('')
  }, [])

  const handleSubmit = async () => {
    if (!form.email || !form.password) return setError(t('login.required'))
    setLoading(true); setError('')
    try {
      const me = await login(form.email, form.password)
      // BETA.2.5 — was its own third copy of the admin/profile/explore
      // if-else chain (App.jsx's RootRedirect and PublicRoute each had
      // their own too, with subtly different behavior). Single source of
      // truth now: lib/postLoginRoute.js.
      const { route } = resolvePostLoginRoute(me)
      navigate(route, { replace: true })
    } catch (err) {
      const code = err.response?.data?.code
      const msg  = err.response?.data?.error
      if (code === 'ACCOUNT_SUSPENDED') return setError(t('login.suspended'))
      if (code === 'ACCOUNT_BANNED')    return setError(t('login.banned'))
      if (msg && msg !== 'Token inválido.' && msg !== 'Não autenticado.') {
        setError(msg)
      } else {
        setError(t('login.invalid'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', minHeight:'-webkit-fill-available',
      background:C.bg, display:'flex', flexDirection:'column',
      justifyContent:'center',
      padding:'24px 24px calc(24px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width:'100%', maxWidth:420, margin:'0 auto' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <Logo size={56} />
          </div>
          <div style={{ fontSize:28, fontWeight:500, color:C.text, letterSpacing:'-0.01em' }}>Between Us</div>
          <div style={{ fontSize:14, color:C.muted, marginTop:6 }}>{t('login.tagline')}</div>
        </div>

        {/* Form card */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:32 }}>
          <h2 style={{ color:C.text, fontSize:20, fontWeight:500, marginBottom:24, marginTop:0 }}>{t('login.title')}</h2>

          {error && (
            <div style={{
              background:'rgba(248,113,113,0.08)', border:`1px solid rgba(248,113,113,0.3)`,
              borderRadius:12, padding:'11px 14px', marginBottom:20,
              color:C.danger, fontSize:14, lineHeight:1.5
            }}>
              {error}
            </div>
          )}

          <input
            type="email" placeholder={t('login.email')} autoComplete="email"
            value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))}
            onKeyDown={e => e.key==='Enter' && handleSubmit()}
            style={{
              width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
              borderRadius:12, padding:'14px 16px', color:C.text, fontSize:15,
              marginBottom:12, display:'block', WebkitAppearance:'none', outline:'none',
            }}
          />
          <input
            type="password" placeholder={t('login.password')} autoComplete="current-password"
            value={form.password} onChange={e => setForm(p => ({...p, password:e.target.value}))}
            onKeyDown={e => e.key==='Enter' && handleSubmit()}
            style={{
              width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
              borderRadius:12, padding:'14px 16px', color:C.text, fontSize:15,
              marginBottom:8, display:'block', WebkitAppearance:'none', outline:'none',
            }}
          />

          <div style={{ textAlign:'right', marginBottom:24 }}>
            <Link to="/forgot-password" style={{ color:C.muted, fontSize:13, textDecoration:'none' }}>
              {t('login.forgot')}
            </Link>
          </div>

          <button
            onClick={handleSubmit} disabled={loading}
            style={{
              width:'100%', background:C.primary, border:'none',
              borderRadius:50, padding:'15px', fontSize:15, fontWeight:500,
              color:'#0A141A', cursor:loading?'not-allowed':'pointer',
              opacity:loading?0.7:1, minHeight:52,
            }}
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </div>

        <p style={{ textAlign:'center', color:C.muted, fontSize:14, marginTop:24 }}>
          {t('login.noAccount')}{' '}
          <Link to="/register" style={{ color:C.primary, textDecoration:'none', fontWeight:500 }}>{t('login.createAccount')}</Link>
        </p>
        <p style={{ textAlign:'center', color:C.muted, fontSize:12, marginTop:12, lineHeight:1.6 }}>
          {t('login.adultConfirmation')}
        </p>
      </div>
    </div>
  )
}
