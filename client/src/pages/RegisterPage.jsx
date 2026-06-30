import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', white:'#FAF7F5', muted:'#7A6E88'
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1=email/pw, 2=beta code (only if required), 3=age/terms
  const [form, setForm] = useState({
    email:'', password:'', confirmPassword:'',
    dateOfBirth:'', termsAccepted:false,
    // Point 17: prefer the code stored by BetaJoinPage after a successful
    // /api/beta/validate/:code call; fall back to a raw ?invite= param
    betaCode: localStorage.getItem('betaCode') || searchParams.get('invite') || ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [betaRequired, setBetaRequired] = useState(false)
  const [betaChecking, setBetaChecking] = useState(false)
  const [betaValid, setBetaValid] = useState(false)

  // Point 17: validate any pre-filled code against the real public endpoint
  useEffect(() => {
    if (form.betaCode && form.betaCode.length >= 6) {
      checkBetaCode(form.betaCode)
    }
  }, [])

  const checkBetaCode = async (code) => {
    if (!code) return
    setBetaChecking(true)
    try {
      const res = await api.get(`/beta/validate/${code.toUpperCase()}`)
      setBetaValid(!!res.data.valid)
      if (res.data.valid) setBetaRequired(true)
    } catch (err) {
      setBetaValid(false)
      // A 403 with code BETA_REQUIRED-style payload is not what /validate
      // returns, but a clearly invalid/expired code still implies beta is
      // active — surface that so the field shows as required.
      if (err.response?.status === 404 || err.response?.status === 400) {
        setBetaRequired(true)
      }
    } finally {
      setBetaChecking(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (form.password !== form.confirmPassword) return setError('As passwords não coincidem.')
    if (!form.termsAccepted) return setError('Tens de aceitar os termos.')
    if (!form.dateOfBirth) return setError('Data de nascimento obrigatória.')
    setLoading(true); setError('')
    try {
      // Point 4: betaCode is sent inside register and validated/consumed
      // server-side as the single source of truth — this page never
      // "uses" the invite itself, it only forwards the code.
      const res = await register({
        email: form.email,
        password: form.password,
        dateOfBirth: form.dateOfBirth,
        termsAccepted: form.termsAccepted,
        ...(form.betaCode && { betaCode: form.betaCode.toUpperCase() })
      })
      localStorage.removeItem('betaCode')
      if (res.accessToken) {
        navigate('/create-profile')
      } else {
        navigate('/login')
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.code === 'BETA_REQUIRED') {
        setBetaRequired(true)
        setStep(2)
        setError(data.error)
      } else {
        setError(data?.error || 'Erro ao criar conta.')
      }
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width:'100%', background:colors.bgInput, border:`1.5px solid ${colors.plum}`,
    borderRadius:14, padding:'13px 16px', color:colors.white, fontSize:14,
    outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12
  }

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, display:'flex',
      alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontStyle:'italic',
            background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Between Us
          </h1>
        </div>

        <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:24, padding:28 }}>
          <div style={{ display:'flex', gap:6, marginBottom:24 }}>
            {(betaRequired ? [1,2,3] : [1,2]).map(i => (
              <div key={i} style={{ flex:1, height:3, borderRadius:2,
                background: step >= i
                  ? `linear-gradient(90deg,${colors.accent},${colors.rose})`
                  : colors.plum }} />
            ))}
          </div>

          <h2 style={{ color:colors.white, fontSize:20,
            fontFamily:"'Playfair Display',serif", marginBottom:20 }}>
            {step === 1 ? 'Criar conta'
              : betaRequired && step === 2 ? 'Código de convite'
              : 'Verificação de idade'}
          </h2>

          {error && (
            <div style={{ background:'rgba(224,92,122,0.1)',
              border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
              padding:'12px 16px', marginBottom:16, color:'#E05C7A', fontSize:13 }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <input style={inputStyle} type="email" placeholder="Email"
                value={form.email} onChange={e => set('email', e.target.value)} />
              <input style={inputStyle} type="password"
                placeholder="Password (mín. 8 caracteres)"
                value={form.password} onChange={e => set('password', e.target.value)} />
              <input style={inputStyle} type="password" placeholder="Confirmar password"
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)} />
              <button onClick={() => {
                if (!form.email || !form.password || !form.confirmPassword)
                  return setError('Preenche todos os campos.')
                if (form.password !== form.confirmPassword)
                  return setError('As passwords não coincidem.')
                if (form.password.length < 8)
                  return setError('Password deve ter pelo menos 8 caracteres.')
                setError(''); setStep(betaRequired ? 2 : 3)
              }} style={{ width:'100%',
                background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600,
                color:'#1A0A2E', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                Continuar →
              </button>
            </>
          ) : betaRequired && step === 2 ? (
            <>
              <div style={{ background:'rgba(201,149,107,0.08)', border:'1px solid rgba(201,149,107,0.2)',
                borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ color:colors.accent, fontSize:13, fontWeight:600, marginBottom:4 }}>
                  🔒 Beta fechado
                </div>
                <div style={{ color:colors.muted, fontSize:13, lineHeight:1.5 }}>
                  O Between Us está em acesso antecipado.
                  Precisas de um código de convite para criar conta.
                </div>
              </div>

              <label style={{ display:'block', color:colors.white, fontSize:13, marginBottom:6 }}>
                Código de convite
              </label>
              <div style={{ position:'relative', marginBottom:12 }}>
                <input style={{ ...inputStyle, marginBottom:0,
                  borderColor: betaValid ? '#3DD68C' : form.betaCode ? '#E05C7A55' : colors.plum,
                  paddingRight:40, textTransform:'uppercase', letterSpacing:1 }}
                  placeholder="CÓDIGO"
                  value={form.betaCode}
                  onChange={e => { set('betaCode', e.target.value.toUpperCase()); setBetaValid(false) }}
                  onBlur={() => form.betaCode && checkBetaCode(form.betaCode)}
                />
                <div style={{ position:'absolute', right:14, top:'50%',
                  transform:'translateY(-50%)', fontSize:14 }}>
                  {betaChecking ? '⏳' : betaValid ? '✅' : ''}
                </div>
              </div>

              {betaValid && (
                <div style={{ color:'#3DD68C', fontSize:13, marginBottom:12 }}>
                  ✓ Código válido! Bem-vindo ao Between Us.
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setStep(1); setError('') }}
                  style={{ flex:1, background:'none', border:`1px solid ${colors.plum}`,
                    borderRadius:50, padding:14, color:colors.muted, cursor:'pointer',
                    fontFamily:'Inter,sans-serif' }}>
                  ← Voltar
                </button>
                <button onClick={async () => {
                  if (!form.betaCode) return setError('Código de convite obrigatório.')
                  if (!betaValid) {
                    setError('')
                    await checkBetaCode(form.betaCode)
                  }
                  setError(''); setStep(3)
                }}
                  style={{ flex:2,
                    background: betaValid
                      ? `linear-gradient(135deg,${colors.accent},${colors.rose})`
                      : colors.plum,
                    border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600,
                    color: betaValid ? '#1A0A2E' : colors.muted,
                    cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  Continuar →
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color:colors.muted, fontSize:13, marginBottom:16, lineHeight:1.5 }}>
                Esta plataforma é exclusiva para maiores de 18 anos.
              </p>
              <label style={{ display:'block', color:colors.white, fontSize:13, marginBottom:6 }}>
                Data de nascimento
              </label>
              <input type="date" value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                style={{ ...inputStyle, colorScheme:'dark' }} />

              <div onClick={() => set('termsAccepted', !form.termsAccepted)}
                style={{ display:'flex', alignItems:'flex-start', gap:12,
                  marginBottom:24, cursor:'pointer' }}>
                <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:2,
                  border:`2px solid ${form.termsAccepted ? colors.accent : colors.plum}`,
                  background: form.termsAccepted ? colors.accent : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.2s' }}>
                  {form.termsAccepted && (
                    <span style={{ color:'#1A0A2E', fontSize:12, fontWeight:700 }}>✓</span>
                  )}
                </div>
                <span style={{ color:colors.muted, fontSize:13, lineHeight:1.5 }}>
                  Aceito os{' '}
                  <Link to="/legal/terms" style={{ color:colors.accent }}>Termos de Utilização</Link>{' '}
                  e a{' '}
                  <Link to="/legal/privacy" style={{ color:colors.accent }}>Política de Privacidade</Link>.
                  Confirmo que tenho 18 anos ou mais.
                </span>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(betaRequired ? 2 : 1)}
                  style={{ flex:1, background:'none',
                    border:`1px solid ${colors.plum}`, borderRadius:50,
                    padding:14, color:colors.muted, cursor:'pointer',
                    fontFamily:'Inter,sans-serif' }}>
                  ← Voltar
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ flex:2,
                    background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                    border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600,
                    color:'#1A0A2E', cursor:loading ? 'not-allowed' : 'pointer',
                    opacity:loading ? 0.7 : 1, fontFamily:'Inter,sans-serif' }}>
                  {loading ? 'A criar...' : 'Criar conta'}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:24, color:colors.muted, fontSize:14 }}>
          Já tens conta?{' '}
          <Link to="/login"
            style={{ color:colors.accent, textDecoration:'none', fontWeight:600 }}>
            Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
