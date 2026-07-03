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

const Section = ({ label, children }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', padding:'0 4px', marginBottom:8 }}>{label}</div>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
      {children}
    </div>
  </div>
)

const Row = ({ to, icon, label, desc, badge, last }) => (
  <Link to={to} style={{ textDecoration:'none' }}>
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <span style={{ fontSize:18, width:26, textAlign:'center', flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, color:C.text, fontWeight:500 }}>{label}</div>
        {desc && <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{desc}</div>}
      </div>
      {badge && <span style={{ fontSize:11, background:C.primaryDim, border:`1px solid rgba(184,167,255,0.3)`, borderRadius:20, padding:'2px 10px', color:C.primary, flexShrink:0 }}>{badge}</span>}
      <span style={{ color:C.muted, fontSize:18, flexShrink:0 }}>›</span>
    </div>
  </Link>
)

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

  return (
    <div style={{ padding:'calc(20px + env(safe-area-inset-top)) 16px 32px', maxWidth:480, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:0 }}>Perfil</h1>
        <button onClick={async () => { await logout(); navigate('/login') }}
          style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 14px', color:C.muted, fontSize:13, cursor:'pointer', minHeight:36 }}>
          Sair
        </button>
      </div>

      {/* Avatar + name card */}
      <Link to="/account" style={{ textDecoration:'none' }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:18, marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:C.elevated, border:`2px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:600, color:C.primary, flexShrink:0 }}>
            {(user?.email||'?')[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:500, color:C.text, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {profile?.displayName || user?.email?.split('@')[0]}
            </div>
            <div style={{ fontSize:12, color:C.muted }}>{user?.email}</div>
            <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
              {isVerified && <span style={{ fontSize:10, background:'rgba(74,222,128,0.1)', border:`1px solid rgba(74,222,128,0.3)`, borderRadius:20, padding:'2px 8px', color:C.success }}>✓ Verificado</span>}
              {isPremium  && <span style={{ fontSize:10, background:C.primaryDim, border:`1px solid rgba(184,167,255,0.3)`, borderRadius:20, padding:'2px 8px', color:C.primary }}>✦ Plus</span>}
            </div>
          </div>
          <span style={{ color:C.muted, fontSize:18 }}>›</span>
        </div>
      </Link>

      {/* CONTA — dados privados */}
      <Section label="Conta">
        <Row to="/account"         icon="👤" label="A minha conta"         desc="Nome, email, NIF, imagem, subscrição"/>
        <Row to="/forgot-password" icon="🔑" label="Alterar password"      desc="Receber link por email" last/>
      </Section>

      {/* PERFIL — dados públicos */}
      <Section label="Perfil público">
        <Row to="/edit-profile"    icon="✏️" label="Editar perfil"          desc="Nome visível, bio, cidade, intenções"/>
        <Row to="/photos"          icon="📷" label="Fotos"                  desc="Gerir fotos e tipo de visualização"/>
        <Row to="/privacy-settings"icon="🔒" label="Privacidade"            desc="Invisível, distância, notificações"/>
        <Row to="/verify"          icon="✅" label={isVerified ? "Verificado ✓" : "Verificar perfil"} desc="Selfie de verificação"/>
        <Row to="/couple"          icon="◎"  label="Perfil de casal"        desc="Criar ou gerir perfil de casal"/>
        <Row to="/contacts/block"  icon="⊘"  label="Bloquear contactos"    desc="Ocultar-te de pessoas conhecidas" last/>
      </Section>

      {/* BETWEEN PLUS */}
      <Section label="Subscrição">
        <Row to="/premium" icon="✦" label={isPremium ? "Between Plus activo" : "Between Plus"}
          desc={isPremium && sub?.currentPeriodEnd ? `Activo até ${new Date(sub.currentPeriodEnd).toLocaleDateString('pt')}` : 'Modo invisível, Travel Mode e mais'}
          badge={isPremium ? 'Activo' : undefined} last/>
      </Section>

      {/* RGPD */}
      <div style={{ marginTop:8, padding:'12px 0', display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
        <a href="/api/auth/export" style={{ fontSize:12, color:C.muted, textDecoration:'none' }}>⬇ Exportar dados</a>
        <Link to="/legal/privacy"  style={{ fontSize:12, color:C.muted, textDecoration:'none' }}>Privacidade</Link>
        <Link to="/legal/terms"    style={{ fontSize:12, color:C.muted, textDecoration:'none' }}>Termos</Link>
      </div>
    </div>
  )
}
