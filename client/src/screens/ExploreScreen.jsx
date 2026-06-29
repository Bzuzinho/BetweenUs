import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', accentLight:'#E8B89A', rose:'#F2C4B8',
  lavender:'#8B7BA8', lavLight:'#B8A9D4', white:'#FAF7F5',
  muted:'#7A6E88', green:'#3DD68C'
}

const FILTERS = [
  { key:'', label:'Todos' },
  { key:'INDIVIDUAL', label:'Solteiros' },
  { key:'COUPLE', label:'Casais' },
]

// C.3 — Badge labels
const BADGE_CONFIG = {
  email_verified:    { icon:'✉️', label:'Email verificado' },
  age_declared:      { icon:'🔞', label:'Idade declarada' },
  selfie_verified:   { icon:'🤳', label:'Selfie validada' },
  couple_confirmed:  { icon:'💑', label:'Casal confirmado' },
  photos_reviewed:   { icon:'📷', label:'Fotos revistas' },
  premium_active:    { icon:'✦', label:'Premium' },
}

const STATUS_LABELS = {
  SINGLE:'Solteiro/a', COMMITTED:'Comprometido/a', MARRIED:'Casado/a',
  OPEN:'Relação aberta', POLYAMOROUS:'Poliamoroso/a',
  COUPLE_CURIOUS:'Casal curioso', COUPLE_LIBERAL:'Casal liberal', OTHER:'Outro'
}

