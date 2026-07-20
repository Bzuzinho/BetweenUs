import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

export default function BetaJoinPage() {
  const { code:paramCode } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [code, setCode] = useState(paramCode?.toUpperCase() || '')
  const [validating, setValidating] = useState(!!paramCode)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')

  const validateCode = async value => {
    setValidating(true)
    setError('')
    try {
      const response = await api.get(`/beta/validate/${value}`)
      if (response.data.valid) {
        setInvite(response.data)
        localStorage.setItem('betaCode', value)
      } else {
        setError(t('beta.invalidCode'))
      }
    } catch {
      setError(t('beta.invalidOrExpired'))
    } finally {
      setValidating(false)
    }
  }

  useEffect(() => {
    if (paramCode) validateCode(paramCode.toUpperCase())
  }, [paramCode])

  const submit = () => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return setError(t('beta.codeRequired'))
    validateCode(normalized)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:380, width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontStyle:'italic', marginBottom:8, color:C.primary }}>
            Between Us
          </h1>
          <p style={{ color:C.muted, fontSize:13, lineHeight:1.5 }}>{t('beta.tagline')}</p>
        </div>

        {invite ? (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:28, textAlign:'center' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>✨</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text, marginBottom:8 }}>{t('beta.validTitle')}</h2>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginBottom:24 }}>
              {t('beta.acceptedPrefix')} <strong style={{ color:C.primary }}>{invite.code}</strong> {t('beta.acceptedSuffix')}
            </p>
            <button onClick={() => navigate('/register')}
              style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:15, fontSize:16, fontWeight:700, color:'#1A0A2E', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
              {t('beta.createAccount')}
            </button>
            <p style={{ color:C.muted, fontSize:11, marginTop:12 }}>
              {t('beta.alreadyAccount')} <button type="button" onClick={() => navigate('/login')} style={{ background:'none', border:'none', color:C.primary, cursor:'pointer', padding:0 }}>{t('beta.signIn')}</button>
            </p>
          </div>
        ) : (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:28 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, marginBottom:8 }}>{t('beta.title')}</h2>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginBottom:20 }}>{t('beta.description')}</p>

            {error && (
              <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.3)', borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.danger, fontSize:13 }}>
                {error}
              </div>
            )}

            <input
              value={code}
              onChange={event => setCode(event.target.value.toUpperCase())}
              onKeyDown={event => event.key === 'Enter' && submit()}
              placeholder={t('beta.placeholder')}
              aria-label={t('beta.placeholder')}
              style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'14px 16px', color:C.text, fontSize:18, fontWeight:700, letterSpacing:4, textAlign:'center', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:14 }}
            />

            <button onClick={submit} disabled={validating || !code.trim()}
              style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:validating || !code.trim() ? 'not-allowed' : 'pointer', opacity:validating || !code.trim() ? 0.7 : 1, fontFamily:'Inter,sans-serif' }}>
              {validating ? t('beta.validating') : t('beta.validate')}
            </button>

            <p style={{ color:C.muted, fontSize:12, textAlign:'center', marginTop:16, lineHeight:1.5 }}>
              {t('beta.noInvite')} <a href="mailto:hello@betweenus.app" style={{ color:C.primary, textDecoration:'none' }}>{t('beta.requestAccess')}</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
