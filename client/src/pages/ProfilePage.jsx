import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
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

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) return (
    <div style={{ padding: 32, color: C.muted, textAlign: 'center' }}>A carregar...</div>
  )

  const isPremium = sub?.plan !== 'FREE' && sub?.status === 'ACTIVE'
  const isVerified = verification?.status === 'APPROVED'
  const emailVerified = !!user?.emailVerifiedAt

  return (
    <div style={{ padding: 'calc(20px + env(safe-area-inset-top)) 16px 24px', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: C.text, fontStyle: 'italic', margin: 0 }}>
          O meu perfil
        </h1>
        <button onClick={handleLogout}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 14px', color: C.muted, fontSize: 13, minHeight: 36 }}>
          Sair
        </button>
      </div>

      {/* Status banners */}
      {!emailVerified && (
        <div style={{ background: 'rgba(201,149,107,0.1)', border: `1px solid rgba(201,149,107,0.3)`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: C.primary, lineHeight: 1.5 }}>
          📧 Confirma o teu email para activar a conta.{' '}
          <Link to="/verify-email" style={{ color: C.primary, fontWeight: 700 }}>Reenviar link →</Link>
        </div>
      )}

      {/* Profile card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.input, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${C.border}` }}>
            {profile?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
              {profile?.displayName || user?.email}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {user?.email}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {isVerified && (
                <span style={{ fontSize: 10, background: 'rgba(61,214,140,0.15)', border: `1px solid ${C.green}`, borderRadius: 20, padding: '2px 8px', color: C.green }}>✓ Verificado</span>
              )}
              {isPremium && (
                <span style={{ fontSize: 10, background: 'rgba(201,149,107,0.15)', border: `1px solid ${C.primary}`, borderRadius: 20, padding: '2px 8px', color: C.primary }}>✦ Premium</span>
              )}
              {emailVerified && (
                <span style={{ fontSize: 10, background: 'rgba(61,214,140,0.1)', border: `1px solid rgba(61,214,140,0.3)`, borderRadius: 20, padding: '2px 8px', color: C.green }}>✉ Email confirmado</span>
              )}
            </div>
          </div>
        </div>

        {profile?.bio && (
          <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>{profile.bio}</p>
        )}

        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
          {profile?.city && <div>📍 {profile.city}</div>}
          {profile?.relationshipStatus && <div>💑 {profile.relationshipStatus}</div>}
          {profile?.discretionLevel && <div>🔒 {profile.discretionLevel}</div>}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { to: '/create-profile', icon: '✏️', label: 'Editar perfil',           desc: 'Nome, bio, cidade, intenções' },
          { to: '/photos',         icon: '📷', label: 'As minhas fotos',         desc: 'Gerir fotos e visibilidade' },
          { to: '/privacy-settings',icon:'🔒', label: 'Privacidade',             desc: 'Invisível, distância, notificações' },
          { to: '/verify',         icon: '✅', label: isVerified ? 'Verificado ✓' : 'Verificar perfil', desc: 'Selfie de verificação' },
          { to: '/couple',         icon: '👫', label: 'Perfil de casal',         desc: 'Criar ou gerir perfil de casal' },
          { to: '/contacts/block', icon: '🚫', label: 'Bloquear contactos',      desc: 'Ocultar-te de conhecidos' },
          { to: '/premium',        icon: '✦',  label: isPremium ? 'Premium activo' : 'Between Plus', desc: isPremium ? `Activo até ${sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt') : '—'}` : 'Modo invisível, Travel Mode e mais' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.desc}</div>
              </div>
              <span style={{ color: C.muted, fontSize: 18 }}>›</span>
            </div>
          </Link>
        ))}

        {/* RGPD */}
        <div style={{ marginTop: 8, padding: '12px 0', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <a href="/api/auth/export" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>⬇ Exportar dados</a>
          <Link to="/legal/privacy" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>Privacidade</Link>
          <Link to="/legal/terms" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>Termos</Link>
        </div>
      </div>
    </div>
  )
}
