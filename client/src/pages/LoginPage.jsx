import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const C = {
  bg: '#0E0818', card: '#1A1028', input: '#231535', plum: '#2D1B4E',
  accent: '#C9956B', rose: '#F2C4B8', lav: '#B8A9D4',
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

  const inp = {
    width: '100%',
    background: C.input,
    border: `1.5px solid ${C.plum}`,
    borderRadius: 14,
    padding: '14px 16px',
    color: C.white,
    fontSize: 16,
    marginBottom: 12,
    display: 'block',
    WebkitAppearance: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '-webkit-fill-available',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 24px calc(24px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 38,
            fontStyle: 'italic',
            fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>Between Us</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>
            Ligações adultas. Só entre nós.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.plum}`,
          borderRadius: 24,
          padding: 28,
        }}>
          <h2 style={{
            color: C.white,
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 20,
            marginTop: 0,
          }}>Entrar</h2>

          {error && (
            <div style={{
              background: 'rgba(224,92,122,0.1)',
              border: '1px solid rgba(224,92,122,0.4)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              color: '#E05C7A',
              fontSize: 14,
            }}>{error}</div>
          )}

          <input
            style={inp}
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <input
            style={inp}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
              border: 'none',
              borderRadius: 50,
              padding: '15px',
              fontSize: 16,
              fontWeight: 700,
              color: '#1A0A2E',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
              letterSpacing: 0.3,
            }}
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 24 }}>
          Não tens conta?{' '}
          <Link to="/register" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
            Registar
          </Link>
        </p>
      </div>
    </div>
  )
}
