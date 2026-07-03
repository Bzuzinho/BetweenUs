import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sub, setSub] = useState(null)
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/profiles/me').then(r => setProfile(r.data)).catch(() => {}),
      api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {}),
      api.get('/verifications/me').then(r => setVerification(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding:32, color:C.muted, textAlign:'center' }}>A carregar...</div>

  const isPremium = sub?.plan !== 'FREE' && sub?.status === 'ACTIVE'
  const isVerified = verification?.status === 'APPROVED'
  const emailVerified = !!user?.emailVerifiedAt

  const LINKS = [
    { to:'/edit-profile',    icon:'✏️', label:'Editar perfil',    desc:'Nome, bio, cidade, intenções' },
    { to:'/photos',          icon:'📷', label:'As minhas fotos',  desc:'Gerir fotos e visibilidade' },
    { to:'/privacy-settings',icon:'🔒', label:'Privacidade',      desc:'Invisível, distância, notificações' },
    { to:'/verify',          icon:'✅', label: isVerified ? 'Perfil verificado ✓' : 'Verificar perfil', desc:'Selfie de verificação' },
    { to:'/couple',          icon:'◎',  label:'Perfil de casal',  desc:'Criar ou gerir perfil de casal' },
    { to:'/contacts/block',  icon:'⊘',  label:'Bloquear contactos', desc:'Ocultar-te de pessoas conhecidas' },
    {
      to:'/premium', icon:'✦',
      label: isPremium ? 'Between Plus activo' : 'Between Plus',
      desc: isPremium
        ? `Activo${sub?.currentPeriodEnd ? ' até ' + new Date(sub.currentPeriodEnd).toLocaleDateString('pt') : ''}`
        : 'Modo invisível, Travel Mode e mais',
    },
  ]

  return (
    <div style={{ padding:'calc(20px + env(safe-area-inset-top)) 16px 32px', maxWidth:480, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:0 }}>O meu perfil</h1>
        <button onClick={async () => { await logout(); navigate('/login') }}
          style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 14px', color:C.muted, fontSize:13, minHeight:36 }}>
          Sair
        </button>
      </div>

      {/* Email not verified */}
      {!emailVerified && (
        <div style={{ background:'rgba(184,167,255,0.08)', border:`1px solid rgba(184,167,255,0.25)`, borderRadius:12, padding:'12px 14px', marginBottom:12, fontSize:13, color:C.primary, lineHeight:1.5 }}>
          📧 Confirma o teu email para activar todas as funcionalidades.{' '}
          <Link to="/verify-email" style={{ color:C.primary, fontWeight:600 }}>Reenviar link →</Link>
        </div>
      )}

      {/* Profile card */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom: profile?.bio ? 14 : 0 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:C.elevated, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:C.text2, flexShrink:0 }}>
            {profile?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:500, color:C.text, marginBottom:2 }}>
              {profile?.displayName || user?.email}
            </div>
            <div style={{ fontSize:12, color:C.muted }}>{user?.email}</div>
            <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
              {emailVerified && <span style={{ fontSize:10, background:'rgba(74,222,128,0.1)', border:`1px solid rgba(74,222,128,0.3)`, borderRadius:20, padding:'2px 8px', color:C.success }}>✉ Email confirmado</span>}
              {isVerified    && <span style={{ fontSize:10, background:'rgba(74,222,128,0.1)', border:`1px solid rgba(74,222,128,0.3)`, borderRadius:20, padding:'2px 8px', color:C.success }}>✓ Verificado</span>}
              {isPremium     && <span style={{ fontSize:10, background:C.primaryDim, border:`1px solid rgba(184,167,255,0.3)`, borderRadius:20, padding:'2px 8px', color:C.primary }}>✦ Plus</span>}
            </div>
          </div>
        </div>
        {profile?.bio && (
          <p style={{ fontSize:13, color:C.text2, lineHeight:1.6, margin:'12px 0 10px', borderTop:`1px solid ${C.border}`, paddingTop:12 }}>{profile.bio}</p>
        )}
        {(profile?.city || profile?.relationshipStatus) && (
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
            {profile?.city && <div>📍 {profile.city}</div>}
            {profile?.relationshipStatus && <div>💑 {profile.relationshipStatus}</div>}
            {profile?.discretionLevel    && <div>🔒 {profile.discretionLevel}</div>}
          </div>
        )}
      </div>

      {/* Links */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration:'none' }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:20, width:28, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, color:C.text, fontWeight:500 }}>{item.label}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.desc}</div>
              </div>
              <span style={{ color:C.muted, fontSize:18 }}>›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* RGPD */}
      <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${C.border}`, display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
        <a href="/api/auth/export" style={{ fontSize:12, color:C.muted, textDecoration:'none' }}>⬇ Exportar dados</a>
        <Link to="/legal/privacy" style={{ fontSize:12, color:C.muted, textDecoration:'none' }}>Privacidade</Link>
        <Link to="/legal/terms"   style={{ fontSize:12, color:C.muted, textDecoration:'none' }}>Termos</Link>
      </div>
    </div>
  )
}
