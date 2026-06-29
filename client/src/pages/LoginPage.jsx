import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const colors = {
  bg: '#0E0818', bgCard: '#1A1028', plum: '#2D1B4E',
  accent: '#C9956B', rose: '#F2C4B8', lavLight: '#B8A9D4',
  white: '#FAF7F5', muted: '#7A6E88'
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.email || !form.password) return setError('Preenche todos os campos.')
    setLoading(true); setError('')
    try {
      await login(form.email, form.password)
      navigate('/explore')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao entrar. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontStyle:'italic',
            background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>
            Between Us
          </h1>
          <p style={{ color:colors.muted, fontSize:13, letterSpacing:1.5, textTransform:'uppercase' }}>
            Adult connections. Private by design.
          </p>
        </div>

        <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`, borderRadius:24, padding:28 }}>
          <h2 style={{ color:colors.white, fontSize:20, fontWeight:600, marginBottom:24, fontFamily:"'Playfair Display',serif" }}>
            Entrar
          </h2>

          {error && (
            <div style={{ background:'rgba(224,92,122,0.1)', border:'1px solid rgba(224,92,122,0.3)',
              borderRadius:12, padding:'12px 16px', marginBottom:16, color:'#E05C7A', fontSize:13 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={{ width:'100%', background:'#231535', border:`1.5px solid ${colors.plum}`,
                borderRadius:14, padding:'13px 16px', color:colors.white, fontSize:14,
                outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div style={{ marginBottom:20 }}>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              style={{ width:'100%', background:'#231535', border:`1.5px solid ${colors.plum}`,
                borderRadius:14, padding:'13px 16px', color:colors.white, fontSize:14,
                outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width:'100%', background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
              border:'none', borderRadius:50, padding:'14px', fontSize:15, fontWeight:600,
              color:'#1A0A2E', cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1,
              fontFamily:'Inter,sans-serif', transition:'all 0.2s' }}>
            {loading ? 'A entrar...' : 'Entrar'}
          </button>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <Link to="/forgot-password" style={{ color:colors.muted, fontSize:13, textDecoration:'none' }}>
              Esqueceste a password?
            </Link>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:24, color:colors.muted, fontSize:14 }}>
          Não tens conta?{' '}
          <Link to="/register" style={{ color:colors.accent, textDecoration:'none', fontWeight:600 }}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  )
}
