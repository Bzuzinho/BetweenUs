import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavender:'#8B7BA8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

const PLAN_LABELS = {
  FREE:'Gratuito', PREMIUM:'Premium ✦',
  COUPLE_PREMIUM:'Casal Premium ✦', ELITE:'Elite ✦'
}

function Toggle({ on, onChange, label, sub, disabled }) {
  return (
    <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
      borderRadius:14, padding:'14px 16px', display:'flex',
      alignItems:'center', gap:14, marginBottom:8, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:500, color:colors.white }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:colors.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={() => !disabled && onChange(!on)}
        style={{ width:44, height:24, borderRadius:12, position:'relative',
          background: on ? colors.accent : colors.plum,
          cursor: disabled ? 'not-allowed' : 'pointer', transition:'background 0.3s',
          flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, width:18, height:18,
          background:'white', borderRadius:'50%', transition:'transform 0.3s',
          transform: on ? 'translateX(23px)' : 'translateX(3px)' }} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [photos, setPhotos] = useState([])
  const [privacy, setPrivacy] = useState({})
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/profiles/me').then(r => setProfile(r.data)).catch(() => {}),
      api.get('/photos/me').then(r => setPhotos(r.data.photos || [])).catch(() => {}),
      api.get('/privacy').then(r => setPrivacy(r.data)).catch(() => {}),
      api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {})
    ]).finally(() => setLoading(false))
  }, [])

  const updatePrivacy = async (key, val) => {
    const updated = { ...privacy, [key]: val }
    setPrivacy(updated)
    try {
      await api.put('/privacy', updated)
      setMsg('Guardado ✓')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      const e = err.response?.data
      if (e?.code === 'PREMIUM_REQUIRED') setModal('premium')
      setPrivacy(privacy)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const plan = sub?.plan || 'FREE'
  const isPremium = plan !== 'FREE'
  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Perfil'
  const primaryPhoto = photos.find(p => p.isPrimary) || photos[0]

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
          <div style={{ position:'absolute', bottom:-4, right:-4, background:colors.green,
            borderRadius:8, padding:'2px 6px', fontSize:9,
            color:'#0A2010', fontWeight:700 }}>✓</div>
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

        {msg && (
          <div style={{ marginBottom:12, background:'rgba(61,214,140,0.1)',
            border:`1px solid ${colors.green}`, borderRadius:20,
            padding:'6px 16px', fontSize:12, color:colors.green,
            display:'inline-block' }}>{msg}</div>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          <button onClick={() => navigate('/create-profile')}
            style={{ background:'none', border:`1.5px solid ${colors.plum}`,
              borderRadius:50, padding:'8px 20px', color:colors.lavLight,
              cursor:'pointer', fontSize:13, fontFamily:'Inter,sans-serif' }}>
            Editar perfil
          </button>
          <button onClick={() => navigate('/photos')}
            style={{ background:'none', border:`1.5px solid ${colors.plum}`,
              borderRadius:50, padding:'8px 20px', color:colors.lavLight,
              cursor:'pointer', fontSize:13, fontFamily:'Inter,sans-serif' }}>
            📷 Fotos ({photos.length})
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
      <div style={{ margin:'0 16px 16px', display:'flex', gap:10 }}>
        <button onClick={() => navigate('/couple')}
          style={{ flex:1, background:colors.bgCard,
            border:`1px solid ${colors.plum}`, borderRadius:14,
            padding:'12px 16px', cursor:'pointer', textAlign:'left',
            transition:'all 0.2s' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>💑</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>
            Perfil de Casal
          </div>
          <div style={{ fontSize:10, color:colors.muted }}>
            Double Consent Match
          </div>
        </button>
        <button onClick={() => navigate('/photos')}
          style={{ flex:1, background:colors.bgCard,
            border:`1px solid ${colors.plum}`, borderRadius:14,
            padding:'12px 16px', cursor:'pointer', textAlign:'left',
            transition:'all 0.2s' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>📷</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>
            As minhas fotos
          </div>
          <div style={{ fontSize:10, color:colors.muted }}>
            {photos.length}/6 · Soft Reveal
          </div>
        </button>
      </div>
      <div style={{ margin:'0 16px 16px', display:'flex', gap:10 }}>
        <button onClick={() => navigate('/travel')}
          style={{ flex:1, background:colors.bgCard,
            border:`1px solid ${colors.plum}`, borderRadius:14,
            padding:'12px 16px', cursor:'pointer', textAlign:'left',
            transition:'all 0.2s' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>✈️</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>
            Travel Mode
          </div>
          <div style={{ fontSize:10, color:colors.muted }}>
            Encontra pessoas na tua cidade
          </div>
        </button>
        <button onClick={() => navigate('/verify')}
          style={{ flex:1, background:colors.bgCard,
            border:`1px solid ${colors.plum}`, borderRadius:14,
            padding:'12px 16px', cursor:'pointer', textAlign:'left',
            transition:'all 0.2s' }}>
          <div style={{ fontSize:18, marginBottom:4 }}>🔒</div>
          <div style={{ fontSize:12, fontWeight:600, color:colors.white }}>
            Verificação
          </div>
          <div style={{ fontSize:10, color:colors.muted }}>
            Perfil verificado ✓
          </div>
        </button>
      </div>
      <div style={{ margin:'0 16px 16px' }}>
        <button onClick={() => navigate('/checkin')}
          style={{ width:'100%', background:colors.bgCard,
            border:`1px solid rgba(61,214,140,0.3)`, borderRadius:14,
            padding:'14px 16px', cursor:'pointer', textAlign:'left',
            display:'flex', alignItems:'center', gap:14, transition:'all 0.2s' }}>
          <div style={{ fontSize:24 }}>🛡️</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:colors.white }}>
              Check-in de Encontro
            </div>
            <div style={{ fontSize:11, color:colors.muted, marginTop:2 }}>
              Regista encontros · Contacto de segurança · Alerta automático
            </div>
          </div>
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

      {/* Privacy */}
      <div style={{ margin:'0 16px 16px' }}>
        <div style={{ fontSize:11, color:colors.muted, textTransform:'uppercase',
          letterSpacing:1, fontWeight:600, marginBottom:10, paddingLeft:4 }}>
          Privacidade
        </div>
        <Toggle on={!!privacy.invisibleMode} label="Modo Invisível"
          sub={isPremium ? 'Navega sem seres visto' : 'Requer Premium'}
          disabled={!isPremium}
          onChange={v => updatePrivacy('invisibleMode', v)} />
        <Toggle on={privacy.showDistance !== false} label="Mostrar distância"
          onChange={v => updatePrivacy('showDistance', v)} />
        <Toggle on={!!privacy.showOnlineStatus} label="Mostrar estado online"
          onChange={v => updatePrivacy('showOnlineStatus', v)} />
      </div>

      {/* Premium */}
      {!isPremium && (
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
          <button onClick={() => setModal('premium')}
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

      {/* Premium Modal */}
      {modal === 'premium' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
          backdropFilter:'blur(8px)', zIndex:200, display:'flex',
          alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setModal(null)}>
          <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:'28px 28px 0 0', width:'100%', maxWidth:420,
            padding:'24px 24px 40px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width:40, height:4, background:colors.plum,
              borderRadius:2, margin:'0 auto 20px' }} />
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              fontWeight:700, marginBottom:16,
              background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              ✦ Between Premium
            </div>
            {[{plan:'PREMIUM', name:'Premium', price:'€9,99/mês'},
              {plan:'COUPLE_PREMIUM', name:'Casal Premium', price:'€14,99/mês'}
            ].map(p => (
              <button key={p.plan}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await api.post('/subscriptions/upgrade', { plan: p.plan })
                    const r = await api.get('/subscriptions/me')
                    setSub(r.data); setModal(null)
                    setMsg(`${p.name} ativado ✓`)
                    setTimeout(() => setMsg(''), 3000)
                  } catch {} finally { setSaving(false) }
                }}
                style={{ width:'100%', marginBottom:10,
                  background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                  border:'none', borderRadius:14, padding:'14px 16px',
                  fontSize:14, fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{p.name}</span><span style={{fontWeight:700}}>{p.price}</span>
              </button>
            ))}
            <button onClick={() => setModal(null)}
              style={{ width:'100%', background:'none',
                border:`1px solid ${colors.plum}`, borderRadius:14,
                padding:14, color:colors.muted, cursor:'pointer',
                fontFamily:'Inter,sans-serif' }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
