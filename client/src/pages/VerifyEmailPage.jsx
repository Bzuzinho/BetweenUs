import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0E0818', card:'#1A1028', input:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lav:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C', red:'#E05C7A'
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error | resend
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const userId = params.get('userId')
    const token  = params.get('token')

    if (!userId || !token) {
      setStatus('resend')
      return
    }

    api.post('/auth/email/confirm', { userId, token })
      .then(() => setStatus('success'))
      .catch(err => {
        const code = err.response?.data?.error
        if (code?.includes('expirado') || code?.includes('inválido')) {
          setStatus('error')
          setMsg('Este link expirou ou já foi utilizado. Pede um novo abaixo.')
        } else {
          setStatus('error')
          setMsg(code || 'Erro ao verificar email.')
        }
      })
  }, [])

  const resendEmail = async () => {
    if (!email) return
    setResending(true)
    try {
      await api.post('/auth/email/verify', { email })
      setMsg('Email reenviado. Verifica a tua caixa de entrada.')
      setStatus('resend_sent')
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erro ao enviar email.')
    } finally {
      setResending(false)
    }
  }

  const wrap = (content) => (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontStyle:'italic', background:`linear-gradient(135deg,${C.accent},${C.rose})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 }}>Between Us</h1>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:24, padding:28 }}>
          {content}
        </div>
      </div>
    </div>
  )

  if (status === 'loading') return wrap(
    <div style={{ textAlign:'center', color:C.muted }}>A verificar...</div>
  )

  if (status === 'success') return wrap(
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.white, fontSize:22, marginBottom:8 }}>Email confirmado!</h2>
      <p style={{ color:C.lav, fontSize:14, lineHeight:1.6, marginBottom:24 }}>A tua conta está activa. Bem-vindo/a ao Between Us.</p>
      <button onClick={() => navigate('/create-profile')}
        style={{ width:'100%', background:`linear-gradient(135deg,${C.accent},${C.rose})`, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#1A0A2E', cursor:'pointer' }}>
        Completar perfil →
      </button>
    </div>
  )

  if (status === 'error') return wrap(
    <div>
      <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>⏱</div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.white, fontSize:20, marginBottom:8 }}>Link expirado</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:20, lineHeight:1.6 }}>{msg}</p>
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="O teu email"
        style={{ width:'100%', background:C.input, border:`1.5px solid ${C.plum}`, borderRadius:12, padding:'12px 14px', color:C.white, fontSize:14, marginBottom:10 }}/>
      <button onClick={resendEmail} disabled={resending || !email}
        style={{ width:'100%', background:`linear-gradient(135deg,${C.accent},${C.rose})`, border:'none', borderRadius:50, padding:13, fontSize:14, fontWeight:700, color:'#1A0A2E', cursor:'pointer', opacity:!email||resending?0.6:1 }}>
        {resending ? 'A enviar...' : 'Reenviar email de verificação'}
      </button>
    </div>
  )

  return wrap(
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.white, fontSize:20, marginBottom:8 }}>Verifica o teu email</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:20, lineHeight:1.6 }}>
        {status === 'resend_sent' ? msg : 'Introduz o teu email para receberes o link de verificação.'}
      </p>
      {status !== 'resend_sent' && (
        <>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="O teu email"
            style={{ width:'100%', background:C.input, border:`1.5px solid ${C.plum}`, borderRadius:12, padding:'12px 14px', color:C.white, fontSize:14, marginBottom:10 }}/>
          <button onClick={resendEmail} disabled={resending || !email}
            style={{ width:'100%', background:`linear-gradient(135deg,${C.accent},${C.rose})`, border:'none', borderRadius:50, padding:13, fontSize:14, fontWeight:700, color:'#1A0A2E', cursor:'pointer', opacity:!email||resending?0.6:1 }}>
            {resending ? 'A enviar...' : 'Enviar link de verificação'}
          </button>
        </>
      )}
      <p style={{ textAlign:'center', marginTop:16, color:C.muted, fontSize:13 }}>
        <Link to="/login" style={{ color:C.accent, textDecoration:'none' }}>← Voltar ao login</Link>
      </p>
    </div>
  )
}
