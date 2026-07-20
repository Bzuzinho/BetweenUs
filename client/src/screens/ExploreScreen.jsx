import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', warning:'#FBBF24', danger:'#F87171',
}

const TYPE_ICON = { INDIVIDUAL:'○', COUPLE:'◎', GROUP:'👥' }

function typeLabel(type, t) {
  return {
    INDIVIDUAL: t('common.individualProfile'),
    COUPLE: t('common.coupleProfile'),
    GROUP: t('common.groupProfile'),
  }[type] || type
}

function GridTile({ profile, onOpen, t }) {
  return (
    <button type="button" onClick={() => onOpen(profile)} style={{
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
      overflow:'hidden', cursor:'pointer', position:'relative', padding:0, textAlign:'left',
    }}>
      <div style={{ aspectRatio:'3 / 4', width:'100%', background:`linear-gradient(160deg, ${C.elevated}, ${C.bg})`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {profile.hasPhotos && profile.primaryPhoto
          ? <img src={profile.primaryPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <span style={{ fontSize:22, color:C.muted }}>{TYPE_ICON[profile.type] || '○'}</span>}
        {profile.type !== 'INDIVIDUAL' && (
          <div style={{ position:'absolute', top:6, left:6, background:'rgba(10,20,26,.85)', border:`1px solid rgba(184,167,255,.3)`, borderRadius:20, padding:'2px 7px', fontSize:9, color:C.primary }}>
            {TYPE_ICON[profile.type]} {typeLabel(profile.type, t)}
          </div>
        )}
        <div style={{ position:'absolute', top:6, right:6, background:'rgba(10,20,26,.85)', borderRadius:10, padding:'2px 6px', fontSize:9, color:C.text }}>
          {profile.betweenScore}
        </div>
      </div>
      <div style={{ padding:'8px 8px 10px' }}>
        <div style={{ fontSize:12, fontWeight:500, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile.displayName}</div>
        <div style={{ fontSize:10, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {[profile.city, profile.distance && `${profile.distance} km`].filter(Boolean).join(' · ')}
        </div>
      </div>
    </button>
  )
}

function ProfileCard({ profile, onLike, onPass, t }) {
  const [actioned, setActioned] = useState(null)
  const [matched, setMatched] = useState(false)

  const like = async () => {
    setActioned('like')
    try {
      const result = await onLike(profile.id)
      if (result?.match) setMatched(true)
    } catch {
      setActioned(null)
    }
  }

  return (
    <>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, overflow:'hidden', marginBottom:16 }}>
        <div style={{ height:260, background:`linear-gradient(160deg, ${C.elevated}, ${C.bg})`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {profile.hasPhotos && profile.primaryPhoto
            ? <img src={profile.primaryPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <div style={{ width:72, height:72, borderRadius:'50%', background:C.elevated, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, color:C.muted }}>{TYPE_ICON[profile.type] || '○'}</div>}
          <div style={{ position:'absolute', top:12, left:12, background:'rgba(10,20,26,.85)', border:`1px solid ${C.border}`, borderRadius:20, padding:'4px 10px', fontSize:11, color:C.text }}>
            {profile.score} {t('explore.score')}
          </div>
          {profile.verificationBadges?.includes('selfie_verified') && <div style={{ position:'absolute', top:12, right:12, background:'rgba(29,158,117,.2)', border:'1px solid rgba(29,158,117,.4)', borderRadius:20, padding:'3px 8px', fontSize:11, color:C.success }}>✓ {t('explore.verified')}</div>}
          {profile.hasPhotos && <div style={{ position:'absolute', bottom:10, right:10, background:'rgba(10,20,26,.7)', borderRadius:8, padding:'3px 8px', fontSize:10, color:C.primary }}>🔒 {t('explore.softReveal')}</div>}
        </div>
        <div style={{ padding:'14px 16px 6px' }}>
          <div style={{ fontSize:18, fontWeight:500, color:C.text }}>{profile.displayName}</div>
          <div style={{ fontSize:13, color:C.muted, margin:'3px 0 10px' }}>{[profile.city, profile.distance && `${profile.distance} km`].filter(Boolean).join(' · ')}</div>
          {profile.intentions?.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>{profile.intentions.slice(0,3).map(pi => <span key={pi.intention?.id} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:20, padding:'4px 10px', fontSize:11, color:C.text2 }}>{pi.intention?.name || pi.intention?.slug}</span>)}</div>}
        </div>
        {profile.scoreExplanation && <div style={{ margin:'0 16px 10px', background:C.elevated, borderRadius:10, padding:'8px 12px', fontSize:11, color:C.muted }}>{profile.scoreExplanation}</div>}
        <div style={{ display:'flex', gap:10, padding:'0 16px 16px' }}>
          <button onClick={() => onPass(profile.id)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:12, padding:13, color:C.muted }}>{t('explore.pass')}</button>
          <button onClick={like} disabled={!!actioned} style={{ flex:2, background:C.primary, border:'none', borderRadius:12, padding:13, fontWeight:500, color:'#0A141A', opacity:actioned?.7:1 }}>
            {actioned ? (matched ? `💫 ${t('explore.match')}` : `✓ ${t('explore.sent')}`) : t('explore.connect')}
          </button>
        </div>
      </div>
      {matched && <div onClick={() => setMatched(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:32 }}>
        <div style={{ fontSize:56 }}>💫</div>
        <div style={{ fontSize:28, fontWeight:500, color:C.primary, textAlign:'center' }}>{t('explore.newMatch')}</div>
        <p style={{ color:C.text2, textAlign:'center' }}>{t('explore.matchHelp')}</p>
        <button style={{ background:C.primary, border:'none', borderRadius:50, padding:'13px 32px', color:'#0A141A' }}>{t('explore.viewMatches')}</button>
      </div>}
    </>
  )
}

export default function ExploreScreen() {
  const { t } = useI18n()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [limitNotice, setLimitNotice] = useState('')

  const filters = [
    { key:'', label:t('explore.all') },
    { key:'INDIVIDUAL', label:t('explore.singles') },
    { key:'COUPLE', label:t('explore.couples') },
    { key:'GROUP', label:t('explore.groups') },
  ]

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/discovery${filter ? `?type=${filter}` : ''}`)
      setProfiles(res.data.profiles || [])
    } catch {
      setError(t('explore.loadError'))
    } finally {
      setLoading(false)
    }
  }, [filter, t])

  useEffect(() => { load() }, [load])

  const handleLike = async id => {
    try {
      const res = await api.post(`/discovery/${id}/like`)
      setProfiles(current => current.filter(profile => profile.id !== id))
      return res.data
    } catch (err) {
      if (err?.response?.data?.code === 'ACTIVE_MATCH_LIMIT') setLimitNotice(t('explore.limit'))
      throw err
    }
  }

  const handlePass = async id => {
    await api.post(`/discovery/${id}/pass`).catch(() => {})
    setProfiles(current => current.filter(profile => profile.id !== id))
    setSelected(null)
  }

  return <div style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
      <span style={{ fontSize:18, fontWeight:500, color:C.text }}>{t('explore.title')}</span>
      <button onClick={load} aria-label={t('explore.refresh')} style={{ color:C.muted, fontSize:20, padding:8, minWidth:44, minHeight:44, borderRadius:10, border:`1px solid ${C.border}` }}>↻</button>
    </div>
    {limitNotice && <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 14px', marginBottom:16, display:'flex', gap:10 }}><span style={{ flex:1, fontSize:13, color:C.text }}>{limitNotice} {t('explore.limitHelp')}</span><button onClick={() => setLimitNotice('')} style={{ color:C.muted, background:'none', border:'none' }}>×</button></div>}
    <div style={{ display:'flex', gap:8, marginBottom:20 }}>{filters.map(item => <button key={item.key} onClick={() => setFilter(item.key)} style={{ background:filter===item.key?C.primaryDim:C.surface, border:`1.5px solid ${filter===item.key?C.primary:C.border}`, borderRadius:20, padding:'8px 16px', fontSize:13, color:filter===item.key?C.primary:C.muted }}>{item.label}</button>)}</div>
    {loading && <div style={{ textAlign:'center', padding:60, color:C.muted }}>{t('common.loading')}</div>}
    {error && !loading && <div style={{ background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.25)', borderRadius:14, padding:20, textAlign:'center', color:C.danger }}>{error}<br/><button onClick={load} style={{ marginTop:12, color:C.danger, border:`1px solid ${C.danger}`, borderRadius:50, padding:'8px 20px' }}>{t('explore.retry')}</button></div>}
    {!loading && !error && profiles.length === 0 && <div style={{ textAlign:'center', padding:'60px 20px' }}><div style={{ fontSize:40, opacity:.4 }}>◎</div><div style={{ fontSize:20, fontWeight:500, color:C.text, margin:'16px 0 8px' }}>{t('explore.emptyTitle')}</div><p style={{ color:C.muted }}>{t('explore.emptyText')}</p></div>}
    {!loading && !error && <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, paddingBottom:24 }}>{profiles.map(profile => <GridTile key={profile.id} profile={profile} onOpen={setSelected} t={t}/>)}</div>}
    {selected && <div onClick={event => event.target===event.currentTarget && setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:250, display:'flex', alignItems:'flex-end', justifyContent:'center' }}><div style={{ width:'100%', maxWidth:480, maxHeight:'88vh', overflowY:'auto', background:C.bg, borderRadius:'20px 20px 0 0', padding:'12px 12px 24px' }}><div style={{ textAlign:'right' }}><button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22 }}>✕</button></div><ProfileCard profile={selected} onLike={handleLike} onPass={handlePass} t={t}/></div></div>}
  </div>
}