function ProfileCard({ profile, onLike, onPass }) {
  const [actioned, setActioned] = useState(null)
  const [matchPop, setMatchPop] = useState(false)
  const [showScore, setShowScore] = useState(false)

  const handleLike = async () => {
    setActioned('like')
    try {
      const res = await onLike(profile.id)
      if (res?.match) { setMatchPop(true); setTimeout(() => setMatchPop(false), 3000) }
    } catch {}
  }

  const handlePass = async () => {
    setActioned('pass')
    try { await onPass(profile.id) } catch {}
  }

  if (actioned === 'pass') return null

  const topBadges = (profile.verificationBadges || []).slice(0, 3)

  return (
    <>
      <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
        borderRadius:24, overflow:'hidden', marginBottom:16,
        opacity: actioned === 'like' ? 0.5 : 1, transition:'opacity 0.3s' }}>

        {/* Photo */}
        <div style={{ height:280, background:'linear-gradient(135deg,#3D2060,#0E0818)',
          position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {profile.photos?.length > 0 ? (
            <img src={profile.photos[0].storagePath} alt=""
              style={{ width:'100%', height:'100%', objectFit:'cover',
                filter: profile.photos[0].visibilityLevel === 'BLURRED' ? 'blur(12px)' : 'none' }} />
          ) : (
            <div style={{ fontSize:80, opacity:0.4 }}>
              {profile.type === 'COUPLE' ? '💑' : '🧑'}
            </div>
          )}

          {/* C.4 — Score badge com tooltip */}
          <button onClick={() => setShowScore(p => !p)}
            style={{ position:'absolute', top:14, left:14,
              background:'rgba(201,149,107,0.25)', border:`1px solid ${colors.accent}`,
              borderRadius:20, padding:'5px 12px', fontSize:11, color:colors.accentLight,
              fontWeight:700, backdropFilter:'blur(4px)', cursor:'pointer' }}>
            ★ {profile.betweenScore}
          </button>

          {/* C.3 — Verification badges */}
          {topBadges.length > 0 && (
            <div style={{ position:'absolute', top:14, right:14,
              display:'flex', gap:4 }}>
              {topBadges.map(b => (
                <div key={b} title={BADGE_CONFIG[b]?.label || b}
                  style={{ background:'rgba(61,214,140,0.2)',
                    border:`1px solid ${colors.green}`, borderRadius:20,
                    padding:'3px 8px', fontSize:11, backdropFilter:'blur(4px)' }}>
                  {BADGE_CONFIG[b]?.icon || '✓'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* C.4 — Score explanation */}
        {showScore && profile.scoreExplanation && (
          <div style={{ background:'rgba(201,149,107,0.08)',
            borderBottom:`1px solid ${colors.plum}`, padding:'10px 16px' }}>
            <div style={{ fontSize:12, color:colors.accent, marginBottom:4 }}>
              Porquê este score?
            </div>
            <div style={{ fontSize:12, color:colors.lavLight, lineHeight:1.5 }}>
              {profile.scoreExplanation}
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ padding:'16px 18px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
            fontWeight:700, color:colors.white, marginBottom:2 }}>
            {profile.displayName}
          </div>
          <div style={{ fontSize:12, color:colors.muted, marginBottom:10 }}>
            {STATUS_LABELS[profile.relationshipStatus] || profile.relationshipStatus}
            {profile.city ? ` · ${profile.city}` : ''}
          </div>
          {profile.bio && (
            <div style={{ fontSize:13, color:colors.lavLight,
              lineHeight:1.6, marginBottom:12 }}>{profile.bio}</div>
          )}
          {profile.intentions?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
              {profile.intentions.slice(0,3).map(pi => (
                <span key={pi.id} style={{ background:'rgba(139,123,168,0.15)',
                  border:'1px solid rgba(139,123,168,0.3)', borderRadius:20,
                  padding:'4px 10px', fontSize:11, color:colors.lavLight }}>
                  {pi.intention?.name}
                  {pi.preference === 'MAYBE' && ' (talvez)'}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handlePass}
              style={{ flex:1, background:colors.bgInput, border:'none',
                borderRadius:14, padding:13, color:colors.muted, cursor:'pointer',
                fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif' }}>
              Passar
            </button>
            <button onClick={handleLike}
              style={{ flex:1.5,
                background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                border:'none', borderRadius:14, padding:13, color:'#1A0A2E',
                cursor:'pointer', fontSize:13, fontWeight:600,
                fontFamily:'Inter,sans-serif' }}>
              {actioned === 'like' ? '❤️ Enviado' : 'Ligar'}
            </button>
          </div>
        </div>
      </div>

      {matchPop && (
        <div onClick={() => setMatchPop(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)',
            zIndex:300, display:'flex', alignItems:'center', justifyContent:'center',
            flexDirection:'column', gap:20 }}>
          <div style={{ fontSize:80 }}>💫</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36,
            fontStyle:'italic',
            background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Novo Match!
          </div>
          <div style={{ fontSize:14, color:colors.lavLight,
            textAlign:'center', maxWidth:260, lineHeight:1.6 }}>
            É mútuo! Vai aos teus Matches para conversar.
          </div>
        </div>
      )}
    </>
  )
}

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [empty, setEmpty] = useState(false)
  const [error, setError] = useState('')

  const loadProfiles = useCallback(async () => {
    setLoading(true); setError(''); setEmpty(false)
    try {
      const params = filter ? `?type=${filter}` : ''
      const res = await api.get(`/discovery${params}`)
      const list = res.data.profiles || []
      setProfiles(list)
      if (list.length === 0) setEmpty(true)
    } catch (err) {
      setError('Não foi possível carregar perfis.')
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const handleLike = async (profileId) => {
    const res = await api.post(`/discovery/${profileId}/like`)
    return res.data
  }

  const handlePass = async (profileId) => {
    await api.post(`/discovery/${profileId}/pass`)
    setProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  return (
    <div style={{ padding:'60px 16px 0' }}>
      <div style={{ display:'flex', alignItems:'center',
        justifyContent:'space-between', marginBottom:16 }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
          fontWeight:700, fontStyle:'italic',
          background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Between Us
        </span>
        <button onClick={loadProfiles}
          style={{ background:'none', border:'none', fontSize:18,
            cursor:'pointer', color:colors.muted }}>↻</button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {FILTERS.map(f => (
          <div key={f.key} onClick={() => setFilter(f.key)}
            style={{ background: filter === f.key ? 'rgba(201,149,107,0.15)' : colors.bgCard,
              border:`1.5px solid ${filter === f.key ? colors.accent : colors.plum}`,
              borderRadius:20, padding:'7px 16px', fontSize:12, cursor:'pointer',
              color: filter === f.key ? colors.accentLight : colors.lavLight,
              transition:'all 0.2s', fontFamily:'Inter,sans-serif', fontWeight:500 }}>
            {f.label}
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ color:colors.accent, fontFamily:"'Playfair Display',serif",
            fontSize:18, fontStyle:'italic' }}>A carregar...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ background:'rgba(224,92,122,0.1)',
          border:'1px solid rgba(224,92,122,0.3)', borderRadius:16,
          padding:20, textAlign:'center', color:'#E05C7A', fontSize:14 }}>
          {error}
          <br/>
          <button onClick={loadProfiles} style={{ marginTop:12, background:'none',
            border:`1px solid #E05C7A`, borderRadius:50, padding:'8px 20px',
            color:'#E05C7A', cursor:'pointer', fontSize:12 }}>
            Tentar novamente
          </button>
        </div>
      )}

      {empty && !loading && !error && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:60, marginBottom:16 }}>🌙</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
            color:colors.white, marginBottom:8 }}>Ainda és o primeiro</div>
          <div style={{ color:colors.muted, fontSize:14, lineHeight:1.6 }}>
            Ainda não há perfis aprovados para explorar.
          </div>
        </div>
      )}

      {!loading && !error && profiles.map(p => (
        <ProfileCard key={p.id} profile={p} onLike={handleLike} onPass={handlePass} />
      ))}
    </div>
  )
}
