import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavender:'#8B7BA8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

const PLAN_LABELS = { FREE:'Gratuito', PREMIUM:'Premium ✦', COUPLE_PREMIUM:'Casal Premium ✦', ELITE:'Elite ✦' }

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [photos, setPhotos] = useState([])
  const [sub, setSub] = useState(null)
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/profiles/me').then(r => setProfile(r.data)).catch(() => {}),
      api.get('/photos/me').then(r => setPhotos(r.data.photos || [])).catch(() => {}),
      api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {}),
      api.get('/verifications/me').then(r => setVerification(r.data)).catch(() => {})
    ]).finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const plan = sub?.plan || 'FREE'
  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Perfil'
  const primaryPhoto = photos.find(p => p.isPrimary) || photos[0]
  const isVerified = verification?.status === 'APPROVED'

  if (loading) return (
    <div style={{ minHeight:'100vh', background:colors.bg, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:colors.accent, fontFamily:"'Playfair Display',serif",
        fontSize:20, fontStyle:'italic' }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, paddingBottom:100 }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(180deg,#2D1B4E 0%,#0E0818 100%)',
        padding:'60px 24px 32px', textAlign:'center' }}>
        <div style={{ position:'relative', display:'inline-block', marginBottom:16 }}>
          <div style={{ width:90, height:90, borderRadius:28, overflow:'hidden',
            border:`2px solid ${colors.accent}` }}>
            {primaryPhoto ? (
              <img src={primaryPhoto.storagePath} alt=""
                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ width:'100%', height:'100%',
                background:'linear-gradient(135deg,#4D2A70,#1A0A2E)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:40 }}>🧑</div>
            )}
          </div>
          {isVerified && (
            <div style={{ position:'absolute', bottom:-4, right:-4, background:colors.green,
              borderRadius:8, padding:'2px 6px', fontSize:9,
              color:'#0A2010', fontWeight:700 }}>✓</div>
          )}
        </div>

        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
          fontWeight:700, color:colors.white, marginBottom:4 }}>{displayName}</div>
        {profile?.city && (
          <div style={{ fontSize:13, color:colors.lavender, marginBottom:4 }}>
            📍 {profile.city}
          </div>
        )}
        <div style={{ fontSize:12, color:colors.accent, marginBottom:16 }}>
          {PLAN_LABELS[plan]}
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => navigate('/create-profile')}
            style={{ background:'none', border:`1.5px solid ${colors.plum}`,
              borderRadius:50, padding:'8px 18px', color:colors.lavLight,
              cursor:'pointer', fontSize:12, fontFamily:'Inter,sans-serif' }}>
            Editar perfil
          </button>
          <button onClick={() => navigate('/photos')}
            style={{ background:'none', border:`1.5px solid ${colors.plum}`,
              borderRadius:50, padding:'8px 18px', color:colors.lavLight,
              cursor:'pointer', fontSize:12, fontFamily:'Inter,sans-serif' }}>
            📷 Fotos
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', background:colors.bgCard,
        margin:'0 16px 20px', borderRadius:16,
        border:`1px solid ${colors.plum}`, overflow:'hidden' }}>
        {[['0','Visitas'],['0','Likes'],['0','Matches']].map(([v,l],i) => (
          <div key={l} style={{ flex:1, padding:16, textAlign:'center',
            borderRight: i < 2 ? `1px solid ${colors.plum}` : 'none' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              fontWeight:700, color:colors.accent }}>{v}</div>
            <div style={{ fontSize:10, color:colors.muted, marginTop:3,
              textTransform:'uppercase', letterSpacing:0.5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ margin:'0 16px 16px', display:'grid',
        gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <button onClick={() => navigate('/couple')}
          style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:14, padding:'12px 16px', cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>💑</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>Perfil de Casal</div>
          <div style={{ fontSize:10, color:colors.muted }}>Double Consent</div>
        </button>
        <button onClick={() => navigate('/verify')}
          style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:14, padding:'12px 16px', cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>
            {isVerified ? '✅' : '🤳'}
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>
            {isVerified ? 'Verificado' : 'Verificar perfil'}
          </div>
          <div style={{ fontSize:10, color:colors.muted }}>
            {isVerified ? 'Selo ativo' : 'Selfie + gesto'}
          </div>
        </button>
        <button onClick={() => navigate('/privacy-settings')}
          style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:14, padding:'12px 16px', cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>🔒</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>Privacidade</div>
          <div style={{ fontSize:10, color:colors.muted }}>Modo discreto</div>
        </button>
        <button onClick={() => navigate('/contacts/block')}
          style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:14, padding:'12px 16px', cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>🚫</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>Bloquear contactos</div>
          <div style={{ fontSize:10, color:colors.muted }}>HMAC seguro</div>
        </button>
      </div>

      {/* Bio & intentions */}
      {profile?.bio && (
        <div style={{ margin:'0 16px 16px', background:colors.bgCard,
          border:`1px solid ${colors.plum}`, borderRadius:16, padding:18 }}>
          <div style={{ fontSize:11, color:colors.muted, textTransform:'uppercase',
            letterSpacing:1, fontWeight:600, marginBottom:10 }}>Sobre mim</div>
          <p style={{ color:colors.lavLight, fontSize:14,
            lineHeight:1.6, marginBottom:12 }}>{profile.bio}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {profile.intentions?.map(pi => (
              <span key={pi.id} style={{ background:'rgba(139,123,168,0.15)',
                border:'1px solid rgba(139,123,168,0.3)', borderRadius:20,
                padding:'4px 10px', fontSize:11, color:colors.lavLight }}>
                {pi.intention?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status do perfil */}
      {profile?.status && profile.status !== 'APPROVED' && (
        <div style={{ margin:'0 16px 16px', background:'rgba(201,149,107,0.08)',
          border:'1px solid rgba(201,149,107,0.2)', borderRadius:14, padding:14 }}>
          <div style={{ fontSize:12, color:colors.accent }}>
            {profile.status === 'PENDING_REVIEW' && '⏳ O teu perfil está em revisão. Aparece no discovery após aprovação.'}
            {profile.status === 'REJECTED' && '❌ O teu perfil foi rejeitado. Edita e submete novamente.'}
          </div>
        </div>
      )}

      {/* Premium */}
      {plan === 'FREE' && (
        <div style={{ margin:'0 16px 16px',
          background:'linear-gradient(135deg,#2D1B4E,#1A0A40)',
          border:'1px solid rgba(201,149,107,0.4)', borderRadius:20,
          padding:20, textAlign:'center' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
            fontWeight:700, marginBottom:10,
            background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            ✦ Between Premium
          </div>
          <button onClick={() => navigate('/premium')}
            style={{ background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
              border:'none', borderRadius:50, padding:'13px 32px', fontSize:14,
              fontWeight:700, color:'#1A0A2E', cursor:'pointer', width:'100%' }}>
            Ir Premium — €9,99/mês
          </button>
        </div>
      )}

      {/* Logout */}
      <div style={{ margin:'0 16px 16px' }}>
        <button onClick={handleLogout}
          style={{ width:'100%', background:'none',
            border:'1px solid rgba(224,92,122,0.3)', borderRadius:14,
            padding:14, color:'#E05C7A', cursor:'pointer', fontSize:14,
            fontFamily:'Inter,sans-serif' }}>
          Terminar sessão
        </button>
      </div>
    </div>
  )
}
