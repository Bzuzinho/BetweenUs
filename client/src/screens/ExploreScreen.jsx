import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const C = {
  bg:'#0E0818', card:'#1A1028', input:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', accentLight:'#E8B89A', rose:'#F2C4B8',
  lav:'#8B7BA8', lavLight:'#B8A9D4', white:'#FAF7F5',
  muted:'#7A6E88', green:'#3DD68C'
}

const FILTERS = [
  { key:'', label:'Todos' },
  { key:'INDIVIDUAL', label:'Solteiros' },
  { key:'COUPLE', label:'Casais' },
]

const BADGE_CONFIG = {
  email_verified:   { icon:'✉️', label:'Email verificado' },
  age_declared:     { icon:'🔞', label:'Idade declarada' },
  selfie_verified:  { icon:'🤳', label:'Verificado' },
  couple_confirmed: { icon:'💑', label:'Casal confirmado' },
  photos_reviewed:  { icon:'📷', label:'Fotos revistas' },
  premium_active:   { icon:'✦', label:'Premium' },
}

function ProfileCard({ profile, onLike, onPass }) {
  const [actioned, setActioned] = useState(null)
  const [matchPop, setMatchPop] = useState(false)

  const handleLike = async () => {
    setActioned('like')
    try {
      const res = await onLike(profile.id)
      if (res?.match) { setMatchPop(true); setTimeout(() => setMatchPop(false), 3000) }
    } catch {}
  }

  if (actioned === 'pass') return null

  const topBadges = (profile.verificationBadges || []).slice(0, 3)

  return (
    <>
      <div style={{
        background: C.card,
        border: `1px solid ${C.plum}`,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        opacity: actioned === 'like' ? 0.5 : 1,
        transition: 'opacity 0.3s',
      }}>
        {/* Photo */}
        <div style={{
          height: 280,
          background: 'linear-gradient(135deg,#3D2060,#0E0818)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {profile.photos?.length > 0 ? (
            <img
              src={profile.photos[0].storagePath}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: profile.photos[0].visibilityLevel === 'BLURRED' ? 'blur(12px)' : 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 72, opacity: 0.4 }}>
              {profile.type === 'COUPLE' ? '💑' : '🧑'}
            </div>
          )}

          {/* Score */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(201,149,107,0.25)',
            border: `1px solid ${C.accent}`,
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 12,
            color: C.accentLight,
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
          }}>
            ★ {profile.betweenScore}
          </div>

          {/* Badges */}
          {topBadges.length > 0 && (
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
              {topBadges.map(b => (
                <div key={b} title={BADGE_CONFIG[b]?.label} style={{
                  background: 'rgba(61,214,140,0.2)',
                  border: `1px solid ${C.green}`,
                  borderRadius: 20,
                  padding: '3px 8px',
                  fontSize: 11,
                  backdropFilter: 'blur(4px)',
                }}>
                  {BADGE_CONFIG[b]?.icon || '✓'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 20px' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20,
            fontWeight: 700,
            color: C.white,
            marginBottom: 4,
          }}>
            {profile.displayName}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
            {profile.city || ''}
          </div>
          {profile.bio && (
            <p style={{ fontSize: 14, color: C.lavLight, lineHeight: 1.6, marginBottom: 14 }}>
              {profile.bio}
            </p>
          )}

          {/* Actions — large tap targets */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setActioned('pass'); onPass(profile.id) }}
              style={{
                flex: 1,
                background: C.input,
                border: `1px solid ${C.plum}`,
                borderRadius: 14,
                padding: '14px',
                color: C.muted,
                fontSize: 15,
                fontWeight: 600,
                minHeight: 50,
              }}
            >
              Passar
            </button>
            <button
              onClick={handleLike}
              style={{
                flex: 1.5,
                background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
                border: 'none',
                borderRadius: 14,
                padding: '14px',
                color: '#1A0A2E',
                fontSize: 15,
                fontWeight: 700,
                minHeight: 50,
              }}
            >
              {actioned === 'like' ? '❤️ Enviado' : 'Ligar'}
            </button>
          </div>
        </div>
      </div>

      {matchPop && (
        <div
          onClick={() => setMatchPop(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            padding: 32,
          }}
        >
          <div style={{ fontSize: 72 }}>💫</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 34,
            fontStyle: 'italic',
            background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
          }}>
            Novo Match!
          </div>
          <p style={{ color: C.lavLight, fontSize: 15, textAlign: 'center', lineHeight: 1.6 }}>
            Vai aos teus Matches para conversar.
          </p>
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
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const handleLike = async (id) => {
    const res = await api.post(`/discovery/${id}/like`)
    return res.data
  }

  const handlePass = async (id) => {
    await api.post(`/discovery/${id}/pass`)
    setProfiles(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{
      padding: 'calc(16px + env(safe-area-inset-top)) 16px 0',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24,
          fontWeight: 700,
          fontStyle: 'italic',
          background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Between Us
        </span>
        <button
          onClick={loadProfiles}
          style={{ color: C.muted, fontSize: 20, padding: 8, minWidth: 44, minHeight: 44 }}
        >↻</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? 'rgba(201,149,107,0.15)' : C.card,
              border: `1.5px solid ${filter === f.key ? C.accent : C.plum}`,
              borderRadius: 20,
              padding: '8px 18px',
              fontSize: 13,
              color: filter === f.key ? C.accentLight : C.lavLight,
              minHeight: 40,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>A carregar...</div>
      )}
      {error && !loading && (
        <div style={{
          background: 'rgba(224,92,122,0.1)',
          border: '1px solid rgba(224,92,122,0.3)',
          borderRadius: 16,
          padding: 20,
          textAlign: 'center',
          color: '#E05C7A',
        }}>
          {error}
          <br />
          <button onClick={loadProfiles} style={{ marginTop: 12, color: '#E05C7A', border: '1px solid #E05C7A', borderRadius: 50, padding: '8px 20px', fontSize: 13, marginLeft: 0 }}>
            Tentar novamente
          </button>
        </div>
      )}
      {empty && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌙</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.white, marginBottom: 8 }}>
            Ainda és o primeiro
          </div>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Ainda não há perfis aprovados para explorar.
          </p>
        </div>
      )}

      {!loading && !error && profiles.map(p => (
        <ProfileCard key={p.id} profile={p} onLike={handleLike} onPass={handlePass} />
      ))}
    </div>
  )
}
