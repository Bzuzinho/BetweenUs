import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

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
  const { t } = useI18n()
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
      await api.post(`/couples/join/${token}`)
      sessionStorage.removeItem('pendingCoupleInvite')
      await refreshUser()
      setStatus('success')
      setMessage(t('coupleInvite.successMessage'))
    } catch (error) {
      const code = error.response?.data?.code
      if (code === 'INDIVIDUAL_PROFILE_REQUIRED') {
        navigate(`/create-profile?coupleInvite=${encodeURIComponent(token)}`, { replace:true })
        return
      }
      setStatus('error')
      setMessage(t('coupleInvite.acceptError'))
    }
  }

  const decline = () => {
    sessionStorage.removeItem('pendingCoupleInvite')
    navigate(user ? '/explore' : '/login', { replace:true })
  }

  if (loading) return <InviteShell><p style={{color:C.muted}}>{t('coupleInvite.validating')}</p></InviteShell>

  if (!user) {
    return (
      <InviteShell>
        <div style={{fontSize:46, marginBottom:14}}>💑</div>
        <h1 style={{color:C.text, fontSize:25, margin:'0 0 10px'}}>{t('coupleInvite.titleGuest')}</h1>
        <p style={{color:C.text2, fontSize:14, lineHeight:1.65, margin:'0 0 22px'}}>{t('coupleInvite.guestHelp')}</p>
        <div style={{display:'grid', gap:10}}>
          <Link to="/login" style={{...button, background:C.primary, color:'#160C25'}}>{t('coupleInvite.login')}</Link>
          <Link to="/register" style={{...button, background:'transparent', color:C.text, border:`1px solid ${C.border}`}}>{t('coupleInvite.register')}</Link>
        </div>
      </InviteShell>
    )
  }

  if (!user.profile) return <InviteShell><p style={{color:C.muted}}>{t('coupleInvite.redirectingProfile')}</p></InviteShell>

  return (
    <InviteShell>
      <div style={{fontSize:48, marginBottom:14}}>{status === 'success' ? '✅' : status === 'error' ? '⚠️' : '💑'}</div>
      <h1 style={{color:C.text, fontSize:25, margin:'0 0 10px'}}>
        {status === 'success' ? t('coupleInvite.activatedTitle') : t('coupleInvite.confirmTitle')}
      </h1>
      {status === 'ready' && <>
        <p style={{color:C.text2, fontSize:14, lineHeight:1.65}}>{t('coupleInvite.readyHelp')}</p>
        <p style={{color:C.muted, fontSize:12, lineHeight:1.6, marginBottom:22}}>{t('coupleInvite.invitedEmailOnly')}</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <button onClick={decline} style={{...button, background:'transparent', color:C.text2, border:`1px solid ${C.border}`}}>{t('coupleInvite.later')}</button>
          <button onClick={accept} style={{...button, background:C.primary, color:'#160C25'}}>{t('coupleInvite.accept')}</button>
        </div>
      </>}
      {status === 'loading' && <p style={{color:C.muted}}>{t('coupleInvite.confirming')}</p>}
      {(status === 'success' || status === 'error') && <>
        <p style={{color:status === 'success' ? C.success : C.danger, fontSize:14, lineHeight:1.6}}>{message}</p>
        <button onClick={() => navigate(status === 'success' ? '/couple' : '/explore')} style={{...button, width:'100%', background:C.primary, color:'#160C25', marginTop:12}}>
          {status === 'success' ? t('coupleInvite.openCouple') : t('coupleInvite.backApp')}
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
