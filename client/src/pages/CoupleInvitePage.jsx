import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171'
}

const button = {
  border:'none', borderRadius:50, padding:'13px 24px', fontSize:14,
  fontWeight:600, cursor:'pointer', textDecoration:'none', textAlign:'center'
}

export default function CoupleInvitePage() {
  const { token } = useParams()
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('ready')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) sessionStorage.setItem('pendingCoupleInvite', token)
  }, [token])

  useEffect(() => {
    if (loading || !user) return
    if (!user.profile) {
      navigate(`/create-profile?coupleInvite=${encodeURIComponent(token)}`, { replace:true })
    }
  }, [loading, user, token, navigate])

  const accept = async () => {
    setStatus('loading')
    setMessage('')
    try {
      const response = await api.post(`/couples/join/${token}`)
      sessionStorage.removeItem('pendingCoupleInvite')
      await refreshUser()
      setStatus('success')
      setMessage(response.data.message || 'Perfil de casal ativado com sucesso.')
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'INDIVIDUAL_PROFILE_REQUIRED') {
        navigate(`/create-profile?coupleInvite=${encodeURIComponent(token)}`, { replace:true })
        return
      }
      setStatus('error')
      setMessage(err.response?.data?.error || 'Não foi possível aceitar este convite.')
    }
  }

  const decline = () => {
    sessionStorage.removeItem('pendingCoupleInvite')
    navigate(user ? '/explore' : '/login', { replace:true })
  }

  if (loading) return <InviteShell><p style={{color:C.muted}}>A validar o convite…</p></InviteShell>

  if (!user) {
    return (
      <InviteShell>
        <div style={{fontSize:46, marginBottom:14}}>💑</div>
        <h1 style={{color:C.text, fontSize:25, margin:'0 0 10px'}}>Recebeste um convite de casal</h1>
        <p style={{color:C.text2, fontSize:14, lineHeight:1.65, margin:'0 0 22px'}}>
          Para proteger a identidade de ambos, entra na tua conta ou cria primeiro uma conta individual com o email para o qual recebeste o convite.
        </p>
        <div style={{display:'grid', gap:10}}>
          <Link to="/login" style={{...button, background:C.primary, color:'#160C25'}}>Entrar na minha conta</Link>
          <Link to="/register" style={{...button, background:'transparent', color:C.text, border:`1px solid ${C.border}`}}>Criar conta individual</Link>
        </div>
      </InviteShell>
    )
  }

  if (!user.profile) return <InviteShell><p style={{color:C.muted}}>A encaminhar para a criação do teu perfil individual…</p></InviteShell>

  return (
    <InviteShell>
      <div style={{fontSize:48, marginBottom:14}}>{status === 'success' ? '✅' : status === 'error' ? '⚠️' : '💑'}</div>
      <h1 style={{color:C.text, fontSize:25, margin:'0 0 10px'}}>
        {status === 'success' ? 'Perfil de casal ativado' : 'Confirmar associação ao perfil de casal'}
      </h1>
      {status === 'ready' && <>
        <p style={{color:C.text2, fontSize:14, lineHeight:1.65}}>
          O perfil de casal já foi criado pelo teu parceiro. Ao aceitares, o teu perfil individual continua separado e passas também a ser membro deste perfil partilhado.
        </p>
        <p style={{color:C.muted, fontSize:12, lineHeight:1.6, marginBottom:22}}>
          A aceitação só é permitida à conta individual associada ao endereço de email convidado.
        </p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <button onClick={decline} style={{...button, background:'transparent', color:C.text2, border:`1px solid ${C.border}`}}>Agora não</button>
          <button onClick={accept} style={{...button, background:C.primary, color:'#160C25'}}>Aceitar convite</button>
        </div>
      </>}
      {status === 'loading' && <p style={{color:C.muted}}>A confirmar a tua associação…</p>}
      {(status === 'success' || status === 'error') && <>
        <p style={{color:status === 'success' ? C.success : C.danger, fontSize:14, lineHeight:1.6}}>{message}</p>
        <button onClick={() => navigate(status === 'success' ? '/couple' : '/explore')} style={{...button, width:'100%', background:C.primary, color:'#160C25', marginTop:12}}>
          {status === 'success' ? 'Abrir perfil de casal' : 'Voltar à aplicação'}
        </button>
      </>}
    </InviteShell>
  )
}

function InviteShell({ children }) {
  return (
    <div style={{minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24}}>
      <main style={{maxWidth:430, width:'100%', background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:28, textAlign:'center', boxShadow:'0 24px 70px rgba(0,0,0,.35)'}}>
        {children}
      </main>
    </div>
  )
}