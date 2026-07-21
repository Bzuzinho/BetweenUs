import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { Logo } from '../lib/design'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

export default function OtpLoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setError(t('otp.invalidLink'))
      return
    }

    api.get(`/auth/otp-login?token=${encodeURIComponent(token)}`)
      .then(async response => {
        const { accessToken, refreshToken } = response.data
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken)
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        }
        await refreshUser()
        setStatus('success')
        setTimeout(() => {
          const user = response.data.user
          navigate(user?.adminRole ? '/admin' : '/explore', { replace:true })
        }, 1500)
      })
      .catch(() => {
        setStatus('error')
        setError(t('otp.invalidOrExpired'))
      })
  }, [navigate, params, refreshUser, t])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <Logo size={56} />
        </div>
        <div style={{ fontSize:24, fontWeight:500, color:C.text, marginBottom:24 }}>Between Us</div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:32 }}>
          {status === 'loading' && (
            <>
              <div style={{ fontSize:36, marginBottom:16 }}>⏳</div>
              <div style={{ fontSize:16, color:C.text }}>{t('otp.validating')}</div>
            </>
          )}
          {status === 'success' && (
            <>
              <div style={{ fontSize:36, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:500, color:C.success, marginBottom:8 }}>{t('otp.successTitle')}</div>
              <div style={{ fontSize:14, color:C.muted }}>{t('otp.redirecting')}</div>
            </>
          )}
          {status === 'error' && (
            <>
              <div style={{ fontSize:36, marginBottom:16 }}>⛔</div>
              <div style={{ fontSize:16, fontWeight:500, color:C.danger, marginBottom:8 }}>{t('otp.invalidTitle')}</div>
              <div style={{ fontSize:14, color:C.muted, marginBottom:20 }}>{error}</div>
              <button onClick={() => navigate('/login')}
                style={{ background:C.primary, border:'none', borderRadius:50, padding:'12px 24px', fontSize:14, fontWeight:500, color:'#0A141A', cursor:'pointer' }}>
                {t('otp.goToLogin')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
