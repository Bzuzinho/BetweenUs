import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password:'', confirm:'' })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const userId = params.get('userId')
  const token  = params.get('token')

  const handleSubmit = async () => {
    if (!form.password || form.password !== form.confirm) {
      return setError('As passwords não coincidem.')
    }
    if (form.password.length < 8) return setError('A password deve ter pelo menos 8 caracteres.')
    if (!userId || !token) return setError('Link inválido.')

    setLoading(true); setError('')
    try {
      await api.post('/auth/password/reset', { userId, token, password: form.password })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao repor password.')
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
          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:8 }}>Password reposta</h2>
              <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>Podes agora entrar com a tua nova password.</p>
              <button onClick={() => navigate('/login')}
                style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#1A0A2E', cursor:'pointer' }}>
                Entrar
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.text, fontSize:20, marginBottom:20, marginTop:0 }}>Nova password</h2>
              {error && <div style={{ background:'rgba(224,92,122,0.1)', border:'1px solid rgba(224,92,122,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:14, color:'#F87171', fontSize:13 }}>{error}</div>}
              <input type="password" placeholder="Nova password (mín. 8 caracteres)"
                value={form.password} onChange={e => setForm(p => ({...p,password:e.target.value}))}
                style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px', color:C.text, fontSize:15, marginBottom:10 }}/>
              <input type="password" placeholder="Confirmar nova password"
                value={form.confirm} onChange={e => setForm(p => ({...p,confirm:e.target.value}))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 14px', color:C.text, fontSize:15, marginBottom:14 }}/>
              <button onClick={handleSubmit} disabled={loading}
                style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#1A0A2E', cursor:'pointer', opacity:loading?0.7:1, minHeight:50 }}>
                {loading ? 'A guardar...' : 'Guardar nova password'}
              </button>
            </>
          )}
          <p style={{ textAlign:'center', marginTop:16, color:C.muted, fontSize:13 }}>
            <Link to="/login" style={{ color:C.primary, textDecoration:'none' }}>← Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
