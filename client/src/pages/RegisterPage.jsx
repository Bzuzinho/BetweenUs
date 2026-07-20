import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGE_OPTIONS } from '../i18n/translations'
import { Logo } from '../lib/design'

const C = {
  bg:'#0A141A', card:'#102129', input:'#0F1E26', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', danger:'#F87171',
}

function ConsentCheckbox({ checked, onToggle, children, last }) {
  return (
    <div onClick={onToggle} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:last ? 20 : 12, cursor:'pointer' }}>
      <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1, background:checked ? C.primary : 'none', border:`1.5px solid ${checked ? C.primary : C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {checked && <span style={{ fontSize:11, color:'#0A141A', fontWeight:700 }}>✓</span>}
      </div>
      <span style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{children}</span>
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const { language, setLanguage, t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email:'', password:'', dateOfBirth:'', betaCode:'', refCode:'', preferredLanguage:language,
    termsAccepted:false, ageConfirmed:false, privacyAccepted:false, sensitiveDataAccepted:false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (key, value) => setForm(previous => ({ ...previous, [key]:value }))

  useEffect(() => {
    const storedBeta = localStorage.getItem('betaCode')
    const refFromUrl = searchParams.get('ref')
    setForm(previous => ({
      ...previous,
      ...(storedBeta && !previous.betaCode && { betaCode:storedBeta }),
      ...(refFromUrl && !previous.refCode && { refCode:refFromUrl }),
    }))
  }, [searchParams])

  const selectLanguage = value => {
    set('preferredLanguage', value)
    setLanguage(value)
  }

  const handleSubmit = async () => {
    if (!form.dateOfBirth) return setError(t('register.requiredBirthDate'))
    if (!form.ageConfirmed) return setError(t('register.requiredAge'))
    if (!form.termsAccepted) return setError(t('register.requiredTerms'))
    if (!form.privacyAccepted) return setError(t('register.requiredPrivacy'))
    if (!form.sensitiveDataAccepted) return setError(t('register.requiredSensitive'))

    setLoading(true)
    setError('')
    try {
      await register({
        email:form.email,
        password:form.password,
        dateOfBirth:form.dateOfBirth,
        preferredLanguage:form.preferredLanguage,
        termsAccepted:true,
        ageConfirmed:true,
        privacyAccepted:true,
        sensitiveDataAccepted:true,
        betaCode:form.betaCode || undefined,
        refCode:form.refCode || undefined,
      })
      navigate('/create-profile', { replace:true })
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'BETA_REQUIRED') return setError(t('register.betaRequired'))
      if (code === 'BETA_INVALID') return setError(t('register.betaInvalid'))
      setError(err.response?.data?.error || t('register.createError'))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12,
    padding:'13px 16px', color:C.text, fontSize:15, marginBottom:12, display:'block', WebkitAppearance:'none',
  }

  return (
    <div style={{ minHeight:'100vh', minHeight:'-webkit-fill-available', background:C.bg, display:'flex', flexDirection:'column', justifyContent:'center', padding:'24px 24px calc(24px + env(safe-area-inset-bottom))' }}>
      <div style={{ width:'100%', maxWidth:380, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><Logo size={56} /></div>
          <div style={{ fontSize:24, fontWeight:500, color:C.text }}>{t('register.title')}</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{t('register.subtitle')}</div>
        </div>

        <div style={{ display:'flex', gap:6, marginBottom:24 }}>
          {[1,2].map(index => <div key={index} style={{ flex:1, height:2, borderRadius:1, background:step >= index ? C.primary : C.border, transition:'background 0.3s' }} />)}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
          {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:14 }}>{error}</div>}

          {step === 1 && <>
            <h2 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:18, marginTop:0 }}>{t('register.account')}</h2>
            <label style={{ color:C.text2, fontSize:13, display:'block', marginBottom:6 }}>{t('register.chooseLanguage')}</label>
            <select style={inputStyle} value={form.preferredLanguage} onChange={event => selectLanguage(event.target.value)}>
              {LANGUAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input style={inputStyle} type="email" placeholder={t('register.email')} autoComplete="email" value={form.email} onChange={event => set('email', event.target.value)} />
            <input style={inputStyle} type="password" placeholder={t('register.password')} autoComplete="new-password" value={form.password} onChange={event => set('password', event.target.value)} />
            <input style={{ ...inputStyle, marginBottom:0 }} placeholder={t('register.inviteCode')} value={form.betaCode} onChange={event => set('betaCode', event.target.value)} />
            <button style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:500, color:'#0A141A', cursor:'pointer', marginTop:16, minHeight:50 }} onClick={() => {
              if (!form.email || !form.password) return setError(t('register.requiredCredentials'))
              if (form.password.length < 8) return setError(t('register.shortPassword'))
              setError('')
              setStep(2)
            }}>{t('common.continue')} →</button>
          </>}

          {step === 2 && <>
            <h2 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:18, marginTop:0 }}>{t('register.ageVerification')}</h2>
            <p style={{ color:C.muted, fontSize:13, marginBottom:16, lineHeight:1.5 }}>{t('register.adultsOnly')}</p>
            <label style={{ color:C.text2, fontSize:13, display:'block', marginBottom:6 }}>{t('register.birthDate')}</label>
            <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={event => set('dateOfBirth', event.target.value)} max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />

            <ConsentCheckbox checked={form.ageConfirmed} onToggle={() => set('ageConfirmed', !form.ageConfirmed)}>{t('register.ageConsent')}</ConsentCheckbox>
            <ConsentCheckbox checked={form.termsAccepted} onToggle={() => set('termsAccepted', !form.termsAccepted)}>
              {t('register.acceptTermsPrefix')} <Link to="/legal/terms" target="_blank" style={{ color:C.primary }}>{t('register.termsLink')}</Link>.
            </ConsentCheckbox>
            <ConsentCheckbox checked={form.privacyAccepted} onToggle={() => set('privacyAccepted', !form.privacyAccepted)}>
              {t('register.acceptPrivacyPrefix')} <Link to="/legal/privacy" target="_blank" style={{ color:C.primary }}>{t('register.privacyLink')}</Link>.
            </ConsentCheckbox>
            <ConsentCheckbox checked={form.sensitiveDataAccepted} onToggle={() => set('sensitiveDataAccepted', !form.sensitiveDataAccepted)} last>{t('register.acceptSensitive')}</ConsentCheckbox>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setError(''); setStep(1) }} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:13, color:C.muted, fontSize:14, minHeight:48 }}>← {t('common.back')}</button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:13, fontSize:14, fontWeight:500, color:'#0A141A', cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.7 : 1, minHeight:48 }}>{loading ? t('register.creating') : t('register.create')}</button>
            </div>
          </>}
        </div>

        <p style={{ textAlign:'center', color:C.muted, fontSize:14, marginTop:20 }}>
          {t('register.already')} <Link to="/login" style={{ color:C.primary, textDecoration:'none', fontWeight:500 }}>{t('register.login')}</Link>
        </p>
      </div>
    </div>
  )
}
