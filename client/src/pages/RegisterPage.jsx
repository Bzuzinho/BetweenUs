import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0A141A', card:'#102129', input:'#0F1E26', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const BETA_CLOSED = false // toggled by BETA_CLOSED env on backend

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=account, 2=age+consent
  const [form, setForm] = useState({
    email:'', password:'', dateOfBirth:'', betaCode:'',
    termsAccepted: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({...p, [k]: v}))

  const handleSubmit = async () => {
    if (!form.dateOfBirth) return setError('Data de nascimento obrigatória.')
    if (!form.termsAccepted) return setError('Tens de aceitar os Termos de Utilização.')

    setLoading(true); setError('')
    try {
      await register({
        email: form.email,
        password: form.password,
        dateOfBirth: form.dateOfBirth,
        termsAccepted: true,
        betaCode: form.betaCode || undefined,
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
          <svg width="56" height="28" viewBox="0 0 56 28" style={{ display:'block', margin:'0 auto 12px' }}>
            <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
            <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.75"/>
          </svg>
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

              {/* Terms */}
              <div
                onClick={() => set('termsAccepted', !form.termsAccepted)}
                style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:20, cursor:'pointer' }}
              >
                <div style={{
                  width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                  background: form.termsAccepted ? C.primary : 'none',
                  border:`1.5px solid ${form.termsAccepted ? C.primary : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {form.termsAccepted && <span style={{ fontSize:11, color:'#0A141A', fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>
                  Aceito os{' '}
                  <Link to="/legal/terms" target="_blank" style={{ color:C.primary }}>Termos de Utilização</Link>
                  {' '}e a{' '}
                  <Link to="/legal/privacy" target="_blank" style={{ color:C.primary }}>Política de Privacidade</Link>.
                  Confirmo que tenho 18 anos ou mais.
                </span>
              </div>

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
