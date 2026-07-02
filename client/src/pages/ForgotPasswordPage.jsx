import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true); setError('')
    try {
      await api.post('/auth/password/forgot', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontStyle:'italic', background:C.primary, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 }}>Between Us</h1>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:28 }}>
          {sent ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8 }}>Email enviado</h2>
              <p style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>
                Se este email existe na nossa base de dados, receberás um link para repor a password. O link expira em 1 hora.
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8, marginTop:0 }}>Esqueceste a password?</h2>
              <p style={{ color:C.muted, fontSize:14, marginBottom:20, lineHeight:1.6 }}>Introduz o teu email e enviamos um link para repor a password.</p>
              {error && <div style={{ background:'rgba(224,92,122,0.1)', border:'1px solid rgba(224,92,122,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:14, color:'#F87171', fontSize:13 }}>{error}</div>}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="O teu email"
                style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px', color:C.text, fontSize:15, marginBottom:12 }}/>
              <button onClick={handleSubmit} disabled={loading || !email}
                style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#1A0A2E', cursor:'pointer', opacity:!email||loading?0.6:1, minHeight:50 }}>
                {loading ? 'A enviar...' : 'Enviar link'}
              </button>
            </>
          )}
          <p style={{ textAlign:'center', marginTop:20, color:C.muted, fontSize:13 }}>
            <Link to="/login" style={{ color:C.primary, textDecoration:'none' }}>← Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
