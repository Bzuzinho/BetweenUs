import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

export default function BetaJoinPage() {
  const { code: paramCode } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(paramCode?.toUpperCase() || '')
  const [validating, setValidating] = useState(!!paramCode)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (paramCode) validateCode(paramCode.toUpperCase())
  }, [])

  // Point 17: only validates via the public endpoint and stores the code
  // locally for RegisterPage to pick up. Does NOT call /api/beta/use —
  // that endpoint is deprecated; consumption happens inside /api/auth/register.
  const validateCode = async (c) => {
    setValidating(true); setError('')
    try {
      const res = await api.get(`/beta/validate/${c}`)
      if (res.data.valid) {
        setInvite(res.data)
        localStorage.setItem('betaCode', c)
      } else {
        setError(res.data.error || 'Código inválido.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Código inválido ou expirado.')
    } finally { setValidating(false) }
  }

  const handleSubmit = () => {
    if (!code.trim()) return setError('Introduz o código de convite.')
    validateCode(code.trim().toUpperCase())
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:380, width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:36,
            fontStyle:'italic', marginBottom:8,
            background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Between Us
          </h1>
          <p style={{ color:C.muted, fontSize:13, lineHeight:1.5 }}>
            Adult connections. Private by design.
          </p>
        </div>

        {invite ? (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:24, padding:28, textAlign:'center' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>✨</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              color:C.text, marginBottom:8 }}>Convite válido!</h2>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginBottom:24 }}>
              Código <strong style={{ color:C.primary }}>{invite.code}</strong> aceite.
              Cria a tua conta para entrar na beta.
            </p>
            <button onClick={() => navigate('/register')}
              style={{ width:'100%',
                background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:15, fontSize:16,
                fontWeight:700, color:'#1A0A2E', cursor:'pointer',
                fontFamily:'Inter,sans-serif' }}>
              Criar conta →
            </button>
            <p style={{ color:C.muted, fontSize:11, marginTop:12 }}>
              Já tens conta? <span style={{ color:C.primary, cursor:'pointer' }}
                onClick={() => navigate('/login')}>Entrar</span>
            </p>
          </div>
        ) : (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:24, padding:28 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
              color:C.text, marginBottom:8 }}>Acesso beta</h2>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginBottom:20 }}>
              O Between Us está em beta fechado. Precisas de um código de convite para aceder.
            </p>

            {error && (
              <div style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
                padding:'12px 16px', marginBottom:16, color:'#F87171', fontSize:13 }}>
                {error}
              </div>
            )}

            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="CÓDIGO DE CONVITE"
              style={{ width:'100%', background:C.bgInput,
                border:`1.5px solid ${C.border}`, borderRadius:14,
                padding:'14px 16px', color:C.text, fontSize:18,
                fontWeight:700, letterSpacing:4, textAlign:'center',
                outline:'none', fontFamily:'Inter,sans-serif',
                boxSizing:'border-box', marginBottom:14 }}
            />

            <button onClick={handleSubmit} disabled={validating || !code.trim()}
              style={{ width:'100%',
                background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:14, fontSize:15,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                opacity: validating || !code.trim() ? 0.7 : 1,
                fontFamily:'Inter,sans-serif' }}>
              {validating ? 'A validar...' : 'Validar código →'}
            </button>

            <p style={{ color:C.muted, fontSize:12, textAlign:'center',
              marginTop:16, lineHeight:1.5 }}>
              Não tens convite?{' '}
              <a href="mailto:hello@betweenus.app"
                style={{ color:C.primary, textDecoration:'none' }}>
                Pede acesso
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
