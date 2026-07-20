import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { Logo } from '../lib/design'

const C = {
  bg:'#0A141A', card:'#102129', input:'#0F1E26', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const BETA_CLOSED = false // toggled by BETA_CLOSED env on backend

// BETA.3 — one explicit, independently-toggleable, unchecked-by-default
// checkbox per RGPD consent purpose (age/terms/privacy/sensitive-data).
// Extracted so step 2 doesn't repeat the same markup four times.
function ConsentCheckbox({ checked, onToggle, children, last }) {
  return (
    <div
      onClick={onToggle}
      style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom: last ? 20 : 12, cursor:'pointer' }}
    >
      <div style={{
        width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
        background: checked ? C.primary : 'none',
        border:`1.5px solid ${checked ? C.primary : C.border}`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {checked && <span style={{ fontSize:11, color:'#0A141A', fontWeight:700 }}>✓</span>}
      </div>
      <span style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{children}</span>
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1=account, 2=age+consent
  const [form, setForm] = useState({
    email:'', password:'', dateOfBirth:'', betaCode:'', refCode:'',
    // BETA.3 fix — these three used to not exist on the form at all, so
    // the wizard's single "aceito tudo" checkbox only ever sent
    // termsAccepted; the backend silently accepted the missing fields
    // (see server/src/routes/auth.ts's registerSchema, BETA.2 comment).
    // Now each RGPD consent is its own explicit, unchecked-by-default
    // checkbox — see step 2 below.
    termsAccepted: false,
    ageConfirmed: false,
    privacyAccepted: false,
    sensitiveDataAccepted: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({...p, [k]: v}))

  // Sprint 4: pick up the invite code stored by BetaJoinPage, and a referral
  // code from the URL (?ref=CODE) if the person arrived via a shared invite link.
  useEffect(() => {
    const storedBeta = localStorage.getItem('betaCode')
    const refFromUrl = searchParams.get('ref')
    setForm(p => ({
      ...p,
      ...(storedBeta && !p.betaCode && { betaCode: storedBeta }),
      ...(refFromUrl && !p.refCode && { refCode: refFromUrl }),
    }))
  }, [])

  const handleSubmit = async () => {
    if (!form.dateOfBirth) return setError('Data de nascimento obrigatória.')
    if (!form.ageConfirmed) return setError('Tens de confirmar que tens pelo menos 18 anos.')
    if (!form.termsAccepted) return setError('Tens de aceitar os Termos de Utilização.')
    if (!form.privacyAccepted) return setError('Tens de aceitar a Política de Privacidade.')
    if (!form.sensitiveDataAccepted) return setError('Tens de aceitar o tratamento de dados sensíveis.')

    setLoading(true); setError('')
    try {
      await register({
        email: form.email,
        password: form.password,
        dateOfBirth: form.dateOfBirth,
        termsAccepted: true,
        ageConfirmed: true,
        privacyAccepted: true,
        sensitiveDataAccepted: true,
        betaCode: form.betaCode || undefined,
        refCode: form.refCode || undefined,
      })
      navigate('/create-profile', { replace: true })
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'BETA_REQUIRED') return setError('O Between Us está em beta fechado. Precisas de um código de convite.')
      if (code === 'BETA_INVALID')  return setError('Código de convite inválido ou expirado.')
      setError(err.response?.data?.error || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
    borderRadius:12, padding:'13px 16px', color:C.text, fontSize:15,
    marginBottom:12, display:'block', WebkitAppearance:'none',
  }

  return (
    <div style={{
      minHeight:'100vh', minHeight:'-webkit-fill-available',
      background:C.bg,
      display:'flex', flexDirection:'column', justifyContent:'center',
      padding:'24px 24px calc(24px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width:'100%', maxWidth:380, margin:'0 auto' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
            <Logo size={56} />
          </div>
          <div style={{ fontSize:24, fontWeight:500, color:C.text }}>Criar conta</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Privacidade por defeito. Consentimento primeiro.</div>
        </div>

        {/* Progress */}
        <div style={{ display:'flex', gap:6, marginBottom:24 }}>
          {[1,2].map(i => (
            <div key={i} style={{
              flex:1, height:2, borderRadius:1,
              background: step >= i ? C.primary : C.border,
              transition:'background 0.3s',
            }} />
          ))}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>

          {error && (
            <div style={{ background:'rgba(248,113,113,0.08)', border:`1px solid rgba(248,113,113,0.25)`, borderRadius:10, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:14 }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <h2 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:18, marginTop:0 }}>A tua conta</h2>
              <input style={inp} type="email" placeholder="Email" autoComplete="email"
                value={form.email} onChange={e => set('email', e.target.value)} />
              <input style={inp} type="password" placeholder="Password (mín. 8 caracteres)" autoComplete="new-password"
                value={form.password} onChange={e => set('password', e.target.value)} />
              <input style={{...inp, marginBottom:0}} placeholder="Código de convite (se necessário)"
                value={form.betaCode} onChange={e => set('betaCode', e.target.value)} />
              <button
                style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:500, color:'#0A141A', cursor:'pointer', marginTop:16, minHeight:50 }}
                onClick={() => {
                  if (!form.email || !form.password) return setError('Email e password obrigatórios.')
                  if (form.password.length < 8) return setError('A password deve ter pelo menos 8 caracteres.')
                  setError(''); setStep(2)
                }}>
                Continuar →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:18, marginTop:0 }}>Verificação de idade</h2>
              <p style={{ color:C.muted, fontSize:13, marginBottom:16, lineHeight:1.5 }}>
                Esta plataforma é exclusiva para maiores de 18 anos.
              </p>

              <label style={{ color:C.text2, fontSize:13, display:'block', marginBottom:6 }}>Data de nascimento</label>
              <input
                style={inp}
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />

              {/* BETA.3 fix — was a single bundled checkbox (terms + age,
                  privacy/sensitive-data consent never actually collected).
                  RGPD requires separate, explicit, opt-in consent per
                  purpose (see docs/legal/CONSENT_POLICY.md) — four
                  independent checkboxes, none pre-selected. */}
              <ConsentCheckbox
                checked={form.ageConfirmed}
                onToggle={() => set('ageConfirmed', !form.ageConfirmed)}
              >
                Tenho 18 anos ou mais.
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={form.termsAccepted}
                onToggle={() => set('termsAccepted', !form.termsAccepted)}
              >
                Aceito os{' '}
                <Link to="/legal/terms" target="_blank" style={{ color:C.primary }}>Termos de Utilização</Link>.
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={form.privacyAccepted}
                onToggle={() => set('privacyAccepted', !form.privacyAccepted)}
              >
                Aceito a{' '}
                <Link to="/legal/privacy" target="_blank" style={{ color:C.primary }}>Política de Privacidade</Link>.
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={form.sensitiveDataAccepted}
                onToggle={() => set('sensitiveDataAccepted', !form.sensitiveDataAccepted)}
                last
              >
                Aceito o tratamento de dados sensíveis necessário ao serviço
                (orientação, estado de relação, intenções) — ver{' '}
                <Link to="/legal/privacy" target="_blank" style={{ color:C.primary }}>Política de Privacidade</Link>.
              </ConsentCheckbox>

              <div style={{ display:'flex', gap:10 }}>
                <button
                  onClick={() => { setError(''); setStep(1) }}
                  style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:13, color:C.muted, fontSize:14, minHeight:48 }}>
                  ← Voltar
                </button>
                <button
                  onClick={handleSubmit} disabled={loading}
                  style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:13, fontSize:14, fontWeight:500, color:'#0A141A', cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, minHeight:48 }}>
                  {loading ? 'A criar…' : 'Criar conta'}
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign:'center', color:C.muted, fontSize:14, marginTop:20 }}>
          Já tens conta?{' '}
          <Link to="/login" style={{ color:C.primary, textDecoration:'none', fontWeight:500 }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
