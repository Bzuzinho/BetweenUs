import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', warning:'#FBBF24', danger:'#F87171',
  teal:'#1D9E75',
}

const FILTERS = [
  { key:'',           label:'Todos' },
  { key:'INDIVIDUAL', label:'Solteiros' },
  { key:'COUPLE',     label:'Casais' },
  { key:'GROUP',      label:'Grupos' },
]

const TYPE_ICON = { INDIVIDUAL: '○', COUPLE: '◎', GROUP: '👥' }
const TYPE_LABEL = { INDIVIDUAL: 'Individual', COUPLE: 'Casal', GROUP: 'Grupo' }

function GridTile({ profile, onOpen }) {
  return (
    <div onClick={() => onOpen(profile)} style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: 'hidden', cursor: 'pointer', position: 'relative',
    }}>
      <div style={{
        aspectRatio: '3 / 4', width: '100%',
        background: `linear-gradient(160deg, ${C.elevated} 0%, ${C.bg} 100%)`,
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {profile.hasPhotos && profile.primaryPhoto ? (
          <img src={profile.primaryPhoto} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 22, color: C.muted }}>{TYPE_ICON[profile.type] || '○'}</span>
        )}

        {profile.type !== 'INDIVIDUAL' && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(10,20,26,0.85)',
            border: `1px solid rgba(184,167,255,0.3)`, borderRadius: 20, padding: '2px 7px',
            fontSize: 9, color: C.primary, backdropFilter: 'blur(6px)' }}>
            {TYPE_ICON[profile.type]} {TYPE_LABEL[profile.type]}
          </div>
        )}

        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(10,20,26,0.85)',
          borderRadius: 10, padding: '2px 6px', fontSize: 9, color: C.text,
          display: 'flex', alignItems: 'center', gap: 3, backdropFilter: 'blur(6px)' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%',
            background: profile.betweenScore > 80 ? C.success : profile.betweenScore > 60 ? C.warning : C.muted }} />
          {profile.betweenScore}
        </div>
      </div>
      <div style={{ padding: '8px 8px 10px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.text, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.displayName}</div>
        <div style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[profile.city, profile.distance && `${profile.distance} km`].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ profile, onLike, onPass }) {
  const [actioned, setActioned] = useState(null)
  const [matched, setMatched] = useState(false)

  const handleLike = async () => {
    setActioned('like')
    try {
      const res = await onLike(profile.id)
      if (res?.match) setMatched(true)
    } catch {}
  }

  if (actioned === 'pass') return null

  return (
    <>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        opacity: actioned === 'like' && !matched ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}>
        {/* Photo area */}
        <div style={{
          height: 260,
          background: `linear-gradient(160deg, ${C.elevated} 0%, ${C.bg} 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {profile.hasPhotos && profile.primaryPhoto ? (
            <img
              src={profile.primaryPhoto}
              alt=""
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: C.elevated, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: C.muted,
            }}>
              {TYPE_ICON[profile.type] || '○'}
            </div>
          )}

          {/* Between Score */}
          <div style={{
            position:'absolute', top:12, left:12,
            background:'rgba(10,20,26,0.85)',
            border:`1px solid ${C.border}`,
            borderRadius:20, padding:'4px 10px',
            display:'flex', alignItems:'center', gap:5,
            backdropFilter:'blur(8px)',
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: profile.score > 80 ? C.success : profile.score > 60 ? C.warning : C.muted }} />
            <span style={{ fontSize:12, fontWeight:500, color:C.text }}>{profile.score}</span>
            <span style={{ fontSize:10, color:C.muted }}>score</span>
          </div>

          {/* Badges */}
          <div style={{ position:'absolute', top:12, right:12, display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
            {profile.verificationBadges?.includes('selfie_verified') && (
              <div style={{ background:'rgba(29,158,117,0.2)', border:`1px solid rgba(29,158,117,0.4)`, borderRadius:20, padding:'3px 8px', fontSize:11, color:C.success, backdropFilter:'blur(4px)' }}>✓ Verificado</div>
            )}
            {profile.type !== 'INDIVIDUAL' && (
              <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.3)`, borderRadius:20, padding:'3px 8px', fontSize:11, color:C.primary, backdropFilter:'blur(4px)' }}>{TYPE_LABEL[profile.type] || profile.type}</div>
            )}
          </div>

          {/* Blur overlay badge — discovery always shows a blurred teaser regardless of the photo's own visibility tier */}
          {profile.hasPhotos && (
            <div style={{ position:'absolute', bottom:10, right:10, background:'rgba(10,20,26,0.7)', borderRadius:8, padding:'3px 8px', fontSize:10, color:C.primary }}>
              🔒 Soft Reveal
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding:'14px 16px 6px' }}>
          <div style={{ fontSize:18, fontWeight:500, color:C.text, marginBottom:3 }}>
            {profile.displayName}
          </div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:10 }}>
            {[profile.city, profile.distance && `${profile.distance} km`].filter(Boolean).join(' · ')}
          </div>

          {/* Intentions */}
          {profile.intentions?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              {profile.intentions.slice(0,3).map(pi => (
                <div key={pi.intention?.id} style={{
                  background: C.elevated,
                  border:`1px solid ${C.border}`,
                  borderRadius:20, padding:'4px 10px',
                  fontSize:11, color:C.text2,
                }}>
                  {pi.intention?.name || pi.intention?.slug}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score explanation */}
        {profile.scoreExplanation && (
          <div style={{ margin:'0 16px 10px', background:C.elevated, borderRadius:10, padding:'8px 12px', fontSize:11, color:C.muted, lineHeight:1.5 }}>
            {profile.scoreExplanation}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10, padding:'0 16px 16px' }}>
          <button
            onClick={() => { setActioned('pass'); onPass(profile.id) }}
            style={{
              flex:1, background:'none', border:`1px solid ${C.border}`,
              borderRadius:12, padding:'13px', fontSize:14, color:C.muted,
              minHeight:50,
            }}
          >
            Passar
          </button>
          <button
            onClick={handleLike}
            disabled={!!actioned}
            style={{
              flex:2, background: actioned==='like' ? C.primaryDim : C.primary,
              border: actioned==='like' ? `1px solid rgba(184,167,255,0.3)` : 'none',
              borderRadius:12, padding:'13px', fontSize:14, fontWeight:500,
              color: actioned==='like' ? C.primary : '#0A141A',
              minHeight:50,
            }}
          >
            {actioned==='like' ? (matched ? '💫 Match!' : '✓ Enviado') : 'Ligar'}
          </button>
        </div>
      </div>

      {/* Match popup */}
      {matched && (
        <div
          onClick={() => setMatched(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.92)',
            zIndex:300, display:'flex', alignItems:'center', justifyContent:'center',
            flexDirection:'column', gap:16, padding:32,
          }}
        >
          <div style={{ fontSize:56 }}>💫</div>
          <div style={{ fontSize:28, fontWeight:500, color:C.primary, textAlign:'center' }}>Novo match!</div>
          <p style={{ color:C.text2, fontSize:15, textAlign:'center', lineHeight:1.6 }}>
            Vai aos teus Matches para conversar.
          </p>
          <button style={{ marginTop:8, background:C.primary, border:'none', borderRadius:50, padding:'13px 32px', fontSize:14, fontWeight:500, color:'#0A141A' }}>
            Ver matches
          </button>
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
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(''); setEmpty(false)
    try {
      const params = filter ? `?type=${filter}` : ''
      const res = await api.get(`/discovery${params}`)
      const list = res.data.profiles || []
      setProfiles(list)
      if (list.length === 0) setEmpty(true)
    } catch {
      setError('Não foi possível carregar perfis.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleLike = async (id) => {
    const res = await api.post(`/discovery/${id}/like`)
    setProfiles(prev => prev.filter(p => p.id !== id))
    return res.data
  }

  const handlePass = async (id) => {
    await api.post(`/discovery/${id}/pass`).catch(() => {})
    setProfiles(prev => prev.filter(p => p.id !== id))
    setSelected(null)
  }

  return (
    <div style={{
      padding: 'calc(16px + env(safe-area-inset-top)) 16px 0',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="32" height="16" viewBox="0 0 32 16">
            <circle cx="10" cy="8" r="7" fill="none" stroke="#4A6B7A" strokeWidth="2"/>
            <circle cx="20" cy="8" r="7" fill="none" stroke="#B8A7FF" strokeWidth="1.5" opacity="0.8"/>
          </svg>
          <span style={{ fontSize:18, fontWeight:500, color:C.text }}>Explorar</span>
        </div>
        <button
          onClick={load}
          style={{ color:C.muted, fontSize:20, padding:8, minWidth:44, minHeight:44, borderRadius:10, border:`1px solid ${C.border}` }}
        >
          ↻
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter===f.key ? C.primaryDim : C.surface,
              border: `1.5px solid ${filter===f.key ? C.primary : C.border}`,
              borderRadius:20, padding:'8px 16px',
              fontSize:13, color: filter===f.key ? C.primary : C.muted,
              minHeight:38,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:60, color:C.muted }}>A carregar…</div>
      )}
      {error && !loading && (
        <div style={{
          background:'rgba(248,113,113,0.08)', border:`1px solid rgba(248,113,113,0.25)`,
          borderRadius:14, padding:20, textAlign:'center', color:C.danger,
        }}>
          {error}
          <br />
          <button onClick={load} style={{ marginTop:12, color:C.danger, border:`1px solid ${C.danger}`, borderRadius:50, padding:'8px 20px', fontSize:13 }}>
            Tentar novamente
          </button>
        </div>
      )}
      {empty && !loading && !error && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16, opacity:0.4 }}>◎</div>
          <div style={{ fontSize:20, fontWeight:500, color:C.text, marginBottom:8 }}>Nenhum perfil por aqui</div>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>
            Ainda não há perfis aprovados para explorar.
          </p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, paddingBottom:24 }}>
          {profiles.map(p => (
            <GridTile key={p.id} profile={p} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelected(null) }} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:250,
          display:'flex', alignItems:'flex-end', justifyContent:'center',
        }}>
          <div style={{ width:'100%', maxWidth:480, maxHeight:'88vh', overflowY:'auto',
            background:C.bg, borderRadius:'20px 20px 0 0', padding:'12px 12px 24px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
              <button onClick={() => setSelected(null)} style={{
                background:'none', border:'none', color:C.muted, fontSize:22,
                cursor:'pointer', minWidth:44, minHeight:44 }}>✕</button>
            </div>
            <ProfileCard
              profile={selected}
              onLike={async id => { const r = await handleLike(id); return r }}
              onPass={handlePass}
            />
          </div>
        </div>
      )}
    </div>
  )
}
