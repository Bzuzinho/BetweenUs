import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { getUserDisplayName } from '../lib/userDisplay'

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}
const INP = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
  borderRadius:12, padding:'12px 14px', color:C.text, fontSize:15,
  marginBottom:10, display:'block', WebkitAppearance:'none', outline:'none',
}

/* ─── Role permissions ───────────────────────────────────────────────────────── */
const ROLE_TABS = {
  SUPER_ADMIN:      ['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta','configuracoes'],
  ADMIN:            ['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta'],
  MODERATOR:        ['dashboard','reports','photos','profiles','conversations'],
  SUPPORT:          ['dashboard','users','reports'],
  FINANCE:          ['dashboard','users'],
  CONTENT_REVIEWER: ['dashboard','photos','profiles'],
}

const ALL_TABS = [
  { key:'dashboard',     label:'Dashboard',    icon:'▣',  desc:'Visão geral' },
  { key:'reports',       label:'Reports',      icon:'⚑',  desc:'Denúncias' },
  { key:'photos',        label:'Fotos',        icon:'◻',  desc:'Moderação visual' },
  { key:'profiles',      label:'Perfis',       icon:'○',  desc:'Aprovar perfis' },
  { key:'users',         label:'Utilizadores', icon:'◎',  desc:'Gerir contas' },
  { key:'verifications', label:'Verificações', icon:'◈',  desc:'Selfies pendentes' },
  { key:'conversations', label:'Conversas',    icon:'◌',  desc:'Monitorização' },
  { key:'audit',         label:'Auditoria',    icon:'◑',  desc:'Histórico admin' },
  { key:'beta',          label:'Beta',         icon:'◇',  desc:'Convites' },
  { key:'configuracoes', label:'Configurações', icon:'⚙',  desc:'Perfis e subscrições' },
]

/* ─── Notification bell ──────────────────────────────────────────────────────── */
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const ref = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.get('/admin/notifications').then(r => setNotifs(r.data.notifications || [])).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.readAt).length

  const markRead = async id => {
    await api.put(`/admin/notifications/${id}/read`).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n))
  }

  const del = async id => {
    await api.delete(`/admin/notifications/${id}`).catch(() => {})
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const delAll = async () => {
    await api.delete('/admin/notifications').catch(() => {})
    setNotifs([])
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        position:'relative', background:'none', border:`1px solid ${unread > 0 ? 'rgba(184,167,255,0.4)' : C.border}`,
        borderRadius:10, width:38, height:38, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
        color: unread > 0 ? C.primary : C.text2,
        transition:'all 0.2s',
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position:'absolute', top:-5, right:-5,
            background:C.danger, color:'#fff',
            fontSize:9, fontWeight:700, borderRadius:10,
            padding:'1px 5px', minWidth:16, textAlign:'center',
            animation:'pulse 1.5s infinite',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.15)} }`}</style>

      {open && (
        <div style={{
          position:'absolute', top:44, right:0, width:300, maxHeight:400,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:200, overflow:'hidden',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.text }}>Notificações</span>
            {notifs.length > 0 && (
              <button onClick={delAll} style={{ fontSize:11, color:C.muted, background:'none', border:'none', cursor:'pointer' }}>Apagar todas</button>
            )}
          </div>
          <div style={{ overflowY:'auto', maxHeight:320 }}>
            {notifs.length === 0 && (
              <div style={{ padding:20, textAlign:'center', color:C.muted, fontSize:13 }}>Sem notificações</div>
            )}
            {notifs.map(n => (
              <div key={n.id} onClick={() => {
                markRead(n.id)
                // Navigate to relevant admin tab
                try {
                  const d = n.data ? JSON.parse(n.data) : {}
                  if (d.tab) { setOpen(false); navigate(`/admin/${d.tab}`) }
                } catch {}
              }} style={{
                padding:'12px 14px', borderBottom:`1px solid ${C.border}`, cursor:'pointer',
                background: n.readAt ? 'none' : C.elevated, display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight: n.readAt ? 400 : 500, color:C.text }}>{n.title}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{n.body}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{new Date(n.createdAt).toLocaleString('pt')}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); del(n.id) }} style={{ color:C.muted, fontSize:16, background:'none', border:'none', cursor:'pointer', padding:2, flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Service session (Moderator / Support) ──────────────────────────────────── */
function ServiceStatus({ role }) {
  const [active, setActive] = useState(false)
  const [session, setSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    api.get('/admin/service/status').then(r => {
      setActive(r.data.active)
      setSession(r.data.session)
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!active || !session) return
    const t = setInterval(() => {
      setElapsed(Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
    }, 30000)
    setElapsed(Math.round((Date.now() - new Date(session?.startedAt || Date.now()).getTime()) / 60000))
    return () => clearInterval(t)
  }, [active, session])

  const toggle = async () => {
    setLoading(true)
    try {
      if (active) {
        await api.post('/admin/service/end')
        setActive(false); setSession(null); setElapsed(0)
      } else {
        await api.post('/admin/service/start')
        setActive(true); load()
      }
    } catch {}
    setLoading(false)
  }

  if (!['MODERATOR','SUPPORT'].includes(role)) return null

  return (
    <div style={{
      margin:'0 12px 10px',
      background: active ? 'rgba(74,222,128,0.08)' : C.elevated,
      border:`1px solid ${active ? 'rgba(74,222,128,0.3)' : C.border}`,
      borderRadius:12, padding:'10px 14px',
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
    }}>
      <div>
        <div style={{ fontSize:12, fontWeight:500, color: active ? C.success : C.muted }}>
          {active ? `● Ao serviço · ${elapsed}m` : '○ Fora de serviço'}
        </div>
        <div style={{ fontSize:11, color:C.muted }}>
          {active ? 'Moderação activa — os admins foram notificados' : `Clica para iniciar o serviço de ${role === 'MODERATOR' ? 'moderação' : 'suporte'}`}
        </div>
      </div>
      <button onClick={toggle} disabled={loading} style={{
        background: active ? C.dangerDim : C.successDim,
        border:`1px solid ${active ? C.danger : C.success}`,
        borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:500,
        color: active ? C.danger : C.success, cursor:'pointer', flexShrink:0,
      }}>
        {loading ? '…' : active ? 'Terminar' : 'Entrar ao serviço'}
      </button>
    </div>
  )
}

/* ─── Admin header ───────────────────────────────────────────────────────────── */
function AdminHeader({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initials = (getUserDisplayName(user) || '?')[0].toUpperCase()

  return (
    <div style={{
      background:C.surface, borderBottom:`1px solid ${C.border}`,
      paddingTop:'calc(10px + env(safe-area-inset-top))',
      paddingBottom:'10px',
      paddingLeft:16, paddingRight:16,
      display:'flex', alignItems:'center', gap:8,
      position:'sticky', top:0, zIndex:50,
      minHeight:'calc(56px + env(safe-area-inset-top))',
    }}>
      {/* Logo */}
      <svg width="34" height="17" viewBox="0 0 56 28" style={{ flexShrink:0 }}>
        <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
        <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.8"/>
      </svg>

      {/* App name */}
      <span style={{ fontSize:16, fontWeight:600, color:C.text, letterSpacing:'-0.01em', flexShrink:0 }}>
        Between Us
      </span>

      <div style={{ flex:1 }}/>

      {/* Bell — always visible on mobile and desktop */}
      <NotificationBell />

      {/* Avatar + name/role — name hidden on mobile */}
      <div ref={menuRef} style={{ position:'relative', display:'flex', alignItems:'center', gap:8 }}>

        {/* Name + role — desktop only */}
        <div onClick={() => setShowMenu(o => !o)} style={{ cursor:'pointer', textAlign:'right' }} className="admin-name-block">
          <div style={{ fontSize:13, fontWeight:500, color:C.text, lineHeight:1.2, whiteSpace:'nowrap' }}>
            {getUserDisplayName(user) || 'Admin'}
          </div>
          <div style={{ fontSize:11, color:C.primary, lineHeight:1.2 }}>{user?.adminRole}</div>
        </div>

        {/* Avatar — always visible */}
        <div onClick={() => setShowMenu(o => !o)} style={{
          width:36, height:36, borderRadius:'50%',
          background:C.primaryDim, border:`1.5px solid ${C.primary}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:600, color:C.primary, cursor:'pointer', flexShrink:0,
          overflow:'hidden',
        }}>
          {user?.avatarPath
            ? <img src={user.avatarPath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/>
            : initials
          }
        </div>

        {showMenu && (
          <div style={{
            position:'absolute', top:42, right:0, width:200,
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:200, overflow:'hidden',
          }}>
            <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:2 }}>{getUserDisplayName(user)}</div>
              <div style={{ fontSize:11, color:C.primary, marginBottom:2 }}>{user?.adminRole}</div>
              <div style={{ fontSize:11, color:C.muted }}>{user?.email}</div>
            </div>
            {[
              { label:'Conta (Admin)', action: () => { navigate('/admin/me'); setShowMenu(false) } },
              { label:'Alterar password', action: () => { navigate('/forgot-password'); setShowMenu(false) } },
              { label:'Sair', action: onLogout, danger: true },
            ].map(item => (
              <div key={item.label} onClick={item.action} style={{
                padding:'11px 14px', cursor:'pointer', fontSize:13,
                color: item.danger ? C.danger : C.text,
                borderBottom:`1px solid ${C.border}`,
              }}>
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Compact tab bar ────────────────────────────────────────────────────────── */
function TabBar({ tab, changeTab, allowedTabs }) {
  const tabs = ALL_TABS.filter(t => allowedTabs.includes(t.key))
  const stickyTop = 'calc(56px + env(safe-area-inset-top))'
  const cols = Math.min(tabs.length, tabs.length <= 5 ? tabs.length : Math.ceil(tabs.length / 2))

  return (
    <>
      {/* ── Mobile: icon grid, no scrolling ── */}
      <div
        className="admin-tabbar-mobile"
        style={{
          display:'grid',
          gridTemplateColumns: `repeat(${Math.min(tabs.length, 5)}, 1fr)`,
          background:C.bg,
          borderBottom:`1px solid ${C.border}`,
          position:'sticky',
          top: stickyTop,
          zIndex:40,
        }}
      >
        {tabs.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => changeTab(t.key)} style={{
              display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              gap:2, padding:'7px 2px',
              background: active ? C.primaryDim : 'none',
              border:'none',
              borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
              color: active ? C.primary : '#C8D4DC',
              fontSize:8, fontWeight: active ? 600 : 400,
              cursor:'pointer', minHeight:44,
            }}>
              <span style={{ fontSize:16, lineHeight:1 }}>{t.icon}</span>
              <span style={{ marginTop:1, textAlign:'center', lineHeight:1.1 }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Desktop: horizontal pill tabs ── */}
      <div
        className="admin-tabbar-desktop"
        style={{
          display:'none', flexWrap:'wrap', gap:4,
          padding:'10px 16px', background:C.bg,
          borderBottom:`1px solid ${C.border}`,
          position:'sticky', top: stickyTop, zIndex:40,
        }}
      >
        {tabs.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => changeTab(t.key)} style={{
              display:'flex', alignItems:'center', gap:5,
              background: active ? C.primaryDim : 'none',
              border:`1px solid ${active ? C.primary : 'transparent'}`,
              borderRadius:8, padding:'7px 12px',
              color: active ? C.primary : '#C8D4DC',
              fontSize:13, fontWeight: active ? 600 : 400,
              cursor:'pointer', whiteSpace:'nowrap',
            }}>
              <span style={{ fontSize:14 }}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .admin-tabbar-mobile  { display: none !important; }
          .admin-tabbar-desktop { display: flex !important; }
          .admin-name-block     { display: block !important; }
        }
        @media (max-width: 639px) {
          .admin-tabbar-desktop { display: none !important; }
          .admin-name-block     { display: none !important; }
        }
      `}</style>
    </>
  )
}

/* ─── Shared UI helpers ──────────────────────────────────────────────────────── */
function StatCard({ label, value, color, onClick, desc }) {
  return (
    <div onClick={onClick} style={{
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:14, padding:'14px 12px', textAlign:'center', flex:1, minWidth:80,
      cursor: onClick ? 'pointer' : 'default',
      transition:'border-color 0.2s',
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = C.primary)}
    onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = C.border)}
    >
      <div style={{ fontSize:22, fontWeight:600, color:color||C.primary }}>{value ?? '—'}</div>
      <div style={{ color:C.muted, fontSize:10, marginTop:3, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
      {desc && <div style={{ color:C.muted, fontSize:9, marginTop:2 }}>{desc}</div>}
    </div>
  )
}

function ReasonModal({ title, onConfirm, onCancel, hasNote=false }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onCancel}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'24px 20px calc(32px + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 18px' }}/>
        <h3 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:14, marginTop:0 }}>{title}</h3>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (obrigatório)" style={INP}/>
        {hasNote && <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Nota interna (opcional — só admins)" rows={3} style={{ ...INP, resize:'none' }}/>}
        <div style={{ display:'flex', gap:10, marginTop:6 }}>
          <button onClick={onCancel} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:13, color:C.muted, fontSize:14, minHeight:48, cursor:'pointer' }}>Cancelar</button>
          <button onClick={() => reason.trim() && onConfirm(reason, note)} disabled={!reason.trim()} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:13, color:'#0A141A', fontWeight:600, fontSize:14, minHeight:48, opacity:reason.trim()?1:0.4, cursor:'pointer' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard tab ──────────────────────────────────────────────────────────── */
function DashboardTab({ changeTab }) {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).catch(() => {}) }, [])
  if (!data) return <div style={{ color:C.muted, padding:20 }}>A carregar...</div>
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <StatCard label="Utilizadores" value={data.users?.total} onClick={() => changeTab('users')}/>
        <StatCard label="Hoje" value={data.users?.newToday} color={C.success} onClick={() => changeTab('users')}/>
        <StatCard label="Alto risco" value={data.users?.highRisk} color={C.danger} onClick={() => changeTab('users')}/>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <StatCard label="Perfis pend." value={data.profiles?.pending} color={C.warning} onClick={() => changeTab('profiles')}/>
        <StatCard label="Reports" value={data.reports?.pending} color={C.danger} onClick={() => changeTab('reports')}/>
        <StatCard label="Fotos pend." value={data.photos?.pending} color={C.warning} onClick={() => changeTab('photos')}/>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <StatCard label="Verif. pend." value={data.verifications?.pending} color={C.warning} onClick={() => changeTab('verifications')}/>
        <StatCard label="Premium" value={data.subscriptions?.total} color={C.success} onClick={() => changeTab('users')}/>
        <StatCard label="Suspenses" value={data.users?.suspended} color={C.muted} onClick={() => changeTab('users')}/>
      </div>
    </div>
  )
}

/* ─── Reports / Moderation Dashboard (9.12) ─────────────────────────────────── */
const TIER_COLOR = { MAXIMUM:C.danger, HIGH:C.danger, ELEVATED:C.warning, MODERATE:C.warning, LOW:C.muted, MINIMAL:C.muted, NONE:C.muted }
const tierForPriority = (p) => p>=10?'MAXIMUM':p>=8?'HIGH':p>=7?'ELEVATED':p>=5?'MODERATE':p>=3?'LOW':p>=1?'MINIMAL':'NONE'
const ageLabel = (createdAt) => {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function ReportsTab() {
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [selectedId, setSelectedId] = useState(null)
  const load = useCallback(() => { api.get(`/admin/reports?status=${status}`).then(r => setReports(r.data.reports||[])) }, [status])
  useEffect(() => { load() }, [load])

  if (selectedId) {
    return <ReportDetail reportId={selectedId} onBack={() => setSelectedId(null)} onResolved={() => { setSelectedId(null); load() }}/>
  }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['PENDING','REVIEWING','RESOLVED','DISMISSED','ESCALATED'].map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{ background:status===s?C.primaryDim:C.surface, border:`1px solid ${status===s?C.primary:C.border}`, borderRadius:8, padding:'6px 12px', color:status===s?C.primary:C.muted, fontSize:12, minHeight:34, cursor:'pointer' }}>{s}</button>
        ))}
      </div>
      {reports.length===0 && <p style={{color:C.muted}}>Sem reports com este estado.</p>}
      {reports.map(r => {
        const tier = tierForPriority(r.priority)
        return (
          <div key={r.id} onClick={() => setSelectedId(r.id)} style={{ background:C.surface, border:`1px solid ${tier==='MAXIMUM'||tier==='HIGH'?'rgba(248,113,113,0.3)':C.border}`, borderRadius:14, padding:14, marginBottom:10, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, gap:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:TIER_COLOR[tier], color:'#0A141A', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{tier}</span>
                <span style={{ color:C.text, fontWeight:500, fontSize:13 }}>{r.reason}</span>
                {r.aiAssessment && <span title="Avaliação por IA disponível" style={{ background:C.primaryDim, color:C.primary, borderRadius:6, padding:'2px 8px', fontSize:10 }}>🤖 IA</span>}
              </div>
              <span style={{ color:C.muted, fontSize:11 }}>há {ageLabel(r.createdAt)}</span>
            </div>
            <div style={{ color:C.text2, fontSize:12, marginBottom:4 }}>{r.reportedUser?.email}{r.reportedUser?.riskScore>0&&<span style={{color:C.danger}}> · risco {r.reportedUser.riskScore}</span>}</div>
            {r.details && <div style={{ color:C.muted, fontSize:12 }}>{r.details}</div>}
          </div>
        )
      })}
    </div>
  )
}

// 9.12 — detail view: report + evidence (only rendered if the server
// returned it — SUPPORT-tier admins get evidence:null and
// evidenceRestricted:true, shown as a locked notice instead of silently
// nothing) + previous reports + minimal account context + AI summary +
// actions. Never renders a "show me everything about this account" view.
function ReportDetail({ reportId, onBack, onResolved }) {
  const [data, setData] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { api.get(`/admin/reports/${reportId}`).then(r => setData(r.data)) }, [reportId])
  useEffect(() => { load() }, [load])

  const resolve = async (s) => {
    setBusy(true)
    try { await api.put(`/admin/reports/${reportId}`, { status: s, internalNotes: notes || undefined }); onResolved() }
    finally { setBusy(false) }
  }
  const reassess = async () => { setBusy(true); try { await api.post(`/admin/reports/${reportId}/assess`); load() } finally { setBusy(false) } }

  if (!data) return <p style={{color:C.muted}}>A carregar…</p>
  const { report, evidence, previousReports, aiAssessment, evidenceRestricted } = data
  const tier = tierForPriority(report.priority)

  return (
    <div>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, fontSize:13, marginBottom:14, cursor:'pointer' }}>← Voltar à fila</button>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ background:TIER_COLOR[tier], color:'#0A141A', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{tier}</span>
          <span style={{ color:C.text, fontWeight:600, fontSize:15 }}>{report.reason}</span>
          <span style={{ color:C.muted, fontSize:11, marginLeft:'auto' }}>{report.status} · há {ageLabel(report.createdAt)}</span>
        </div>
        {report.details && <div style={{ color:C.text2, fontSize:13, marginBottom:10 }}>{report.details}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:12, color:C.muted }}>
          <div>Reporter: {report.reporter?.email}</div>
          <div>Denunciado: {report.reportedUser?.email || '—'}</div>
          {report.reportedUser && <>
            <div>Risco: {report.reportedUser.riskScore}</div>
            <div>Perfil: {report.reportedUser.profile?.displayName} ({report.reportedUser.profile?.type})</div>
          </>}
        </div>
      </div>

      {previousReports?.length > 0 && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
          <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:8 }}>Denúncias anteriores ao mesmo utilizador ({previousReports.length})</div>
          {previousReports.map(p => (
            <div key={p.id} style={{ fontSize:12, color:C.muted, marginBottom:4 }}>{p.reason} · {p.status} · {new Date(p.createdAt).toLocaleDateString('pt')}</div>
          ))}
        </div>
      )}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>🤖 Avaliação por IA</div>
          <button onClick={reassess} disabled={busy} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', color:C.muted, fontSize:11, cursor:'pointer' }}>Reavaliar</button>
        </div>
        {!aiAssessment && <div style={{ color:C.muted, fontSize:12 }}>Sem avaliação (IA desativada ou ainda não corrida).</div>}
        {aiAssessment && (
          <div style={{ fontSize:12, color:C.text2 }}>
            <div style={{ marginBottom:4 }}>{aiAssessment.result?.summary}</div>
            <div style={{ color:C.muted }}>Severidade: {(aiAssessment.result?.severity*100).toFixed(0)}% · Prioridade recomendada: {aiAssessment.result?.recommendedPriority} · Categorias: {(aiAssessment.result?.categories||[]).join(', ')}</div>
            <div style={{ color:C.muted, fontSize:10, marginTop:6 }}>Só orientativo — a decisão é sempre humana. {aiAssessment.provider}/{aiAssessment.model}</div>
          </div>
        )}
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:8 }}>Evidência</div>
        {evidenceRestricted && <div style={{ color:C.warning, fontSize:12 }}>🔒 Sem permissão para ver evidência (moderation.evidence.view).</div>}
        {!evidenceRestricted && (!evidence || evidence.length===0) && <div style={{ color:C.muted, fontSize:12 }}>Sem evidência associada.</div>}
        {!evidenceRestricted && evidence?.map(e => (
          <div key={e.id} style={{ background:C.input, borderRadius:10, padding:10, marginBottom:8, fontSize:12 }}>
            <div style={{ color:C.primary, marginBottom:4 }}>{e.type}</div>
            <pre style={{ color:C.text2, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontFamily:'inherit' }}>{JSON.stringify(e.data, null, 2)}</pre>
          </div>
        ))}
      </div>

      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Nota interna (opcional)" style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.text, fontSize:12, marginBottom:10, minHeight:60 }}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <button onClick={() => resolve('RESOLVED')} disabled={busy} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, fontSize:12, minHeight:40, cursor:'pointer' }}>✓ Procedente</button>
        <button onClick={() => resolve('ESCALATED')} disabled={busy} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:10, color:C.danger, fontSize:12, minHeight:40, cursor:'pointer' }}>⚠ Escalar</button>
        <button onClick={() => resolve('DISMISSED')} disabled={busy} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.muted, fontSize:12, minHeight:40, cursor:'pointer' }}>✕ Dispensar</button>
      </div>
    </div>
  )
}

/* ─── Photos ─────────────────────────────────────────────────────────────────── */
function PhotosTab() {
  const [photos, setPhotos] = useState([])
  const load = useCallback(() => { api.get('/admin/photos?status=PENDING').then(r => setPhotos(r.data.photos||[])) }, [])
  useEffect(() => { load() }, [load])
  const mod = async (id, s) => { await api.put(`/admin/photos/${id}`, { moderationStatus: s }); setPhotos(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      {photos.length===0 && <p style={{color:C.muted}}>Sem fotos pendentes.</p>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {photos.map(p => (
          <div key={p.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <img src={p.storagePath} alt="" style={{ width:'100%', height:140, objectFit:'cover' }}/>
            <div style={{ padding:10 }}>
              <div style={{ color:C.text2, fontSize:11, marginBottom:8 }}>{p.profile?.displayName}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                <button onClick={() => mod(p.id,'APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:8, padding:8, color:C.success, fontSize:14, minHeight:40, cursor:'pointer' }}>✓</button>
                <button onClick={() => mod(p.id,'REJECTED')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:8, color:C.danger, fontSize:14, minHeight:40, cursor:'pointer' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Profiles ───────────────────────────────────────────────────────────────── */
function ProfilesTab() {
  const [profiles, setProfiles] = useState([])
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)

  const load = useCallback(() => {
    api.get(`/admin/profiles?status=${statusFilter}`).then(r => setProfiles(r.data.profiles||[]))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const mod = async (id, s, reason = 'Admin review') => {
    await api.put(`/admin/profiles/${id}/status`, { status: s, reason })
    setProfiles(p => p.filter(x => x.id !== id))
    setSelected(null)
    setModal(null)
  }

  if (selected) {
    const p = selected
    const photo = p.photos?.[0]
    return (
      <div style={{ maxWidth: 600 }}>
        {modal === 'reject' && (
          <ReasonModal title="Motivo de rejeição" onConfirm={r => mod(p.id, 'REJECTED', r)} onCancel={() => setModal(null)} />
        )}
        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', marginBottom:16 }}>←</button>

        {/* Profile card */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, overflow:'hidden', marginBottom:16 }}>
          {/* Cover / primary photo */}
          <div style={{ height:200, background:C.elevated, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {photo ? (
              <img src={photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            ) : (
              <div style={{ fontSize:48, color:C.muted, opacity:0.4 }}>○</div>
            )}
            <div style={{ position:'absolute', top:12, right:12, background:'rgba(10,20,26,0.8)', borderRadius:8, padding:'3px 10px', fontSize:11, color:C.text2 }}>
              {p.type}
            </div>
          </div>

          {/* Info */}
          <div style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
              {/* Avatar */}
              <div style={{ width:52, height:52, borderRadius:'50%', background:C.elevated, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:C.text2, flexShrink:0 }}>
                {photo ? (
                  <img src={photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/>
                ) : (
                  (p.displayName||'?')[0].toUpperCase()
                )}
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:600, color:C.text }}>{p.displayName}</div>
                <div style={{ fontSize:13, color:C.muted }}>{p.user?.email}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{p.city||'—'} · criado {new Date(p.createdAt).toLocaleDateString('pt')}</div>
              </div>
            </div>

            {p.bio && <p style={{ fontSize:14, color:C.text2, lineHeight:1.6, marginBottom:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>{p.bio}</p>}

            {/* Details grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                ['Género', p.gender||'—'],
                ['Orientação', p.orientation||'—'],
                ['Estado', p.relationshipStatus||'—'],
                ['Discrição', p.discretionLevel||'—'],
                ['Fotos', `${p.photos?.length||0}`],
                ['Status', p.status],
              ].map(([label, value]) => (
                <div key={label} style={{ background:C.elevated, borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:500 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* All photos */}
            {p.photos?.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Fotos ({p.photos.length})</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {p.photos.map(ph => (
                    <div key={ph.id} style={{ position:'relative' }}>
                      <img src={ph.storagePath} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:10, border:`1px solid ${C.border}` }}/>
                      <div style={{ position:'absolute', bottom:3, left:3, background:'rgba(10,20,26,0.8)', borderRadius:4, padding:'1px 5px', fontSize:9, color:C.text2 }}>
                        {ph.moderationStatus}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => setModal('reject')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:12, padding:13, color:C.danger, fontSize:14, fontWeight:500, cursor:'pointer', minHeight:48 }}>
                Rejeitar
              </button>
              <button onClick={() => mod(p.id,'APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:12, padding:13, color:C.success, fontSize:14, fontWeight:600, cursor:'pointer', minHeight:48 }}>
                ✓ Aprovar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Status filter */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {['PENDING_REVIEW','APPROVED','REJECTED','DRAFT'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            background: statusFilter===s ? C.primaryDim : C.surface,
            border:`1px solid ${statusFilter===s ? C.primary : C.border}`,
            borderRadius:8, padding:'7px 14px', color:statusFilter===s ? C.primary : '#C8D4DC',
            fontSize:13, cursor:'pointer', minHeight:36,
          }}>{s}</button>
        ))}
      </div>

      {profiles.length===0 && <p style={{color:C.muted}}>Sem perfis com este estado.</p>}

      {/* Profile grid — desktop 2 cols */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
        {profiles.map(p => {
          const photo = p.photos?.[0]
          return (
            <div key={p.id} onClick={() => setSelected(p)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', cursor:'pointer' }}>
              {/* Thumbnail */}
              <div style={{ height:120, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                {photo ? (
                  <img src={photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                ) : (
                  <div style={{ fontSize:36, color:C.muted, opacity:0.3 }}>○</div>
                )}
                <div style={{ position:'absolute', top:8, right:8, background:'rgba(10,20,26,0.8)', borderRadius:6, padding:'2px 8px', fontSize:10, color:C.text2 }}>{p.type}</div>
              </div>

              {/* Info */}
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                {/* Small avatar */}
                <div style={{ width:36, height:36, borderRadius:'50%', background:C.elevated, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:C.text2, flexShrink:0, overflow:'hidden' }}>
                  {photo ? (
                    <img src={photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  ) : (
                    (p.displayName||'?')[0].toUpperCase()
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.displayName}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{p.user?.email}</div>
                </div>
                <span style={{ color:C.muted, fontSize:18 }}>›</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Users ──────────────────────────────────────────────────────────────────── */
const ROLES_LIST = [
  { value:null,               label:'Utilizador normal',   desc:'Sem acesso ao admin' },
  { value:'CONTENT_REVIEWER', label:'Revisor de conteúdo', desc:'Fotos e perfis' },
  { value:'SUPPORT',          label:'Suporte',             desc:'Utilizadores e reports' },
  { value:'MODERATOR',        label:'Moderador',           desc:'Perfis, fotos, conversas' },
  { value:'FINANCE',          label:'Financeiro',          desc:'Subscrições e métricas' },
  { value:'ADMIN',            label:'Admin',               desc:'Tudo excepto roles' },
  { value:'SUPER_ADMIN',      label:'Super Admin',         desc:'Acesso total' },
]

function RoleManager({ userId, currentRole, onChanged }) {
  const { user: me } = useAuth()
  const [sel, setSel] = useState(currentRole || null)
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  if (me?.adminRole !== 'SUPER_ADMIN') return null
  const cur = ROLES_LIST.find(r => r.value === currentRole) || ROLES_LIST[0]
  const save = async () => {
    if (!reason.trim()) return setErr('Motivo obrigatório.')
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.put(`/admin/users/${userId}/role`, { adminRole: sel, reason })
      setMsg('Role actualizado.'); setReason(''); setOpen(false); onChanged()
    } catch (e) { setErr(e.response?.data?.error || 'Erro.') }
    finally { setSaving(false) }
  }
  return (
    <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: open ? 12 : 0 }}>
        <div>
          <div style={{ fontSize:12, color:C.text2, fontWeight:500 }}>Role: {cur.label}</div>
          <div style={{ fontSize:11, color:C.muted }}>{cur.desc}</div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', color:C.text2, fontSize:12, cursor:'pointer', minHeight:34 }}>
          {open ? 'Cancelar' : '✏️ Alterar'}
        </button>
      </div>
      {open && (
        <div>
          {msg && <div style={{ color:C.success, fontSize:12, marginBottom:8 }}>{msg}</div>}
          {err && <div style={{ color:C.danger, fontSize:12, marginBottom:8 }}>{err}</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
            {ROLES_LIST.map(r => (
              <div key={String(r.value)} onClick={() => setSel(r.value)} style={{
                background: sel===r.value ? C.primaryDim : C.elevated,
                border:`1.5px solid ${sel===r.value ? C.primary : C.border}`,
                borderRadius:10, padding:'9px 12px', cursor:'pointer',
              }}>
                <div style={{ fontSize:13, fontWeight:500, color:sel===r.value?C.primary:C.text }}>{r.label}</div>
                <div style={{ fontSize:11, color:C.muted }}>{r.desc}</div>
              </div>
            ))}
          </div>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo *" style={INP}/>
          <button onClick={save} disabled={saving||!reason.trim()} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:12, fontSize:13, fontWeight:500, color:'#0A141A', cursor:'pointer', opacity:saving||!reason.trim()?0.5:1, minHeight:44 }}>
            {saving ? '…' : 'Guardar role'}
          </button>
        </div>
      )}
    </div>
  )
}

// 3.1: verification selfies are now private storage — selfieStoragePath is
// an R2 key, not a public URL. Fetches a short-lived signed URL on demand
// instead of rendering the stored path directly.
function AdminSelfieImage({ userId }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let cancelled = false
    setUrl(null); setErr(false)
    api.get(`/verifications/admin/${userId}/selfie-url`)
      .then(r => { if (!cancelled) setUrl(r.data.url) })
      .catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true }
  }, [userId])

  if (err) return <div style={{ fontSize:12, color:C.muted, marginBottom:10, fontStyle:'italic' }}>Não foi possível carregar a imagem (pode já ter sido eliminada após revisão).</div>
  if (!url) return <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>A carregar imagem…</div>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display:'block', marginBottom:10 }}>
      <img src={url} alt="Selfie de verificação" style={{ width:'100%', maxHeight:280, objectFit:'contain', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg }} />
    </a>
  )
}

// 6.10 — admin visibility into couple/group membership, ApprovalPolicy and
// Agreement status. Aggregate-only by default (status/conflict count, not
// per-member answers) — "Ver respostas individuais" is a separate, explicit
// action that hits the dedicated raw endpoint and is always admin-logged
// server-side (see routes/agreements.ts's /admin/:profileId/raw).
function CoupleAdminSection({ ctx, profileId }) {
  const [raw, setRaw] = useState(null)
  const [loadingRaw, setLoadingRaw] = useState(false)

  const loadRaw = async () => {
    if (!profileId) return
    setLoadingRaw(true)
    try {
      const res = await api.get(`/agreements/admin/${profileId}/raw`)
      setRaw(res.data)
    } catch {} finally { setLoadingRaw(false) }
  }

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
      <div style={{ fontSize:14, fontWeight:500, color:C.text2, marginBottom:12 }}>💑 Membros e Acordo</div>

      <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
        ApprovalPolicy: <strong style={{color:C.text}}>{ctx.approvalPolicy}</strong>
        {' · '}Membros ativos: <strong style={{color:C.text}}>{ctx.activeMemberCount}</strong>
      </div>

      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
        Membros
      </div>
      {ctx.members.map(m => (
        <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'8px 0', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
          <span style={{ color:C.text }}>{m.email || '(convite pendente)'}{m.isCreator ? ' · criador/a' : ''}</span>
          <span style={{ color: m.status === 'ACCEPTED' ? C.success : m.status === 'PENDING' ? C.warning : C.muted }}>
            {m.status}
          </span>
        </div>
      ))}

      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', margin:'16px 0 6px' }}>
        Modo Acordo
      </div>
      {ctx.agreement ? (
        <div style={{ fontSize:12, color:C.text2, lineHeight:1.9 }}>
          <div>Estado: <strong style={{color:C.text}}>{ctx.agreement.status}</strong> (v{ctx.agreement.version})</div>
          <div>Conflitos por alinhar: <strong style={{color: ctx.agreement.conflictCount > 0 ? C.danger : C.text}}>{ctx.agreement.conflictCount}</strong></div>
          <div>Por responder: <strong style={{color:C.text}}>{ctx.agreement.missingCount}</strong></div>
          {ctx.agreement.lockedAt && <div>Bloqueado em: <strong style={{color:C.text}}>{new Date(ctx.agreement.lockedAt).toLocaleDateString('pt')}</strong></div>}
        </div>
      ) : <div style={{ color:C.muted, fontSize:12 }}>Sem ronda de Modo Acordo ainda.</div>}

      {!raw ? (
        <button onClick={loadRaw} disabled={loadingRaw} style={{ marginTop:14, background:C.dangerDim,
          border:`1px solid rgba(248,113,113,0.3)`, borderRadius:10, padding:'8px 14px',
          color:C.danger, fontSize:12, cursor:'pointer' }}>
          {loadingRaw ? 'A carregar...' : '⚠ Ver respostas individuais (acção registada em log)'}
        </button>
      ) : (
        <div style={{ marginTop:14, background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:12, padding:12 }}>
          <div style={{ fontSize:11, color:C.danger, marginBottom:8 }}>
            ⚠ Vista excecional — esta consulta ficou registada no log de admin.
          </div>
          {raw.answers.map((a, i) => (
            <div key={i} style={{ fontSize:12, color:C.text2, padding:'4px 0', borderBottom:`1px solid ${C.border}` }}>
              <strong style={{color:C.text}}>{a.member.email}</strong>: {a.question} → {a.preference}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UserDetail({ userId, onBack }) {
  const { user: me } = useAuth()
  const [data, setData] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [history, setHistory] = useState([])
  const [view, setView] = useState('info')
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Sprint 2.5.4: light field-level permission gating — full PermissionService
  // (2.5.11) is a larger follow-up, this covers the sensitive fields called
  // out explicitly in the sprint (NIF).
  const canSeeNif = ['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(me?.adminRole)

  const load = useCallback(() => {
    api.get(`/admin/users/${userId}`).then(r => {
      setData(r.data)
      setForm({
        email: r.data.email,
        accountName: r.data.accountName || '',
        nif: r.data.nif || '',
        displayName: r.data.profile?.displayName||'',
        bio: r.data.profile?.bio||'',
        city: r.data.profile?.city||'',
        profileStatus: r.data.profile?.status||'PENDING_REVIEW',
      })
    })
    api.get(`/admin/users/${userId}/history`).then(r => setHistory(r.data.history||[]))
    api.get(`/admin/users/${userId}/eligibility`).then(r => setEligibility(r.data.eligibility)).catch(() => {})
  }, [userId])

  useEffect(() => { load() }, [load])

  const saveUser = async (reason, note) => {
    setEditing(null)
    const payload = { email: form.email, accountName: form.accountName, reason, internalNote: note }
    if (canSeeNif) payload.nif = form.nif
    try { await api.put(`/admin/users/${userId}`, payload); setMsg('Actualizado.'); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') }
  }
  const reviewVerification = async (status, reason) => {
    setModal(null)
    try { await api.put(`/admin/verifications/${userId}`, { status, reason }); setMsg(`Verificação: ${status}.`); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') }
  }
  const saveProfile = async (reason, note) => { if (!data?.profile?.id) return; setEditing(null); try { await api.put(`/admin/profiles/${data.profile.id}`, { displayName: form.displayName, bio: form.bio, city: form.city, status: form.profileStatus, reason, internalNote: note }); setMsg('Perfil actualizado.'); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const doStatus = async (status, reason) => { setModal(null); try { await api.put(`/admin/users/${userId}/status`, { status, reason }); setMsg(`Estado: ${status}.`); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const doDelete = async (reason, note) => { setModal(null); try { await api.delete(`/admin/users/${userId}`, { data: { reason, internalNote: note } }); onBack() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const resetPwd = async () => { try { await api.post(`/admin/users/${userId}/reset-password`); setMsg('Email de reset enviado.') } catch (e) { setErr('Erro.') } }
  const evaluateActivation = async () => {
    setMsg(''); setErr('')
    try {
      const r = await api.post(`/admin/users/${userId}/evaluate-activation`)
      if (r.data.activated) setMsg('Utilizador activado — requisitos cumpridos: ' + r.data.evaluation.satisfiedBy.join(', '))
      else setErr('Ainda não cumpre nenhum requisito de activação (email verificado, verificação de identidade aprovada, ou perfil aprovado).')
      load()
    } catch (e) { setErr(e.response?.data?.error||'Erro.') }
  }

  if (!data) return <div style={{ color:C.muted, padding:20 }}>A carregar...</div>
  const u = data; const p = data.profile

  return (
    <>
      {modal==='suspend'  && <ReasonModal title="Suspender"      onConfirm={(r)=>doStatus('SUSPENDED',r)}  onCancel={()=>setModal(null)} hasNote/>}
      {modal==='ban'      && <ReasonModal title="Banir"          onConfirm={(r)=>doStatus('BANNED',r)}     onCancel={()=>setModal(null)} hasNote/>}
      {modal==='activate' && <ReasonModal title="Reactivar (de Suspenso)" onConfirm={(r)=>doStatus('ACTIVE',r)} onCancel={()=>setModal(null)}/>}
      {modal==='delete'   && <ReasonModal title="⚠️ Eliminar"   onConfirm={(r,n)=>doDelete(r,n)}          onCancel={()=>setModal(null)} hasNote/>}
      {editing==='user'   && <ReasonModal title="Guardar conta"  onConfirm={(r,n)=>saveUser(r,n)}          onCancel={()=>setEditing(null)} hasNote/>}
      {editing==='profile'&& <ReasonModal title="Guardar perfil" onConfirm={(r,n)=>saveProfile(r,n)}       onCancel={()=>setEditing(null)} hasNote/>}
      {modal==='reject-verification' && <ReasonModal title="Rejeitar verificação" onConfirm={(r)=>reviewVerification('REJECTED', r)} onCancel={()=>setModal(null)}/>}

      <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:14 }}>←</button>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:3 }}>
          {u.email}
          {u.isTestAccount && <span style={{ color:'#C9956B', fontSize:11, marginLeft:8, background:'rgba(201,149,107,0.15)', borderRadius:4, padding:'2px 7px', fontWeight:600, verticalAlign:'middle' }}>TEST ACCOUNT</span>}
        </div>
        {u.isTestAccount && u.testScenarioKey && (
          <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Seed scenario: <span style={{color:'#C9956B'}}>{u.testScenarioKey}</span></div>
        )}
        <div style={{ fontSize:12, color:C.muted }}>
          {u.status}{u.adminRole&&<span style={{color:C.primary}}> · {u.adminRole}</span>}
          {u.riskScore>0&&<span style={{color:C.danger}}> · risco {u.riskScore}</span>}
        </div>
        {u.subscription && (
          <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
            {u.subscription.plan} · {u.subscription.status}
            {u.subscription.currentPeriodEnd && ` · até ${new Date(u.subscription.currentPeriodEnd).toLocaleDateString('pt')}`}
          </div>
        )}
        {eligibility && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
            {[['canAppearInDiscovery','Discovery'],['canLike','Like'],['canMatch','Match'],['canChat','Chat']].map(([k,l]) => (
              <span key={k} style={{
                fontSize:10, padding:'2px 8px', borderRadius:6,
                background: eligibility[k] ? C.successDim : C.dangerDim,
                color: eligibility[k] ? C.success : C.danger,
                border:`1px solid ${eligibility[k] ? C.success : C.danger}`,
              }}>{eligibility[k] ? '✓' : '✕'} {l}</span>
            ))}
          </div>
        )}
        {eligibility?.reasons?.length > 0 && (
          <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>Motivo: {eligibility.reasons.join(', ')}</div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        {/* Sprint 2.5.5: "Reactivar" só faz SUSPENDED→ACTIVE (transição manual explícita).
            PENDING_VERIFICATION→ACTIVE só acontece via avaliação de requisitos. */}
        {u.status==='SUSPENDED' && <button onClick={()=>setModal('activate')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:12, padding:11, color:C.success, fontSize:13, minHeight:44, cursor:'pointer' }}>✓ Reactivar</button>}
        {u.status==='PENDING_VERIFICATION' && <button onClick={evaluateActivation} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:12, padding:11, color:C.success, fontSize:13, minHeight:44, cursor:'pointer' }}>⟳ Avaliar activação</button>}
        {u.status==='ACTIVE' && <button onClick={()=>setModal('suspend')}  style={{ background:C.elevated,   border:`1px solid ${C.border}`,  borderRadius:12, padding:11, color:C.text2,  fontSize:13, minHeight:44, cursor:'pointer' }}>⏸ Suspender</button>}
        {u.status!=='BANNED'    && <button onClick={()=>setModal('ban')}      style={{ background:C.dangerDim,  border:`1px solid ${C.danger}`,  borderRadius:12, padding:11, color:C.danger,  fontSize:13, minHeight:44, cursor:'pointer' }}>🚫 Banir</button>}
        <button onClick={resetPwd} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:12, padding:11, color:C.text2, fontSize:13, minHeight:44, cursor:'pointer' }}>🔑 Reset password</button>
        <button onClick={()=>setModal('delete')} style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:12, padding:11, color:C.danger, fontSize:13, minHeight:44, cursor:'pointer' }}>🗑 Eliminar</button>
      </div>

      {msg && <div style={{ background:C.successDim, border:`1px solid rgba(74,222,128,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.success, fontSize:13 }}>{msg}</div>}
      {err && <div style={{ background:C.dangerDim,  border:`1px solid rgba(248,113,113,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.danger,  fontSize:13 }}>{err}</div>}

      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {[
          ['info','📧 Conta'],['profile','👤 Perfil'],
          ...(data.coupleContext ? [['couple','💑 Casal/Grupo']] : []),
          ['subscription','✦ Subscrição'],['invites','🎁 Convites'],['verification','◈ Verificação'],['privacy','🔒 Privacidade'],['history','📋 Histórico']
        ].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)} style={{ background:view===k?C.primaryDim:C.surface, border:`1.5px solid ${view===k?C.primary:C.border}`, borderRadius:10, padding:'8px 10px', color:view===k?C.primary:C.muted, fontSize:11, fontWeight:view===k?500:400, cursor:'pointer', minHeight:38 }}>{l}</button>
        ))}
      </div>

      {view==='info' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:14, fontWeight:500, color:C.text2 }}>Conta</span>
            <button onClick={() => setEditing('user')} style={{ background:C.primary, border:'none', borderRadius:8, padding:'6px 14px', color:'#0A141A', fontSize:12, fontWeight:600, cursor:'pointer', minHeight:32 }}>Guardar</button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:C.primaryDim, border:`1px solid ${C.primary}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:600, color:C.primary, overflow:'hidden', flexShrink:0 }}>
              {u.avatarPath ? <img src={u.avatarPath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (u.accountName||u.email||'?')[0].toUpperCase()}
            </div>
            <div style={{ fontSize:11, color:C.muted }}>Avatar de Conta — só o próprio utilizador o pode alterar (em /admin/me para admins, ou na app).</div>
          </div>

          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>EMAIL</label>
          <input style={INP} value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))}/>
          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NOME (accountName)</label>
          <input style={INP} value={form.accountName} onChange={e => setForm(p => ({...p, accountName:e.target.value}))}/>
          {canSeeNif ? (
            <>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NIF</label>
              <input style={INP} value={form.nif} onChange={e => setForm(p => ({...p, nif:e.target.value}))}/>
            </>
          ) : (
            <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>NIF oculto — o teu role ({me?.adminRole}) não tem permissão para o ver.</div>
          )}
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
            <div>Email verificado: {u.emailVerifiedAt ? '✅ '+new Date(u.emailVerifiedAt).toLocaleDateString('pt') : '❌ Não'}</div>
            {u.dateOfBirth && <div>Data de nascimento: {new Date(u.dateOfBirth).toLocaleDateString('pt')}</div>}
            <div>Criado: {new Date(u.createdAt).toLocaleDateString('pt')}</div>
          </div>
          <RoleManager userId={userId} currentRole={u.adminRole} onChanged={load}/>
        </div>
      )}

      {view==='couple' && data.coupleContext && (
        <CoupleAdminSection ctx={data.coupleContext} profileId={data.profile?.id} />
      )}

      {view==='subscription' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, fontSize:13, color:C.text2, lineHeight:2 }}>
          {u.subscription ? (
            <>
              <div>Plano: <strong style={{color:C.text}}>{u.subscription.plan}</strong></div>
              <div>Estado: <strong style={{color:C.text}}>{u.subscription.status}</strong></div>
              <div>Fornecedor: <strong style={{color:C.text}}>{u.subscription.provider || '—'}</strong></div>
              {u.subscription.currentPeriodStart && <div>Período desde: <strong style={{color:C.text}}>{new Date(u.subscription.currentPeriodStart).toLocaleDateString('pt')}</strong></div>}
              {u.subscription.currentPeriodEnd && <div>Período até: <strong style={{color:C.text}}>{new Date(u.subscription.currentPeriodEnd).toLocaleDateString('pt')}</strong></div>}
              {u.subscription.cancelledAt && <div>Cancelada em: <strong style={{color:C.danger}}>{new Date(u.subscription.cancelledAt).toLocaleDateString('pt')}</strong></div>}
            </>
          ) : <div style={{color:C.muted}}>Sem subscrição.</div>}
        </div>
      )}

      {view==='invites' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ fontSize:14, fontWeight:500, color:C.text2, marginBottom:10 }}>🎁 Afiliados (só visível a admins)</div>
          {!data.referral?.invitedBy && !(data.referral?.invited?.length > 0) && <div style={{color:C.muted, fontSize:13}}>Sem actividade de afiliados.</div>}
          {data.referral?.invitedBy && (
            <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
              Convidado por <strong style={{color:C.text}}>{data.referral.invitedBy.email}</strong>
              {data.referral.invitedBySubscribed ? ' · já subscreveu ✅' : ' · ainda não subscreveu'}
            </div>
          )}
          {data.referral?.invited?.length > 0 && (
            <>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                Convidou {data.referral.invited.length} pessoa(s)
              </div>
              {data.referral.invited.map((r, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                  <span style={{ color:C.text }}>{r.user.email}</span>
                  <span style={{ color: r.creditGranted ? C.success : r.subscribedAt ? C.primary : C.muted }}>
                    {r.creditGranted ? '✓ Creditado' : r.subscribedAt ? 'Subscreveu' : 'Registado'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {view==='verification' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.8, marginBottom:14 }}>
            <div>Tipo: <strong style={{color:C.text}}>{u.verification?.type || '—'}</strong></div>
            <div>Estado: <strong style={{color:C.text}}>{u.verification?.status || 'NONE'}</strong></div>
            {u.verification?.reviewedAt && <div>Revisto em: <strong style={{color:C.text}}>{new Date(u.verification.reviewedAt).toLocaleDateString('pt')}</strong></div>}
            {u.ageVerifiedAt && <div>Idade verificada: <strong style={{color:C.success}}>✅ {new Date(u.ageVerifiedAt).toLocaleDateString('pt')}</strong></div>}
          </div>
          {u.verification?.selfieStoragePath && (
            <AdminSelfieImage userId={userId} />
          )}
          {u.verification?.status === 'PENDING' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={()=>reviewVerification('APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, fontSize:13, minHeight:42, cursor:'pointer' }}>Aprovar</button>
              <button onClick={()=>setModal('reject-verification')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:10, color:C.danger, fontSize:13, minHeight:42, cursor:'pointer' }}>Rejeitar</button>
            </div>
          )}
        </div>
      )}

      {view==='privacy' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, fontSize:13, color:C.text2, lineHeight:2 }}>
          {p?.privacySettings ? (
            <>
              <div>Visível em Discovery: <strong style={{color:C.text}}>{p.privacySettings.visibleInDiscovery ? 'Sim' : 'Não'}</strong></div>
              <div>Mostra distância: <strong style={{color:C.text}}>{p.privacySettings.showDistance ? 'Sim' : 'Não'}</strong></div>
              <div>Mostra estado online: <strong style={{color:C.text}}>{p.privacySettings.showOnlineStatus ? 'Sim' : 'Não'}</strong></div>
              <div>Permite pedidos de fotos: <strong style={{color:C.text}}>{p.privacySettings.allowPhotoRequests ? 'Sim' : 'Não'}</strong></div>
              <div>Modo invisível: <strong style={{color:C.text}}>{p.privacySettings.invisibleMode ? 'Sim' : 'Não'}</strong></div>
              <div>Notificações: <strong style={{color:C.text}}>{p.privacySettings.notificationMode}</strong></div>
              {p.privacySettings.minDistanceKm != null && <div>Distância mínima: <strong style={{color:C.text}}>{p.privacySettings.minDistanceKm} km</strong></div>}
              <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>Só de leitura aqui — o utilizador gere estas definições na app.</div>
            </>
          ) : <div style={{color:C.muted}}>Sem definições de privacidade (perfil não criado ou nunca configurado).</div>}
        </div>
      )}

      {view==='profile' && !p && <div style={{ color:C.muted, textAlign:'center', padding:20 }}>Sem perfil criado.</div>}
      {view==='profile' && p && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontSize:14, fontWeight:500, color:C.text2 }}>Perfil público</span>
            <button onClick={() => setEditing('profile')} style={{ background:C.primary, border:'none', borderRadius:8, padding:'6px 14px', color:'#0A141A', fontSize:12, fontWeight:600, cursor:'pointer', minHeight:32 }}>Guardar</button>
          </div>

          {/* Status + estado do perfil */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
            <div style={{ background:C.elevated, borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Estado</div>
              <select value={form.profileStatus} onChange={e => setForm(pr => ({...pr,profileStatus:e.target.value}))} style={{ background:'none', border:'none', color:C.primary, fontSize:13, fontWeight:600, cursor:'pointer', width:'100%', padding:0 }}>
                {['DRAFT','PENDING_REVIEW','APPROVED','REJECTED','HIDDEN','SUSPENDED'].map(s => <option key={s} value={s} style={{background:C.surface}}>{s}</option>)}
              </select>
            </div>
            <div style={{ background:C.elevated, borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Tipo</div>
              <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{p.type || 'INDIVIDUAL'}</div>
            </div>
          </div>

          {/* Campos editáveis */}
          {[
            ['Nome visível', form.displayName, 'displayName'],
            ['Bio',          form.bio,         'bio'],
            ['Cidade',       form.city,         'city'],
          ].map(([lbl,val,key]) => (
            <div key={key} style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{lbl}</label>
              {key==='bio'
                ? <textarea value={val} onChange={e => setForm(pr => ({...pr,[key]:e.target.value}))} rows={3} style={{ ...INP, resize:'none', marginBottom:0 }}/>
                : <input style={{ ...INP, marginBottom:0 }} value={val} onChange={e => setForm(pr => ({...pr,[key]:e.target.value}))}/>
              }
            </div>
          ))}

          {/* Read-only fields */}
          <div style={{ marginTop:14, padding:'12px 0', borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Campos só de leitura</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                ['Estado relacional', p.relationshipStatus],
                ['Discrição',         p.discretionLevel],
                ['Género',            p.gender],
                ['Orientação',        p.orientation],
                ['País',              p.country],
                ['Fotos',             `${p.photos?.length || 0} fotos`],
                ['Verificado',        p.user?.ageVerifiedAt ? '✅ Sim' : '❌ Não'],
                ['Criado em',         new Date(p.createdAt).toLocaleDateString('pt')],
              ].map(([label, value]) => value && (
                <div key={label} style={{ background:C.elevated, borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:12, color:C.text }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Intenções */}
          {p.intentions?.length > 0 && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Intenções</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {p.intentions.map(pi => (
                  <span key={pi.intention?.id} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>
                    {pi.intention?.name || pi.intention?.slug}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view==='history' && (
        <div>
          <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:C.primary }}>
            🔒 Histórico visível apenas a administradores
          </div>
          {history.length===0 && <p style={{color:C.muted}}>Sem histórico.</p>}
          {history.map(h => (
            <div key={h.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:C.primary, fontWeight:500, fontSize:12 }}>{h.action}</span>
                <span style={{ color:C.muted, fontSize:10 }}>{new Date(h.createdAt).toLocaleString('pt')}</span>
              </div>
              <div style={{ fontSize:11, color:C.text2 }}>Por: {h.admin?.email}</div>
              {h.reason && <div style={{ fontSize:11, color:C.text, marginTop:3 }}>Motivo: {h.reason}</div>}
              {h.previousData && (
                <details style={{ marginTop:6 }}>
                  <summary style={{ color:C.muted, fontSize:10, cursor:'pointer' }}>Ver alterações</summary>
                  <div style={{ marginTop:4, fontSize:10 }}>
                    <div style={{ color:C.muted }}>Antes: <code style={{color:C.text2}}>{JSON.stringify(h.previousData)}</code></div>
                    {h.newData && <div style={{ color:C.muted, marginTop:2 }}>Depois: <code style={{color:C.success}}>{JSON.stringify(h.newData)}</code></div>}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email:'', password:'', adminRole:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const save = async () => {
    if (!form.email || !form.password || !form.reason) return setErr('Email, password e motivo obrigatórios.')
    setSaving(true); setErr('')
    try { const r = await api.post('/admin/users', { email:form.email, password:form.password, adminRole:form.adminRole||undefined, reason:form.reason }); onCreated(r.data.user); onClose() }
    catch (e) { setErr(e.response?.data?.error||'Erro.') }
    finally { setSaving(false) }
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'24px 20px calc(32px + env(safe-area-inset-bottom))' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 18px' }}/>
        <h3 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:16, marginTop:0 }}>Criar utilizador</h3>
        {err && <div style={{ color:C.danger, fontSize:12, marginBottom:10 }}>{err}</div>}
        <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} type="email" placeholder="Email *" style={INP}/>
        <input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} type="password" placeholder="Password inicial *" style={INP}/>
        <select value={form.adminRole} onChange={e=>setForm(p=>({...p,adminRole:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
          <option value="">Utilizador normal</option>
          {['CONTENT_REVIEWER','SUPPORT','MODERATOR','FINANCE','ADMIN','SUPER_ADMIN'].map(r => <option key={r} value={r} style={{background:C.surface}}>{r}</option>)}
        </select>
        <input value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="Motivo *" style={INP}/>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:12, color:C.muted, fontSize:14, cursor:'pointer', minHeight:48 }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:12, color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer', opacity:saving?0.6:1, minHeight:48 }}>{saving?'…':'Criar utilizador'}</button>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all') // BETA.1.32 — 'all' | 'real' | 'test'
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (accountFilter !== 'all') params.set('accountFilter', accountFilter)
    const q = params.toString() ? `?${params.toString()}` : ''
    api.get(`/admin/users${q}`).then(r => setUsers(r.data.users||[]))
  }, [search, accountFilter])
  useEffect(() => { load() }, [load])
  if (selectedId) return <UserDetail userId={selectedId} onBack={() => { setSelectedId(null); load() }}/>
  return (
    <div>
      {showCreate && <CreateUserModal onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load()}}/>}
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar email ou nome..." style={{ ...INP, marginBottom:0, flex:1 }}/>
        <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} style={{ ...INP, marginBottom:0, width:'auto', cursor:'pointer' }}>
          <option value="all" style={{background:C.surface}}>Todas as contas</option>
          <option value="real" style={{background:C.surface}}>Contas reais</option>
          <option value="test" style={{background:C.surface}}>Contas de teste</option>
        </select>
        {me?.adminRole==='SUPER_ADMIN' && (
          <button onClick={()=>setShowCreate(true)} style={{ background:C.primary, border:'none', borderRadius:12, padding:'0 14px', color:'#0A141A', fontWeight:600, fontSize:13, minHeight:46, flexShrink:0, cursor:'pointer' }}>+ Criar</button>
        )}
      </div>
      {users.map(u => (
        <div key={u.id} onClick={()=>setSelectedId(u.id)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>
              {u.email}
              {u.adminRole && <span style={{ color:C.primary, fontSize:11, marginLeft:8, background:C.primaryDim, borderRadius:4, padding:'1px 6px' }}>{u.adminRole}</span>}
              {u.isTestAccount && <span style={{ color:'#C9956B', fontSize:11, marginLeft:8, background:'rgba(201,149,107,0.15)', borderRadius:4, padding:'1px 6px', fontWeight:600 }}>TEST</span>}
            </div>
            <div style={{ fontSize:12, color:C.muted }}>
              {u.profile?.displayName||'sem perfil'} · {u.status}
              {u.riskScore>30&&<span style={{color:C.danger}}> · risco {u.riskScore}</span>}
            </div>
          </div>
          <span style={{ color:C.muted, fontSize:18 }}>›</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Verifications ──────────────────────────────────────────────────────────── */
function VerificationsTab() {
  const [list, setList] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [rejecting, setRejecting] = useState(null) // userId currently being rejected
  const [msg, setMsg] = useState('')
  const load = useCallback(() => { api.get('/admin/verifications').then(r => setList(r.data.verifications||[])) }, [])
  useEffect(() => { load() }, [load])

  // Sprint 2.5.9: clicar no cartão abre o detalhe administrativo do utilizador,
  // sem sair do AdminLayout.
  if (selectedUserId) return <UserDetail userId={selectedUserId} onBack={() => { setSelectedUserId(null); load() }}/>

  const approve = async (userId) => {
    if (!confirm('Aprovar esta verificação de identidade?')) return
    setMsg('')
    const r = await api.put(`/admin/verifications/${userId}`, { status: 'APPROVED' })
    setList(p => p.filter(v => v.userId !== userId))
    if (r.data?.activation?.activated) setMsg('Verificação aprovada — conta activada automaticamente.')
  }
  const reject = async (userId, reason) => {
    setRejecting(null)
    await api.put(`/admin/verifications/${userId}`, { status: 'REJECTED', reason })
    setList(p => p.filter(v => v.userId !== userId))
  }

  return (
    <div>
      {rejecting && <ReasonModal title="Rejeitar verificação" onConfirm={(r)=>reject(rejecting, r)} onCancel={()=>setRejecting(null)}/>}
      {msg && <div style={{ background:C.successDim, border:`1px solid rgba(74,222,128,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.success, fontSize:13 }}>{msg}</div>}
      {list.length===0 && <p style={{color:C.muted}}>Sem verificações pendentes.</p>}
      {list.map(v => (
        <div key={v.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:8 }}>
          <div onClick={() => setSelectedUserId(v.userId)} style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:3 }}>{v.user?.profile?.displayName || 'Sem perfil'}</div>
              <div style={{ fontSize:12, color:C.muted }}>{v.user?.email}</div>
            </div>
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </div>
          {v.selfieStoragePath ? (
            <AdminSelfieImage userId={v.userId} />
          ) : (
            <div style={{ fontSize:12, color:C.muted, marginBottom:10, fontStyle:'italic' }}>Sem imagem associada.</div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>approve(v.userId)} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, fontSize:13, minHeight:42, cursor:'pointer' }}>Aprovar</button>
            <button onClick={()=>setRejecting(v.userId)} style={{ background:C.dangerDim,  border:`1px solid ${C.danger}`,  borderRadius:10, padding:10, color:C.danger,  fontSize:13, minHeight:42, cursor:'pointer' }}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Conversations ──────────────────────────────────────────────────────────── */
function ConversationsTab() {
  const [convs, setConvs] = useState([])
  const [selected, setSelected] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(() => { api.get('/admin/conversations').then(r => setConvs(r.data.conversations||[])) }, [])
  useEffect(() => { load() }, [load])
  const open = async c => {
    if (!reason.trim()) return setErr('Motivo obrigatório para aceder a conversas.')
    setErr('')
    const r = await api.get(`/admin/conversations/${c.id}?reason=${encodeURIComponent(reason)}`).catch(() => null)
    if (r) { setSelected(c); setMsgs(r.data.messages||[]) }
  }
  if (selected) return (
    <div>
      <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', marginBottom:14 }}>←</button>
      <div style={{ fontSize:11, color:C.warning, marginBottom:14, background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:10, padding:'8px 12px' }}>
        ⚠️ Este acesso foi registado no audit log.
      </div>
      {msgs.map(m => (
        <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:10, marginBottom:6 }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>{m.sender?.profile?.displayName || m.sender?.email} · {new Date(m.createdAt).toLocaleString('pt')}</div>
          <div style={{ fontSize:13, color: m.deletedAt ? C.muted : C.text }}>{m.deletedAt ? '[Eliminada]' : m.body}</div>
        </div>
      ))}
    </div>
  )
  return (
    <div>
      <div style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontSize:12, color:C.text2, fontWeight:500, marginBottom:8 }}>Motivo de acesso (obrigatório)</div>
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex: Investigar report #123" style={INP}/>
        {err && <div style={{ color:C.danger, fontSize:12 }}>{err}</div>}
      </div>
      {convs.length===0 && <p style={{color:C.muted}}>Sem conversas.</p>}
      {convs.map(c => (
        <div key={c.id} onClick={() => open(c)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{c.match?.profileOne?.displayName} ↔ {c.match?.profileTwo?.displayName}</div>
            <div style={{ fontSize:11, color:C.muted }}>{c._count?.messages || 0} mensagens</div>
          </div>
          <span style={{ color:C.muted, fontSize:18 }}>›</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Audit ──────────────────────────────────────────────────────────────────── */
function AuditTab() {
  const [logs, setLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [view, setView] = useState('logs')
  useEffect(() => {
    api.get('/admin/audit').then(r => setLogs(r.data.logs||[]))
    api.get('/admin/service/sessions').then(r => setSessions(r.data.sessions||[])).catch(()=>{})
  }, [])
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['logs','📋 Log'],['sessions','⏱ Sessões']].map(([k,l]) => (
          <button key={k} onClick={()=>setView(k)} style={{ background:view===k?C.primaryDim:C.surface, border:`1px solid ${view===k?C.primary:C.border}`, borderRadius:8, padding:'7px 14px', color:view===k?C.primary:C.muted, fontSize:13, cursor:'pointer', minHeight:36 }}>{l}</button>
        ))}
      </div>
      {view==='logs' && logs.map(l => (
        <div key={l.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', marginBottom:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ color:C.primary, fontWeight:500, fontSize:12 }}>{l.action}</span>
            <span style={{ color:C.muted, fontSize:10 }}>{new Date(l.createdAt).toLocaleString('pt')}</span>
          </div>
          <div style={{ fontSize:11, color:C.text2 }}>Por: {l.admin?.email}</div>
          {l.reason && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>↳ {l.reason}</div>}
        </div>
      ))}
      {view==='sessions' && (
        <div>
          {sessions.length===0 && <p style={{color:C.muted}}>Sem sessões registadas.</p>}
          {sessions.map(s => (
            <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', marginBottom:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ color:C.primary, fontSize:12, fontWeight:500 }}>{s.role}</span>
                <span style={{ color:s.endedAt?C.muted:C.success, fontSize:11 }}>{s.endedAt?`${s.durationMin}m`:'● Activo'}</span>
              </div>
              <div style={{ fontSize:11, color:C.muted }}>
                {new Date(s.startedAt).toLocaleString('pt')}
                {s.endedAt && ` → ${new Date(s.endedAt).toLocaleString('pt')}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Beta ───────────────────────────────────────────────────────────────────── */
function BetaTab() {
  const [invites, setInvites] = useState([])
  const [form, setForm] = useState({ email:'', maxUses:1 })
  const [newInvite, setNewInvite] = useState(null)
  const [copied, setCopied] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(()=>{ api.get('/admin/beta/invites').then(r=>setInvites(r.data.invites||[])) },[])
  useEffect(()=>{ load() },[load])
  const create = async () => {
    setErr('')
    try { const r = await api.post('/admin/beta/invites', { email:form.email||undefined, maxUses:Number(form.maxUses) }); setNewInvite(r.data); setForm({ email:'', maxUses:1 }); load() }
    catch(e){ setErr(e.response?.data?.error||'Erro.') }
  }
  const toggle = async id => { await api.put(`/admin/beta/invites/${id}/toggle`); load() }
  const del    = async id => { try { await api.delete(`/admin/beta/invites/${id}`); load() } catch(e){ setErr(e.response?.data?.error||'Erro.') } }
  const copy   = (url,id) => { navigator.clipboard.writeText(url).then(()=>{ setCopied(id); setTimeout(()=>setCopied(''),2000) }) }
  return (
    <div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:12, color:C.text2, fontWeight:500, marginBottom:10 }}>Criar convite beta</div>
        {err && <div style={{ color:C.danger, fontSize:12, marginBottom:8 }}>{err}</div>}
        <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="Email (opcional)" style={INP}/>
        <button onClick={create} style={{ width:'100%', background:C.primary, border:'none', borderRadius:12, padding:12, color:'#0A141A', fontWeight:600, fontSize:14, minHeight:46, cursor:'pointer' }}>Criar convite</button>
        {newInvite && <div style={{ marginTop:12, background:C.elevated, borderRadius:10, padding:'10px 12px', fontSize:12, color:C.text2, wordBreak:'break-all' }}>
          {newInvite.inviteUrl}
          <button onClick={()=>copy(newInvite.inviteUrl,'new')} style={{ marginLeft:8, color:C.primary, background:'none', border:'none', fontSize:12, cursor:'pointer' }}>{copied==='new'?'✓':'Copiar'}</button>
        </div>}
      </div>
      {invites.map(inv => {
        const url = `${window.location.origin}/join/${inv.code}`
        return (
          <div key={inv.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color:C.primary, fontWeight:600, fontSize:16, letterSpacing:1 }}>{inv.code}</span>
              <span style={{ color:inv.active?C.success:C.muted, fontSize:11 }}>{inv.active?'● Activo':'○ Inactivo'}</span>
            </div>
            <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>{inv.useCount}/{inv.maxUses} usos{inv.email&&` · ${inv.email}`}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>copy(url,inv.id)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', color:C.text2, fontSize:12, cursor:'pointer', minHeight:36 }}>{copied===inv.id?'✓':'📋 Copiar'}</button>
              <button onClick={()=>toggle(inv.id)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', color:C.text2, fontSize:12, cursor:'pointer', minHeight:36 }}>{inv.active?'Desactivar':'Activar'}</button>
              {!inv.usedById && <button onClick={()=>del(inv.id)} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:'7px 12px', color:C.danger, fontSize:12, cursor:'pointer', minHeight:36 }}>Apagar</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}



/* ─── Email Diagnostic Panel ─────────────────────────────────────────────────── */
function EmailDiagnosticPanel() {
  const [diag, setDiag] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testMsg, setTestMsg] = useState('')
  const [testErr, setTestErr] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpUrl, setOtpUrl] = useState('')

  const runDiag = async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/email-config')
      setDiag(r.data)
    } catch { setDiag({ status: 'error', message: 'Não foi possível obter diagnóstico.' }) }
    finally { setLoading(false) }
  }

  const sendTest = async () => {
    setTestMsg(''); setTestErr('')
    try {
      await api.post('/admin/test-email', { to: testTo })
      setTestMsg(`Email enviado para ${testTo}`)
    } catch (e) { setTestErr(e.response?.data?.detail || e.response?.data?.error || 'Erro') }
  }

  const genOtp = async () => {
    try {
      const r = await api.post('/auth/otp', { targetEmail: otpEmail })
      setOtpUrl(r.data.loginUrl)
    } catch (e) { setTestErr(e.response?.data?.error || 'Erro ao gerar OTP') }
  }

  useEffect(() => { runDiag() }, [])

  return (
    <div>
      {/* SMTP Status */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:500, color:C.text }}>Configuração SMTP</div>
          <button onClick={runDiag} disabled={loading} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer' }}>
            {loading ? '…' : '↻ Testar'}
          </button>
        </div>

        {diag && (
          <>
            <div style={{ display:'inline-block', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:500, marginBottom:12,
              background: diag.status==='ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color: diag.status==='ok' ? C.success : C.danger,
              border: `1px solid ${diag.status==='ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            }}>
              {diag.status==='ok' ? '✅ SMTP ligado' : diag.status==='misconfigured' ? '⚠️ Não configurado' : '❌ Erro de ligação'}
            </div>

            {diag.message && diag.status !== 'ok' && (
              <div style={{ fontSize:12, color:C.danger, marginBottom:10, fontFamily:'monospace', background:C.elevated, borderRadius:8, padding:'8px 10px' }}>
                {diag.message}
              </div>
            )}

            {diag.missing?.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:C.danger, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Variáveis em falta no Railway:</div>
                {diag.missing.map(k => (
                  <div key={k} style={{ fontFamily:'monospace', fontSize:12, color:C.danger, background:'rgba(248,113,113,0.05)', padding:'3px 8px', borderRadius:4, marginBottom:3 }}>{k}</div>
                ))}
              </div>
            )}

            {diag.hints && (
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Sugestões:</div>
                {diag.hints.map((h,i) => (
                  <div key={i} style={{ fontSize:12, color:C.text2, marginBottom:3 }}>• {h}</div>
                ))}
              </div>
            )}

            {diag.config && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Valores actuais:</div>
                {Object.entries(diag.config).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', gap:8, fontSize:12, marginBottom:2 }}>
                    <span style={{ color:C.muted, minWidth:120, fontFamily:'monospace' }}>{k}</span>
                    <span style={{ color: v ? C.text2 : C.danger, fontFamily:'monospace' }}>{v || '(não definido)'}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Test email */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:12 }}>Enviar email de teste</div>
        {testMsg && <div style={{ color:C.success, fontSize:13, marginBottom:8 }}>{testMsg}</div>}
        {testErr && <div style={{ color:C.danger, fontSize:12, fontFamily:'monospace', marginBottom:8, background:C.elevated, borderRadius:8, padding:'8px 10px' }}>{testErr}</div>}
        <div style={{ display:'flex', gap:8 }}>
          <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="email@destino.com" style={{ ...INP, marginBottom:0, flex:1 }}/>
          <button onClick={sendTest} disabled={!testTo} style={{ background:C.primary, border:'none', borderRadius:10, padding:'0 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', flexShrink:0 }}>Enviar</button>
        </div>
      </div>

      {/* OTP login (emergency) */}
      <div style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:4 }}>Login de emergência (OTP)</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:12, lineHeight:1.5 }}>
          Gera um link de login único (15 min) para um utilizador sem precisar de email.
          Útil quando o SMTP não está configurado.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={otpEmail} onChange={e=>setOtpEmail(e.target.value)} placeholder="email do utilizador" style={{ ...INP, marginBottom:0, flex:1 }}/>
          <button onClick={genOtp} disabled={!otpEmail} style={{ background:C.elevated, border:`1px solid ${C.primary}`, borderRadius:10, padding:'0 14px', color:C.primary, fontWeight:600, fontSize:13, cursor:'pointer', flexShrink:0 }}>Gerar</button>
        </div>
        {otpUrl && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Link de login (1 uso · 15 min):</div>
            <div style={{ background:C.bg, borderRadius:8, padding:'10px 12px', fontSize:11, color:C.primary, fontFamily:'monospace', wordBreak:'break-all', marginBottom:6 }}>{otpUrl}</div>
            <button onClick={() => navigator.clipboard.writeText(otpUrl)}
              style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted, fontSize:12, cursor:'pointer' }}>
              Copiar link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


/* ─── Guide Manager (Between Guide content) ─────────────────────────────────── */
// 10.2 — controlled catalog (matches server's GuideCategory enum exactly).
// GUIDE_CAT_LABELS maps enum value -> PT display label for the admin UI;
// GUIDE_CATS is the list of enum values the picker cycles through.
const GUIDE_CAT_LABELS = {
  CONSENT: 'Consentimento', COUPLES: 'Casais', OPEN_RELATIONSHIPS: 'Relações abertas',
  POLYAMORY: 'Poliamor', PRIVACY: 'Privacidade', SAFETY: 'Segurança',
  PROFILES: 'Perfil', FIRST_MEETINGS: 'Primeiros encontros', PRIVATE_INTERESTS: 'Interesses privados',
}
const GUIDE_CATS = Object.keys(GUIDE_CAT_LABELS)
const GUIDE_ICONS = ['○','◎','◉','◌','◑','◈','⊙','∞','✓','⚑']

function AffiliateRuleManager() {
  const [rule, setRule] = useState(null)
  const [form, setForm] = useState({ referralsRequired: 2, rewardMonths: 2 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = () => {
    api.get('/admin/referral-rule').then(r => {
      setRule(r.data.rule)
      setForm({ referralsRequired: r.data.rule.referralsRequired, rewardMonths: r.data.rule.rewardMonths })
    }).catch(() => {})
  }
  useEffect(load, [])

  const save = async () => {
    setSaving(true); setErr(''); setMsg('')
    try {
      const r = await api.put('/admin/referral-rule', {
        referralsRequired: Number(form.referralsRequired),
        rewardMonths: Number(form.rewardMonths),
      })
      setRule(r.data.rule)
      setMsg('Regra actualizada.')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao guardar.')
    } finally { setSaving(false) }
  }

  if (!rule) return <div style={{ color:C.muted, fontSize:13 }}>A carregar...</div>

  return (
    <div>
      <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:C.primary, lineHeight:1.5 }}>
        Regra de recompensa por convites. Editável aqui — nunca fixa no código.
        Quando um utilizador atinge o número de convites subscritos definido abaixo, ganha os meses de prémio automaticamente.
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, maxWidth:420 }}>
        <label style={{ fontSize:12, color:C.text2, fontWeight:600, display:'block', marginBottom:6 }}>
          Convites subscritos necessários
        </label>
        <input type="number" min="1" value={form.referralsRequired}
          onChange={e => setForm(f => ({ ...f, referralsRequired: e.target.value }))}
          style={{ width:'100%', background:C.elevated, border:`1.5px solid ${C.border}`, borderRadius:10,
            padding:'10px 14px', color:C.text, fontSize:14, marginBottom:16, boxSizing:'border-box' }} />

        <label style={{ fontSize:12, color:C.text2, fontWeight:600, display:'block', marginBottom:6 }}>
          Meses de prémio oferecidos
        </label>
        <input type="number" min="1" value={form.rewardMonths}
          onChange={e => setForm(f => ({ ...f, rewardMonths: e.target.value }))}
          style={{ width:'100%', background:C.elevated, border:`1.5px solid ${C.border}`, borderRadius:10,
            padding:'10px 14px', color:C.text, fontSize:14, marginBottom:18, boxSizing:'border-box' }} />

        {err && <div style={{ color:C.danger, fontSize:13, marginBottom:12 }}>{err}</div>}
        {msg && <div style={{ color:C.success, fontSize:13, marginBottom:12 }}>{msg}</div>}

        <button onClick={save} disabled={saving} style={{
          background:C.primary, border:'none', borderRadius:10, padding:'11px 20px',
          color:'#0A141A', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          {saving ? 'A guardar...' : 'Guardar regra'}
        </button>

        <div style={{ marginTop:16, fontSize:12, color:C.muted, lineHeight:1.5 }}>
          Regra atual: cada <strong style={{color:C.text}}>{rule.referralsRequired}</strong> pessoas convidadas que subscrevam
          dão <strong style={{color:C.text}}>{rule.rewardMonths}</strong> meses de prémio ao convidador.
        </div>
      </div>
    </div>
  )
}

function GuideManager() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // null | 'new' | article object
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ title:'', category:'PRIVACY', summary:'', body:'', icon:'○', published:false, sortOrder:0, slug:'', locale:'pt', seoTitle:'', seoDescription:'' })

  const load = useCallback(() => {
    api.get('/guide/admin/all').then(r => setArticles(r.data.articles||[])).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setForm({ title:'', category:'PRIVACY', summary:'', body:'', icon:'○', published:false, sortOrder: articles.length, slug:'', locale:'pt', seoTitle:'', seoDescription:'' })
    setEditing('new')
    setMsg(''); setErr('')
  }

  const openEdit = (a) => {
    setForm({ title:a.title, category:a.category, summary:a.summary||'', body:a.body||'', icon:a.icon||'○', published:a.published, sortOrder:a.sortOrder||0, slug:a.slug||'', locale:a.locale||'pt', seoTitle:a.seoTitle||'', seoDescription:a.seoDescription||'' })
    setEditing(a)
    setMsg(''); setErr('')
  }

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return setErr('Título e conteúdo obrigatórios.')
    setSaving(true); setMsg(''); setErr('')
    try {
      if (editing === 'new') {
        await api.post('/guide/admin', form)
        setMsg('Artigo criado.')
      } else {
        await api.put(`/guide/admin/${editing.id}`, form)
        setMsg('Artigo guardado.')
      }
      setEditing(null); load()
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao guardar.')
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Eliminar artigo?')) return
    await api.delete(`/guide/admin/${id}`).catch(()=>{})
    load()
  }

  const togglePublish = async (a) => {
    // 10.3 — explicit publish/unpublish actions (not a raw PUT of the
    // boolean) so the server's applyPublishState bridge keeps
    // published/publishedAt in sync in exactly one place.
    await api.post(`/guide/admin/${a.id}/${a.published ? 'unpublish' : 'publish'}`).catch(()=>{})
    load()
  }

  // ── Editor ──
  if (editing !== null) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <button onClick={() => setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>
          {editing === 'new' ? 'Novo artigo' : 'Editar artigo'}
        </h3>
        <button onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', opacity:saving?0.6:1 }}>
          {saving ? '…' : 'Guardar'}
        </button>
      </div>

      {msg && <div style={{ color:C.success, fontSize:13, marginBottom:10 }}>{msg}</div>}
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}

      {/* Icon picker */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Ícone</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {GUIDE_ICONS.map(ic => (
            <button key={ic} onClick={() => setForm(p=>({...p,icon:ic}))} style={{
              width:36, height:36, borderRadius:8, border:`1.5px solid ${form.icon===ic?C.primary:C.border}`,
              background:form.icon===ic?C.primaryDim:C.elevated, fontSize:18, cursor:'pointer', color:form.icon===ic?C.primary:C.text2
            }}>{ic}</button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Categoria</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {GUIDE_CATS.map(c => (
            <button key={c} onClick={() => setForm(p=>({...p,category:c}))} style={{
              background:form.category===c?C.primaryDim:C.elevated,
              border:`1px solid ${form.category===c?C.primary:C.border}`,
              borderRadius:8, padding:'6px 12px', color:form.category===c?C.primary:C.text2, fontSize:12, cursor:'pointer'
            }}>{GUIDE_CAT_LABELS[c]}</button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Título *</div>
        <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
          placeholder="Título do artigo"
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14 }}/>
      </div>

      {/* Summary */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Resumo</div>
        <input value={form.summary} onChange={e=>setForm(p=>({...p,summary:e.target.value}))}
          placeholder="Uma linha que aparece na lista"
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14 }}/>
      </div>

      {/* Slug / Locale — 10.1: slug is optional on create (auto-generated
          from the title), editable afterwards; locale defaults to 'pt'. */}
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:2 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Slug</div>
          <input value={form.slug} onChange={e=>setForm(p=>({...p,slug:e.target.value}))}
            placeholder="gerado automaticamente se vazio"
            style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box' }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Idioma</div>
          <input value={form.locale} onChange={e=>setForm(p=>({...p,locale:e.target.value}))}
            placeholder="pt"
            style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box' }}/>
        </div>
      </div>

      {/* Body */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Conteúdo *</div>
        <textarea value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))}
          placeholder="Escreve o conteúdo completo do artigo..."
          rows={12}
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, resize:'vertical', lineHeight:1.6 }}/>
      </div>

      {/* SEO (optional) */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>SEO título (opcional)</div>
        <input value={form.seoTitle} onChange={e=>setForm(p=>({...p,seoTitle:e.target.value}))}
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, marginBottom:10, boxSizing:'border-box' }}/>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>SEO descrição (opcional)</div>
        <input value={form.seoDescription} onChange={e=>setForm(p=>({...p,seoDescription:e.target.value}))}
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box' }}/>
      </div>

      {/* Published toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.elevated, borderRadius:10, padding:'12px 14px' }}>
        <div>
          <div style={{ fontSize:14, color:C.text }}>Publicado</div>
          <div style={{ fontSize:12, color:C.muted }}>Visível para os utilizadores</div>
        </div>
        <div onClick={() => setForm(p=>({...p,published:!p.published}))} style={{
          width:44, height:24, borderRadius:12, cursor:'pointer',
          background:form.published?C.primary:C.input, position:'relative', border:`1px solid ${form.published?C.primary:C.border}`,
        }}>
          <div style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'white', left:form.published?23:3, transition:'left 0.2s' }}/>
        </div>
      </div>
    </div>
  )

  // ── List ──
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:500, color:C.text }}>Artigos do Between Guide</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{articles.length} artigos · {articles.filter(a=>a.published).length} publicados</div>
        </div>
        <button onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>
          + Novo artigo
        </button>
      </div>

      {loading && <div style={{ color:C.muted, padding:20, textAlign:'center' }}>A carregar…</div>}

      {!loading && articles.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>◈</div>
          <div>Ainda sem artigos no Guia.</div>
          <div style={{ fontSize:13, marginTop:6 }}>Cria o primeiro artigo para os utilizadores.</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {articles.map(a => (
          <div key={a.id} style={{ background:C.surface, border:`1px solid ${a.published?'rgba(74,222,128,0.2)':C.border}`, borderRadius:14, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ fontSize:20, width:28, textAlign:'center', flexShrink:0, marginTop:2 }}>{a.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:2 }}>{a.title}</div>
                <div style={{ fontSize:11, color:C.muted }}>
                  {GUIDE_CAT_LABELS[a.category] || a.category} · {a.locale || 'pt'} · {a.published ? <span style={{color:C.success}}>● Publicado</span> : <span>○ Rascunho</span>}
                </div>
                {a.summary && <div style={{ fontSize:12, color:C.text2, marginTop:4, lineHeight:1.4 }}>{a.summary}</div>}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              <button onClick={() => openEdit(a)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer' }}>
                ✏️ Editar
              </button>
              <button onClick={() => togglePublish(a)} style={{ background:a.published?C.dangerDim:C.successDim, border:`1px solid ${a.published?C.danger:C.success}`, borderRadius:6, padding:'5px 12px', color:a.published?C.danger:C.success, fontSize:12, cursor:'pointer' }}>
                {a.published ? 'Despublicar' : 'Publicar'}
              </button>
              <button onClick={() => del(a.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted, fontSize:12, cursor:'pointer' }}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Events Manager (10.8 — moderation queue, mandatory approval) ─────────── */
function EventsManager() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING_REVIEW')

  const load = useCallback(() => {
    setLoading(true)
    const url = filter === 'PENDING_REVIEW' ? '/events/admin/queue' : '/events/admin/all'
    api.get(url).then(r => setEvents(r.data.events || [])).catch(() => {}).finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  const act = async (id, action) => {
    await api.post(`/events/admin/${id}/${action}`).catch(() => {})
    load()
  }

  const STATUS_LABEL = {
    DRAFT: 'Rascunho', PENDING_REVIEW: 'Em revisão', PUBLISHED: 'Publicado',
    CANCELLED: 'Cancelado', COMPLETED: 'Concluído', SUSPENDED: 'Suspenso',
  }
  const STATUS_COLOR = {
    PENDING_REVIEW: C.warning, PUBLISHED: C.success, CANCELLED: C.danger,
    SUSPENDED: C.danger, DRAFT: C.muted, COMPLETED: C.muted,
  }

  return (
    <div>
      <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:C.primary, lineHeight:1.5 }}>
        10.8 — todo o evento passa por aprovação manual antes de ficar visível. Nenhuma criação de evento é aberta ou não moderada.
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['PENDING_REVIEW','Fila de revisão'],['ALL','Todos']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            background:filter===k?C.primaryDim:C.surface, border:`1.5px solid ${filter===k?C.primary:C.border}`,
            borderRadius:10, padding:'8px 14px', color:filter===k?C.primary:'#C8D4DC', fontSize:13, cursor:'pointer'
          }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ color:C.muted, padding:20, textAlign:'center' }}>A carregar…</div>}
      {!loading && events.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted }}>Sem eventos {filter==='PENDING_REVIEW' ? 'pendentes' : ''}.</div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {events.map(e => (
          <div key={e.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{e.title}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  {e.city}, {e.country} · {new Date(e.startsAt).toLocaleDateString('pt-PT')} · organizador: {e.organizerProfile?.displayName || e.organizerProfileId}
                </div>
              </div>
              <span style={{ fontSize:11, color:STATUS_COLOR[e.status]||C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:'3px 8px', flexShrink:0 }}>
                {STATUS_LABEL[e.status] || e.status}
              </span>
            </div>
            {e.status === 'PENDING_REVIEW' && (
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                <button onClick={() => act(e.id, 'approve')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:6, padding:'5px 12px', color:C.success, fontSize:12, cursor:'pointer' }}>Aprovar</button>
                <button onClick={() => act(e.id, 'reject')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:6, padding:'5px 12px', color:C.danger, fontSize:12, cursor:'pointer' }}>Rejeitar</button>
              </div>
            )}
            {e.status === 'PUBLISHED' && (
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                <button onClick={() => act(e.id, 'suspend')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:6, padding:'5px 12px', color:C.danger, fontSize:12, cursor:'pointer' }}>Suspender</button>
              </div>
            )}
            {e.status === 'SUSPENDED' && (
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                <button onClick={() => act(e.id, 'resume')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:6, padding:'5px 12px', color:C.success, fontSize:12, cursor:'pointer' }}>Retomar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Circles Manager (10.11 — admin-curated only, no user-facing creation) ── */
function CirclesManager() {
  const [circles, setCircles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', description:'', city:'', country:'', visibility:'DISCOVERABLE', status:'DRAFT' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    api.get('/circles/admin/all').then(r => setCircles(r.data.circles || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ name:'', description:'', city:'', country:'', visibility:'DISCOVERABLE', status:'DRAFT' }); setEditing('new'); setErr('') }
  const openEdit = (c) => { setForm({ name:c.name, description:c.description||'', city:c.city||'', country:c.country||'', visibility:c.visibility, status:c.status }); setEditing(c); setErr('') }

  const save = async () => {
    if (!form.name.trim()) return setErr('Nome obrigatório.')
    setSaving(true); setErr('')
    try {
      if (editing === 'new') await api.post('/circles/admin', form)
      else await api.put(`/circles/admin/${editing.id}`, form)
      setEditing(null); load()
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao guardar.')
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Eliminar Circle?')) return
    await api.delete(`/circles/admin/${id}`).catch(() => {})
    load()
  }

  const VIS_LABEL = { DISCOVERABLE:'Descoberta pública', PRIVATE:'Privado (link direto)', INVITE_ONLY:'Apenas convite' }
  const STATUS_LABEL = { DRAFT:'Rascunho', ACTIVE:'Ativo', PAUSED:'Pausado', ARCHIVED:'Arquivado' }

  if (editing !== null) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <button onClick={() => setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>{editing === 'new' ? 'Novo Circle' : 'Editar Circle'}</h3>
        <button onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'…':'Guardar'}</button>
      </div>
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}

      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Nome *</div>
        <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box' }}/>
      </div>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Descrição</div>
        <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={4}
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box', resize:'vertical' }}/>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Cidade</div>
          <input value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))}
            style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box' }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>País</div>
          <input value={form.country} onChange={e=>setForm(p=>({...p,country:e.target.value}))}
            style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px', color:C.text, fontSize:14, boxSizing:'border-box' }}/>
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Visibilidade</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {Object.keys(VIS_LABEL).map(v => (
            <button key={v} onClick={() => setForm(p=>({...p,visibility:v}))} style={{
              background:form.visibility===v?C.primaryDim:C.elevated, border:`1px solid ${form.visibility===v?C.primary:C.border}`,
              borderRadius:8, padding:'6px 12px', color:form.visibility===v?C.primary:C.text2, fontSize:12, cursor:'pointer'
            }}>{VIS_LABEL[v]}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Estado</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {Object.keys(STATUS_LABEL).map(v => (
            <button key={v} onClick={() => setForm(p=>({...p,status:v}))} style={{
              background:form.status===v?C.primaryDim:C.elevated, border:`1px solid ${form.status===v?C.primary:C.border}`,
              borderRadius:8, padding:'6px 12px', color:form.status===v?C.primary:C.text2, fontSize:12, cursor:'pointer'
            }}>{STATUS_LABEL[v]}</button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:C.primary, lineHeight:1.5 }}>
        10.11 — Circles só podem ser criados aqui. Não existe nenhuma rota pública de criação, por decisão de segurança e moderação.
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{circles.length} Circles</div>
        <button onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>+ Novo Circle</button>
      </div>
      {loading && <div style={{ color:C.muted, padding:20, textAlign:'center' }}>A carregar…</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {circles.map(c => (
          <div key={c.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px' }}>
            <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{c.name}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
              {c.slug} · {VIS_LABEL[c.visibility]} · {STATUS_LABEL[c.status]} {c.city ? `· ${c.city}` : ''}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              <button onClick={() => openEdit(c)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer' }}>✏️ Editar</button>
              <button onClick={() => del(c.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted, fontSize:12, cursor:'pointer' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Recommendations Manager (Sprint 11 — shadow mode / A-B dashboard) ────
   Read + weight-tuning only. The actual on/off switches
   (INTELLIGENT_RECOMMENDATIONS_SHADOW_MODE / _ENABLED) are env vars, not
   toggleable here by design — see recommendations.ts's header comment. ── */
// 11.5.8 — Admin Recommendations UX states. "—" alone reads as an error to
// an admin who doesn't know the internals; every empty/insufficient state
// gets an explicit sentence instead, and a single banner at the top gives
// the one-line answer to "is this ready to look at yet?" before the admin
// has to read four separate cards to figure that out themselves.
const RECOMMENDATION_STATE_COPY = {
  NO_DATA: { label: 'SEM DADOS', color: 'muted', text: 'O modo shadow ainda não gravou nenhuma decisão de ranking. Isto é normal logo após o deploy — ainda não há dados para mostrar.' },
  COLLECTING_DATA: { label: 'A RECOLHER DADOS', color: 'primary', text: 'O modo shadow está a recolher dados em produção. Ainda não há amostra suficiente para uma leitura fiável.' },
  INSUFFICIENT_SAMPLE: { label: 'AMOSTRA INSUFICIENTE', color: 'primary', text: 'Não há dados suficientes para comparar os cohorts com confiança. Os números abaixo são apenas diagnóstico — não devem motivar uma decisão ainda.' },
  READY_FOR_REVIEW: { label: 'PRONTO PARA REVISÃO', color: 'success', text: 'Amostra suficiente em ambos os cohorts e sem sinais de alerta nos guardrails. Pode ser revisto com confiança.' },
  GUARDRAIL_CONCERN: { label: 'ALERTA DE GUARDRAIL', color: 'danger', text: 'Amostra suficiente, mas pelo menos um guardrail de segurança piorou no cohort RECOMMENDATION_V1. Ver detalhes abaixo.' },
}

function RecommendationsManager() {
  const [status, setStatus] = useState(null)
  const [weights, setWeights] = useState(null)
  const [form, setForm] = useState({})
  const [shadow, setShadow] = useState(null)
  const [guardrails, setGuardrails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/recommendations/status').then(r => r.data).catch(() => null),
      api.get('/admin/recommendations/weights').then(r => r.data).catch(() => null),
      api.get('/admin/recommendations/shadow-analysis?days=14').then(r => r.data).catch(() => null),
      api.get('/admin/recommendations/guardrails?days=14').then(r => r.data).catch(() => null),
    ]).then(([s, w, sh, g]) => {
      setStatus(s); setWeights(w); if (w) setForm(w.weights); setShadow(sh); setGuardrails(g)
    }).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const saveWeights = async () => {
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.put('/admin/recommendations/weights', form)
      setMsg('Pesos actualizados.')
      load()
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao guardar.')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ color:C.muted, padding:20, textAlign:'center' }}>A carregar…</div>

  const pct = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`

  // 11.5.8 — overall state derivation. Order matters: check most-specific
  // (no data at all) before the more nuanced ones.
  const rankSample = shadow?.rankCorrelation?.sampleSize ?? 0
  const guardrailsSufficient = guardrails?.dataSufficient === true
  const guardrailConcern = guardrailsSufficient && guardrails?.recommendDisable === true

  let overallState = 'NO_DATA'
  if (rankSample === 0 && (guardrails?.sample?.control ?? 0) === 0 && (guardrails?.sample?.recommendation ?? 0) === 0) {
    overallState = 'NO_DATA'
  } else if (guardrailConcern) {
    overallState = 'GUARDRAIL_CONCERN'
  } else if (guardrailsSufficient) {
    overallState = 'READY_FOR_REVIEW'
  } else if (guardrails?.reason === 'INSUFFICIENT_SAMPLE') {
    overallState = 'INSUFFICIENT_SAMPLE'
  } else {
    overallState = 'COLLECTING_DATA'
  }
  const stateCopy = RECOMMENDATION_STATE_COPY[overallState]
  const stateColor = { muted: C.muted, primary: C.primary, success: C.success, danger: C.danger }[stateCopy.color]

  return (
    <div>
      <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:12, padding:'12px 16px', marginBottom:14, fontSize:13, color:C.primary, lineHeight:1.5 }}>
        Layer 3 (RecommendationRanker) nunca introduz um perfil excluído pelo eligibility pipeline — só reordena/anota o que o Discovery já produziu. Flags de on/off são variáveis de ambiente (não editáveis aqui), por decisão de segurança.
      </div>

      {/* 11.5.8 — top-level state banner */}
      <div style={{ background:C.surface, border:`1.5px solid ${stateColor}`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13 }}>
        <div style={{ fontWeight:700, color:stateColor, marginBottom:4 }}>{stateCopy.label}</div>
        <div style={{ color:C.text2, lineHeight:1.5 }}>{stateCopy.text}</div>
        {!status?.shadowModeEnabled && (
          <div style={{ marginTop:6, color:C.muted }}>A recomendação ranking não está ativa para nenhum utilizador — só afeta o que este painel mostra.</div>
        )}
      </div>

      {/* Status */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:10 }}>Estado</div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:13 }}>
          <div>Shadow mode: <strong style={{ color: status?.shadowModeEnabled ? C.success : C.muted }}>{status?.shadowModeEnabled ? 'ATIVO' : 'inativo'}</strong></div>
          <div>A/B test: <strong style={{ color: status?.intelligentRecommendationsEnabled ? C.success : C.muted }}>{status?.intelligentRecommendationsEnabled ? 'ATIVO (ranking real é aplicado a utilizadores)' : 'inativo — recomendação de ranking não é aplicada a nenhum utilizador'}</strong></div>
          <div>Modelo: <span style={{ color:C.text2 }}>{status?.modelVersion}</span></div>
        </div>
      </div>

      {/* Weights */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:4 }}>Pesos de sinais ({weights?.configVersion})</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>Editável — nunca fixo no código. Ponto de partida conceptual, não valores finais.</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10 }}>
          {Object.keys(form).map(key => (
            <div key={key}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{key}</div>
              <input type="number" step="0.1" value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))}
                style={{ width:'100%', background:C.elevated, border:`1.5px solid ${C.border}`, borderRadius:8, padding:'8px 10px', color:C.text, fontSize:13, boxSizing:'border-box' }}/>
            </div>
          ))}
        </div>
        {err && <div style={{ color:C.danger, fontSize:13, marginTop:12 }}>{err}</div>}
        {msg && <div style={{ color:C.success, fontSize:13, marginTop:12 }}>{msg}</div>}
        <button onClick={saveWeights} disabled={saving} style={{ marginTop:14, background:C.primary, border:'none', borderRadius:10, padding:'9px 18px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', opacity:saving?0.6:1 }}>
          {saving ? 'A guardar...' : 'Guardar pesos'}
        </button>
      </div>

      {/* Shadow analysis */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:10 }}>Shadow analysis (últimos {shadow?.sinceDays ?? 14} dias)</div>
        {rankSample === 0 ? (
          <div style={{ fontSize:13, color:C.muted }}>O modo shadow está a recolher dados. Ainda não há pares de ranking suficientes para calcular estas métricas.</div>
        ) : (
          <>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:13, color:C.text2 }}>
              <div>
                Rank correlation: <strong style={{color:C.text}}>{shadow.rankCorrelation.correlation != null ? shadow.rankCorrelation.correlation.toFixed(2) : '—'}</strong>
                {!shadow.rankCorrelation.dataSufficient && <span style={{ color:C.muted, fontSize:11 }}> (amostra pequena: {rankSample})</span>}
              </div>
              <div>Like rate (top 10 atual): <strong style={{color:C.text}}>{pct(shadow?.likeProjection?.currentTopNLikeRate)}</strong></div>
              <div>Like rate (top 10 recomendado): <strong style={{color:C.text}}>{pct(shadow?.likeProjection?.recommendationTopNLikeRate)}</strong></div>
            </div>
            {shadow?.likeProjection?.dataSufficient === false && (
              <div style={{ marginTop:8, fontSize:11, color:C.muted }}>Amostra ainda pequena (n={shadow.likeProjection.sampleSize}) — like rate acima é apenas indicativo.</div>
            )}
          </>
        )}
        <div style={{ marginTop:12, fontSize:12, color:C.muted }}>
          Meaningful Connection Rate — CONTROL: <strong style={{color:C.text2}}>{pct(shadow?.meaningfulConnectionRateByCohort?.CONTROL?.rate)}</strong>
          {shadow?.meaningfulConnectionRateByCohort?.CONTROL?.dataSufficient === false && ' (amostra pequena)'}
          {' '}· RECOMMENDATION_V1: <strong style={{color:C.text2}}>{pct(shadow?.meaningfulConnectionRateByCohort?.RECOMMENDATION_V1?.rate)}</strong>
          {shadow?.meaningfulConnectionRateByCohort?.RECOMMENDATION_V1?.dataSufficient === false && ' (amostra pequena)'}
        </div>
      </div>

      {/* Guardrails */}
      <div style={{ background:C.surface, border:`1px solid ${guardrailConcern ? C.danger : C.border}`, borderRadius:16, padding:18 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:10 }}>Guardrails A/B (últimos {guardrails?.sinceDays ?? 14} dias)</div>
        {!guardrailsSufficient && (
          <div style={{ marginBottom:12, fontSize:12, color:C.muted }}>
            Amostra insuficiente para uma comparação fiável (CONTROL: {guardrails?.sample?.control ?? 0}, RECOMMENDATION_V1: {guardrails?.sample?.recommendation ?? 0}). Os valores abaixo são apenas diagnóstico.
          </div>
        )}
        <table style={{ width:'100%', fontSize:12, color:C.text2, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ textAlign:'left', color:C.muted }}>
              <th style={{ padding:'4px 8px' }}></th>
              <th style={{ padding:'4px 8px' }}>Bloqueios</th>
              <th style={{ padding:'4px 8px' }}>Denúncias</th>
              <th style={{ padding:'4px 8px' }}>Safe Exit</th>
              <th style={{ padding:'4px 8px' }}>Abandono de match</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding:'4px 8px' }}>CONTROL (n={guardrails?.control?.profileCount ?? 0})</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.control?.blockRate)}</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.control?.reportRate)}</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.control?.safeExitRate)}</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.control?.matchAbandonmentRate)}</td>
            </tr>
            <tr>
              <td style={{ padding:'4px 8px' }}>RECOMMENDATION_V1 (n={guardrails?.recommendationV1?.profileCount ?? 0})</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.recommendationV1?.blockRate)}</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.recommendationV1?.reportRate)}</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.recommendationV1?.safeExitRate)}</td>
              <td style={{ padding:'4px 8px' }}>{pct(guardrails?.recommendationV1?.matchAbandonmentRate)}</td>
            </tr>
          </tbody>
        </table>
        {guardrailConcern && (
          <div style={{ marginTop:12, background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.danger }}>
            ⚠ Recomendação: considerar desativar INTELLIGENT_RECOMMENDATIONS_ENABLED.
            {guardrails.concerns.map((c, i) => <div key={i} style={{ marginTop:4 }}>{c}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Configurações Tab (SUPER_ADMIN only) ───────────────────────────────────── */
const ROLES_CONFIG = [
  { value:'CONTENT_REVIEWER', label:'Revisor de conteúdo', desc:'Fotos e perfis', perms:['photos','profiles'] },
  { value:'SUPPORT',          label:'Suporte',             desc:'Utilizadores e reports', perms:['users','reports'] },
  { value:'MODERATOR',        label:'Moderador',           desc:'Perfis, fotos, conversas', perms:['profiles','photos','conversations'] },
  { value:'FINANCE',          label:'Financeiro',          desc:'Subscrições e métricas', perms:['users'] },
  { value:'ADMIN',            label:'Admin',               desc:'Tudo excepto roles', perms:['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta'] },
  { value:'SUPER_ADMIN',      label:'Super Admin',         desc:'Acesso total incluindo roles e configurações', perms:['*'] },
]

/* ─── Admin Account Area (Conta / Perfil Público / Subscrição / Segurança) ────
   Reached only via o badge/menu "Conta (Admin)" — nunca pelas tabs normais.
   Mantém o admin dentro do AdminLayout em vez de o mandar para o AppShell
   mobile do utilizador comum (Sprint 2.5.2). ────────────────────────────── */
const RELATIONSHIP_STATUSES = ['SINGLE','COMMITTED','MARRIED','OPEN','POLYAMOROUS','COUPLE_CURIOUS','COUPLE_LIBERAL','OTHER']
const DISCRETION_LEVELS = ['MAXIMUM','SELECTIVE','OPEN']

function AdminAccountTab({ changeTab }) {
  const { user, refreshUser } = useAuth()
  const [subTab, setSubTab] = useState('conta')
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [verification, setVerification] = useState(null)
  const [accountForm, setAccountForm] = useState({ accountName:'', nif:'' })
  const [profileForm, setProfileForm] = useState(null)
  const [catalogGenders, setCatalogGenders] = useState([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (user) setAccountForm({ accountName: user.accountName || '', nif: user.nif || '' })
  }, [user])

  useEffect(() => {
    api.get('/profiles/me').then(r => {
      setProfile(r.data)
      setProfileForm({
        displayName: r.data?.displayName || '', bio: r.data?.bio || '',
        gender: r.data?.gender || '', orientation: r.data?.orientation || '',
        relationshipStatus: r.data?.relationshipStatus || 'SINGLE',
        city: r.data?.city || '', country: r.data?.country || '',
        discretionLevel: r.data?.discretionLevel || 'SELECTIVE',
      })
    }).catch(() => {})
    api.get('/subscriptions/me').then(r => setSubscription(r.data)).catch(() => {})
    api.get('/verifications/me').then(r => setVerification(r.data)).catch(() => {})
    api.get('/catalog/genders').then(r => setCatalogGenders(r.data.genders || [])).catch(() => {})
  }, [])

  const saveAccount = async () => {
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.put('/auth/account', accountForm)
      await refreshUser()
      setMsg('Dados de conta guardados.')
    } catch (e) { setErr(e.response?.data?.error || 'Erro ao guardar.') } finally { setSaving(false) }
  }

  const saveProfile = async () => {
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.put('/profiles/me', profileForm)
      setMsg('Perfil público guardado.')
    } catch (e) { setErr(e.response?.data?.error || 'Erro ao guardar.') } finally { setSaving(false) }
  }

  const uploadAvatar = async (file) => {
    if (!file) return
    const fd = new FormData(); fd.append('avatar', file)
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
      setMsg('Avatar actualizado.')
    } catch (e) { setErr(e.response?.data?.error || 'Erro ao enviar avatar.') } finally { setSaving(false) }
  }

  const terminateSessions = async () => {
    if (!confirm('Terminar todas as sessões (incluindo esta)?')) return
    try { await api.delete('/auth/sessions') } catch {}
  }

  if (!user) return <div style={{ color:C.muted, padding:20 }}>A carregar...</div>

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={() => changeTab('dashboard')} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer', padding:0 }}>←</button>
        <div>
          <div style={{ fontSize:16, fontWeight:600, color:C.text }}>Conta de Administrador</div>
          <div style={{ fontSize:12, color:C.muted }}>Voltar ao <span style={{color:C.primary, cursor:'pointer'}} onClick={() => changeTab('dashboard')}>Dashboard</span></div>
        </div>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['conta','Conta'],['perfil','Perfil Público'],['subscricao','Subscrição'],['seguranca','Segurança']].map(([k,l]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            background:subTab===k?C.primaryDim:C.surface, border:`1.5px solid ${subTab===k?C.primary:C.border}`,
            borderRadius:10, padding:'8px 14px', color:subTab===k?C.primary:'#C8D4DC', fontSize:13, cursor:'pointer'
          }}>{l}</button>
        ))}
      </div>

      {msg && <div style={{ background:C.successDim, border:`1px solid rgba(74,222,128,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.success, fontSize:13 }}>{msg}</div>}
      {err && <div style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.danger, fontSize:13 }}>{err}</div>}

      {subTab === 'conta' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div onClick={() => fileRef.current?.click()} style={{
              width:64, height:64, borderRadius:'50%', background:C.primaryDim, border:`1.5px solid ${C.primary}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:600, color:C.primary,
              cursor:'pointer', overflow:'hidden', flexShrink:0,
            }}>
              {user.avatarPath ? <img src={user.avatarPath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (getUserDisplayName(user)||'?')[0].toUpperCase()}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', color:C.text2, fontSize:12, cursor:'pointer' }}>Alterar avatar</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => uploadAvatar(e.target.files?.[0])}/>
              <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>Avatar da Conta — diferente das fotos do Perfil Público.</div>
            </div>
          </div>

          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NOME (accountName)</label>
          <input style={INP} value={accountForm.accountName} onChange={e => setAccountForm(p => ({...p, accountName:e.target.value}))} placeholder="Nome real"/>

          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NIF</label>
          <input style={INP} value={accountForm.nif} onChange={e => setAccountForm(p => ({...p, nif:e.target.value}))} placeholder="123456789"/>

          <div style={{ fontSize:12, color:C.muted, lineHeight:1.9, marginBottom:12 }}>
            <div>Email: <span style={{color:C.text}}>{user.email}</span></div>
            <div>Role: <span style={{color:C.primary}}>{user.adminRole || '—'}</span></div>
            <div>Estado da conta: <span style={{color:C.text}}>{user.status}</span></div>
            {user.dateOfBirth && <div>Data de nascimento: <span style={{color:C.text}}>{new Date(user.dateOfBirth).toLocaleDateString('pt')}</span></div>}
          </div>

          <button onClick={saveAccount} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:10, padding:'10px 18px', color:'#0A141A', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            {saving ? 'A guardar...' : 'Guardar Conta'}
          </button>
        </div>
      )}

      {subTab === 'perfil' && profileForm && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NOME VISÍVEL</label>
          <input style={INP} value={profileForm.displayName} onChange={e => setProfileForm(p => ({...p, displayName:e.target.value}))}/>

          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>BIO</label>
          <textarea style={{ ...INP, resize:'vertical' }} rows={3} value={profileForm.bio} onChange={e => setProfileForm(p => ({...p, bio:e.target.value}))}/>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>GÉNERO</label>
              <select style={INP} value={profileForm.gender} onChange={e => setProfileForm(p => ({...p, gender:e.target.value}))}>
                <option value="">Preferir não dizer / não definido</option>
                {catalogGenders.map(g => <option key={g.id} value={g.slug}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>ORIENTAÇÃO</label>
              <input style={INP} value={profileForm.orientation} onChange={e => setProfileForm(p => ({...p, orientation:e.target.value}))}/>
            </div>
          </div>

          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>ESTADO RELACIONAL</label>
          <select style={INP} value={profileForm.relationshipStatus} onChange={e => setProfileForm(p => ({...p, relationshipStatus:e.target.value}))}>
            {RELATIONSHIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>CIDADE</label>
              <input style={INP} value={profileForm.city} onChange={e => setProfileForm(p => ({...p, city:e.target.value}))}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>PAÍS</label>
              <input style={INP} value={profileForm.country} onChange={e => setProfileForm(p => ({...p, country:e.target.value}))}/>
            </div>
          </div>

          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>DISCRIÇÃO</label>
          <select style={INP} value={profileForm.discretionLevel} onChange={e => setProfileForm(p => ({...p, discretionLevel:e.target.value}))}>
            {DISCRETION_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
            Visibilidade: <strong style={{color:C.text}}>{profile?.visibilityMode || 'PUBLIC'}</strong> — controlado pelo Modo Invisível em Privacidade, não editável aqui.
          </div>

          {profile?.intentions?.length > 0 && (
            <div style={{ marginTop:6, marginBottom:12 }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:6 }}>Intenções</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {profile.intentions.map(pi => (
                  <span key={pi.intention?.id || pi.id} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>
                    {pi.intention?.name || pi.intention?.slug}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile?.photos?.length > 0 && (
            <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{profile.photos.length} foto(s) de perfil — gestão em Fotos (tab Admin).</div>
          )}

          <button onClick={saveProfile} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:10, padding:'10px 18px', color:'#0A141A', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            {saving ? 'A guardar...' : 'Guardar Perfil Público'}
          </button>
        </div>
      )}

      {subTab === 'subscricao' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, fontSize:13, color:C.text2, lineHeight:2 }}>
          {subscription ? (
            <>
              <div>Plano: <strong style={{color:C.text}}>{subscription.plan}</strong></div>
              <div>Estado: <strong style={{color:C.text}}>{subscription.status}</strong></div>
              <div>Fornecedor: <strong style={{color:C.text}}>{subscription.provider || '—'}</strong></div>
              {subscription.currentPeriodEnd && <div>Período até: <strong style={{color:C.text}}>{new Date(subscription.currentPeriodEnd).toLocaleDateString('pt')}</strong></div>}
              {subscription.cancelledAt && <div>Cancelada em: <strong style={{color:C.danger}}>{new Date(subscription.cancelledAt).toLocaleDateString('pt')}</strong></div>}
            </>
          ) : <div style={{color:C.muted}}>Sem subscrição.</div>}
        </div>
      )}

      {subTab === 'seguranca' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, fontSize:13, color:C.text2, lineHeight:2 }}>
          <div>Email verificado: {user.emailVerifiedAt ? <span style={{color:C.success}}>✅ {new Date(user.emailVerifiedAt).toLocaleDateString('pt')}</span> : <span style={{color:C.danger}}>❌ Não</span>}</div>
          <div>Idade verificada: {user.ageVerifiedAt ? <span style={{color:C.success}}>✅ {new Date(user.ageVerifiedAt).toLocaleDateString('pt')}</span> : <span style={{color:C.danger}}>❌ Não</span>}</div>
          <div>Verificação de identidade: <strong style={{color:C.text}}>{verification?.status || 'NONE'}</strong></div>
          <div style={{ marginTop:14, display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => (window.location.href = '/forgot-password')} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 16px', color:C.text2, fontSize:13, cursor:'pointer' }}>Alterar password</button>
            <button onClick={terminateSessions} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 16px', color:C.danger, fontSize:13, cursor:'pointer' }}>Terminar todas as sessões</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Intentions catalog manager (Sprint 2.5.7) ──────────────────────────────── */
function IntentionsManager() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [form, setForm] = useState({ name:'', slug:'', description:'', category:'', active:true })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { api.get('/catalog/admin/intentions').then(r => setItems(r.data.intentions||[])) }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ name:'', slug:'', description:'', category:'', active:true }); setEditing('new'); setMsg(''); setErr('') }
  const openEdit = (i) => { setForm({ name:i.name, slug:i.slug, description:i.description||'', category:i.category||'', active:i.active }); setEditing(i); setMsg(''); setErr('') }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return setErr('Nome e slug obrigatórios.')
    setSaving(true); setErr(''); setMsg('')
    try {
      if (editing === 'new') await api.post('/catalog/admin/intentions', form)
      else await api.put(`/catalog/admin/intentions/${editing.id}`, form)
      setEditing(null); load()
    } catch (e) { setErr(e.response?.data?.error || 'Erro ao guardar.') } finally { setSaving(false) }
  }

  const toggleActive = async (i) => { await api.put(`/catalog/admin/intentions/${i.id}`, { active: !i.active }).catch(()=>{}); load() }

  const del = async (i) => {
    if (i.usageCount > 0) {
      if (!confirm(`Esta intenção está em uso por ${i.usageCount} perfil(is). Desactivar em vez de apagar?`)) return
      return toggleActive({ ...i, active: true })
    }
    if (!confirm('Apagar esta intenção?')) return
    await api.delete(`/catalog/admin/intentions/${i.id}`).catch(e => setErr(e.response?.data?.error || 'Erro ao apagar.'))
    load()
  }

  if (editing !== null) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>{editing==='new' ? 'Nova intenção' : 'Editar intenção'}</h3>
        <button onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>{saving?'…':'Guardar'}</button>
      </div>
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NOME *</label>
      <input style={INP} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>SLUG * (minúsculas, underscore)</label>
      <input style={INP} value={form.slug} onChange={e=>setForm(p=>({...p,slug:e.target.value}))} disabled={editing!=='new'}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>DESCRIÇÃO</label>
      <textarea style={{...INP, resize:'vertical'}} rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>CATEGORIA (opcional)</label>
      <input style={INP} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.elevated, borderRadius:10, padding:'12px 14px' }}>
        <div style={{ fontSize:14, color:C.text }}>Activa</div>
        <div onClick={()=>setForm(p=>({...p,active:!p.active}))} style={{ width:44, height:24, borderRadius:12, cursor:'pointer', background:form.active?C.primary:C.input, position:'relative', border:`1px solid ${form.active?C.primary:C.border}` }}>
          <div style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'white', left:form.active?23:3, transition:'left 0.2s' }}/>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{items.length} intenções · {items.filter(i=>i.active).length} activas</div>
        <button onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>+ Nova</button>
      </div>
      {msg && <div style={{ color:C.success, fontSize:13, marginBottom:10 }}>{msg}</div>}
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}
      {items.map(i => (
        <div key={i.id} style={{ background:C.surface, border:`1px solid ${i.active?C.border:'rgba(248,113,113,0.2)'}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{i.name} {!i.active && <span style={{color:C.muted, fontSize:11}}>(inactiva)</span>}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{i.slug} {i.category && `· ${i.category}`} · usada por {i.usageCount} perfil(is)</div>
              {i.description && <div style={{ fontSize:12, color:C.text2, marginTop:4 }}>{i.description}</div>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
            <button onClick={()=>openEdit(i)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer' }}>✏️ Editar</button>
            <button onClick={()=>toggleActive(i)} style={{ background:i.active?C.dangerDim:C.successDim, border:`1px solid ${i.active?C.danger:C.success}`, borderRadius:6, padding:'5px 12px', color:i.active?C.danger:C.success, fontSize:12, cursor:'pointer' }}>{i.active?'Desactivar':'Activar'}</button>
            <button onClick={()=>del(i)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted, fontSize:12, cursor:'pointer' }}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Generic catalog options manager (Sprint 2.5.6, extended 4.4/4.8) ──────── */
// basePath/dataKey let this be reused for routers that don't live under
// /catalog/admin/:apiPath (e.g. private interests has its own router) —
// they default to the original genders/orientations shape so nothing else
// needs to change.
function CatalogOptionsManager({ apiPath, singularLabel, basePath, dataKey, showCategory }) {
  const base = basePath || `/catalog/admin/${apiPath}`
  const key = dataKey || apiPath
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ label:'', slug:'', description:'', category:'', active:true })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { api.get(base).then(r => setItems(r.data[key]||[])) }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ label:'', slug:'', description:'', category:'', active:true }); setEditing('new'); setErr('') }
  const openEdit = (g) => { setForm({ label:g.label, slug:g.slug, description:g.description||'', category:g.category||'', active:g.active }); setEditing(g); setErr('') }

  const save = async () => {
    if (!form.label.trim() || !form.slug.trim()) return setErr('Nome e slug obrigatórios.')
    setSaving(true); setErr('')
    try {
      if (editing === 'new') await api.post(base, form)
      else await api.put(`${base}/${editing.id}`, form)
      setEditing(null); load()
    } catch (e) { setErr(e.response?.data?.error || 'Erro ao guardar.') } finally { setSaving(false) }
  }

  const toggleActive = async (g) => { await api.put(`${base}/${g.id}`, { active: !g.active }).catch(()=>{}); load() }

  const del = async (g) => {
    if (g.usageCount > 0) {
      if (!confirm(`Esta opção está em uso por ${g.usageCount} perfil(is). Desactivar em vez de apagar?`)) return
      return toggleActive({ ...g, active: true })
    }
    if (!confirm('Apagar esta opção?')) return
    await api.delete(`${base}/${g.id}`).catch(e => setErr(e.response?.data?.error || 'Erro ao apagar.'))
    load()
  }

  if (editing !== null) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>{editing==='new' ? `Nova opção de ${singularLabel}` : 'Editar opção'}</h3>
        <button onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>{saving?'…':'Guardar'}</button>
      </div>
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NOME (label) *</label>
      <input style={INP} value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>SLUG *</label>
      <input style={INP} value={form.slug} onChange={e=>setForm(p=>({...p,slug:e.target.value}))} disabled={editing!=='new'}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>DESCRIÇÃO</label>
      <textarea style={{...INP, resize:'vertical'}} rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
      {showCategory && <>
        <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>CATEGORIA</label>
        <input style={INP} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}/>
      </>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.elevated, borderRadius:10, padding:'12px 14px' }}>
        <div style={{ fontSize:14, color:C.text }}>Activa</div>
        <div onClick={()=>setForm(p=>({...p,active:!p.active}))} style={{ width:44, height:24, borderRadius:12, cursor:'pointer', background:form.active?C.primary:C.input, position:'relative', border:`1px solid ${form.active?C.primary:C.border}` }}>
          <div style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'white', left:form.active?23:3, transition:'left 0.2s' }}/>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{items.length} opções · {items.filter(i=>i.active).length} activas</div>
        <button onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>+ Nova</button>
      </div>
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}
      {items.map(g => (
        <div key={g.id} style={{ background:C.surface, border:`1px solid ${g.active?C.border:'rgba(248,113,113,0.2)'}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{g.label} {!g.active && <span style={{color:C.muted, fontSize:11}}>(inactiva)</span>}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{g.slug} · usada por {g.usageCount} perfil(is)</div>
          <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
            <button onClick={()=>openEdit(g)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer' }}>✏️ Editar</button>
            <button onClick={()=>toggleActive(g)} style={{ background:g.active?C.dangerDim:C.successDim, border:`1px solid ${g.active?C.danger:C.success}`, borderRadius:6, padding:'5px 12px', color:g.active?C.danger:C.success, fontSize:12, cursor:'pointer' }}>{g.active?'Desactivar':'Activar'}</button>
            <button onClick={()=>del(g)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted, fontSize:12, cursor:'pointer' }}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// 4.4: thin wrappers over the generic CatalogOptionsManager — gender and
// orientation are identical in shape, only the API path/copy differ.
function GenderOptionsManager() {
  return <CatalogOptionsManager apiPath="genders" singularLabel="género" />
}
function OrientationOptionsManager() {
  return <CatalogOptionsManager apiPath="orientations" singularLabel="orientação" />
}
// 4.8 — private interests live on their own router (never folded into the
// public catalog namespace), so this wrapper passes an explicit basePath.
function PrivateInterestsManager() {
  return <CatalogOptionsManager apiPath="private-interests" basePath="/private-interests/admin" dataKey="interests" singularLabel="interesse privado" showCategory />
}

/* ─── Boundaries catalog manager (Sprint 2.5.8) ──────────────────────────────── */
const BOUNDARY_CATEGORIES = ['relationship_type','meeting_type','privacy','conversation_style']

function BoundariesManager() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', slug:'', category:BOUNDARY_CATEGORIES[0], description:'', isHardBoundary:false, sensitive:false, active:true })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { api.get('/catalog/admin/boundaries').then(r => setItems(r.data.boundaries||[])) }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ name:'', slug:'', category:BOUNDARY_CATEGORIES[0], description:'', isHardBoundary:false, sensitive:false, active:true }); setEditing('new'); setErr('') }
  const openEdit = (b) => { setForm({ name:b.name, slug:b.slug, category:b.category, description:b.description||'', isHardBoundary:b.isHardBoundary, sensitive:b.sensitive, active:b.active }); setEditing(b); setErr('') }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.category.trim()) return setErr('Nome, slug e categoria obrigatórios.')
    setSaving(true); setErr('')
    try {
      if (editing === 'new') await api.post('/catalog/admin/boundaries', form)
      else await api.put(`/catalog/admin/boundaries/${editing.id}`, form)
      setEditing(null); load()
    } catch (e) { setErr(e.response?.data?.error || 'Erro ao guardar.') } finally { setSaving(false) }
  }

  const toggleActive = async (b) => { await api.put(`/catalog/admin/boundaries/${b.id}`, { active: !b.active }).catch(()=>{}); load() }

  const del = async (b) => {
    if (b.usageCount > 0) {
      if (!confirm(`Este limite está em uso por ${b.usageCount} perfil(is). Desactivar em vez de apagar?`)) return
      return toggleActive({ ...b, active: true })
    }
    if (!confirm('Apagar este limite?')) return
    await api.delete(`/catalog/admin/boundaries/${b.id}`).catch(e => setErr(e.response?.data?.error || 'Erro ao apagar.'))
    load()
  }

  const grouped = BOUNDARY_CATEGORIES.reduce((acc, c) => { acc[c] = items.filter(i => i.category === c); return acc }, {})
  const otherCategories = [...new Set(items.map(i => i.category).filter(c => !BOUNDARY_CATEGORIES.includes(c)))]

  if (editing !== null) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>←</button>
        <h3 style={{ color:C.text, fontSize:16, fontWeight:500, margin:0, flex:1 }}>{editing==='new' ? 'Novo limite' : 'Editar limite'}</h3>
        <button onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:8, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>{saving?'…':'Guardar'}</button>
      </div>
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>NOME *</label>
      <input style={INP} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>SLUG *</label>
      <input style={INP} value={form.slug} onChange={e=>setForm(p=>({...p,slug:e.target.value}))} disabled={editing!=='new'}/>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>CATEGORIA *</label>
      <input style={INP} list="boundary-categories" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}/>
      <datalist id="boundary-categories">{BOUNDARY_CATEGORIES.map(c => <option key={c} value={c}/>)}</datalist>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>DESCRIÇÃO</label>
      <textarea style={{...INP, resize:'vertical'}} rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
      {[['isHardBoundary','Limite rígido (exclui de discovery em conflito)'],['sensitive','Sensível (não expor directamente)'],['active','Activo']].map(([key,label]) => (
        <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.elevated, borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ fontSize:14, color:C.text }}>{label}</div>
          <div onClick={()=>setForm(p=>({...p,[key]:!p[key]}))} style={{ width:44, height:24, borderRadius:12, cursor:'pointer', background:form[key]?C.primary:C.input, position:'relative', border:`1px solid ${form[key]?C.primary:C.border}` }}>
            <div style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'white', left:form[key]?23:3, transition:'left 0.2s' }}/>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{items.length} limites · {items.filter(i=>i.active).length} activos</div>
        <button onClick={openNew} style={{ background:C.primary, border:'none', borderRadius:10, padding:'9px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>+ Novo</button>
      </div>
      {err && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{err}</div>}
      {[...BOUNDARY_CATEGORIES, ...otherCategories].map(cat => (grouped[cat] || items.filter(i=>i.category===cat)).length > 0 && (
        <div key={cat} style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>{cat}</div>
          {(grouped[cat] || items.filter(i=>i.category===cat)).map(b => (
            <div key={b.id} style={{ background:C.surface, border:`1px solid ${b.active?C.border:'rgba(248,113,113,0.2)'}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ fontSize:14, fontWeight:500, color:C.text }}>
                {b.name} {!b.active && <span style={{color:C.muted, fontSize:11}}>(inactivo)</span>}
                {b.isHardBoundary && <span style={{color:C.danger, fontSize:11, marginLeft:6}}>● rígido</span>}
                {b.sensitive && <span style={{color:C.warning, fontSize:11, marginLeft:6}}>● sensível</span>}
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{b.slug} · usado por {b.usageCount} perfil(is)</div>
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                <button onClick={()=>openEdit(b)} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer' }}>✏️ Editar</button>
                <button onClick={()=>toggleActive(b)} style={{ background:b.active?C.dangerDim:C.successDim, border:`1px solid ${b.active?C.danger:C.success}`, borderRadius:6, padding:'5px 12px', color:b.active?C.danger:C.success, fontSize:12, cursor:'pointer' }}>{b.active?'Desactivar':'Activar'}</button>
                <button onClick={()=>del(b)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted, fontSize:12, cursor:'pointer' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ConfiguracoesTab() {
  const [subTab, setSubTab] = useState('perfis')
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    if (subTab === 'subscricoes') {
      api.get('/admin/subscription-plans').then(r => setPlans(r.data.plans||[])).catch(()=>{}).finally(()=>setLoadingPlans(false))
    }
  }, [subTab])

  return (
    <div>
      {/* Subtab bar */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[['perfis','◎ Perfis'],['generos','⚧ Géneros'],['orientacoes','◇ Orientações'],['intencoes','✚ Intenções'],['limites','▲ Limites'],['interesses','✷ Interesses privados'],['subscricoes','✦ Subscrições'],['email','✉ Email'],['guia','◈ Guia'],['eventos','◇ Eventos'],['circulos','◎ Circles'],['recomendacoes','✦ Recomendações'],['afiliados','🎁 Afiliados']].map(([k,l]) => (
          <button key={k} onClick={()=>setSubTab(k)} style={{
            background:subTab===k?C.primaryDim:C.surface,
            border:`1.5px solid ${subTab===k?C.primary:C.border}`,
            borderRadius:10, padding:'9px 18px',
            color:subTab===k?C.primary:'#C8D4DC', fontSize:14,
            cursor:'pointer', minHeight:40,
          }}>{l}</button>
        ))}
      </div>

      {/* ── Perfis subtab ── */}
      {subTab==='perfis' && (
        <div>
          <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:C.primary, lineHeight:1.5 }}>
            Os perfis definem as permissões de cada tipo de utilizador no painel de administração.
            Apenas o Super Admin pode atribuir ou remover roles.
          </div>

          {ROLES_CONFIG.map(role => (
            <div key={role.value} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:600, color:C.text, marginBottom:3 }}>{role.label}</div>
                  <div style={{ fontSize:13, color:C.muted }}>{role.desc}</div>
                </div>
                <div style={{ fontSize:11, background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', color:C.text2, flexShrink:0, marginLeft:10 }}>
                  {role.value}
                </div>
              </div>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Permissões</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {role.perms[0]==='*' ? (
                  <span style={{ background:'rgba(74,222,128,0.1)', border:`1px solid rgba(74,222,128,0.3)`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.success }}>★ Acesso total</span>
                ) : role.perms.map(p => (
                  <span key={p} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Géneros subtab ── */}
      {subTab==='generos' && <GenderOptionsManager />}
      {subTab==='orientacoes' && <OrientationOptionsManager />}
      {subTab==='interesses' && <PrivateInterestsManager />}

      {/* ── Intenções subtab ── */}
      {subTab==='intencoes' && <IntentionsManager />}

      {/* ── Limites subtab ── */}
      {subTab==='limites' && <BoundariesManager />}

      {/* ── Email subtab ── */}
      {subTab==='email' && <EmailDiagnosticPanel />}

      {/* ── Guia subtab ── */}
      {subTab==='guia' && <GuideManager />}

      {/* ── Eventos subtab (10.8) ── */}
      {subTab==='eventos' && <EventsManager />}

      {/* ── Circles subtab (10.11) ── */}
      {subTab==='circulos' && <CirclesManager />}

      {/* ── Recomendações subtab (Sprint 11) ── */}
      {subTab==='recomendacoes' && <RecommendationsManager />}

      {/* ── Afiliados subtab ── */}
      {subTab==='afiliados' && <AffiliateRuleManager />}

      {/* ── Subscrições subtab ── */}
      {subTab==='subscricoes' && (
        <div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:12 }}>Criar produto premium</div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:12 }}>
              Os produtos premium são geridos via Stripe Dashboard. Para criar ou editar um plano, acede ao painel Stripe e actualiza o STRIPE_PRICE_PREMIUM nas variáveis de ambiente do Railway.
            </div>
            <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer"
              style={{ display:'inline-block', background:C.primary, border:'none', borderRadius:50, padding:'10px 20px', fontSize:13, fontWeight:500, color:'#0A141A', textDecoration:'none', cursor:'pointer' }}>
              Abrir Stripe Dashboard ↗
            </a>
          </div>

          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Planos actuais</div>
          {[
            { name:'Gratuito',      slug:'FREE',    price:'0€/mês',   features:['Criar perfil','Matches limitados','Chat básico'] },
            { name:'Between Plus',  slug:'PREMIUM', price:'9.99€/mês',features:['Modo invisível','Travel Mode','Fotos privadas avançadas','Filtros premium','Bloquear contactos','Recibos discretos'] },
          ].map(plan => (
            <div key={plan.slug} style={{ background:C.surface, border:`1px solid ${plan.slug==='PREMIUM'?'rgba(184,167,255,0.3)':C.border}`, borderRadius:16, padding:18, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:C.text }}>{plan.name}</div>
                  <div style={{ fontSize:13, color:C.primary, marginTop:2 }}>{plan.price}</div>
                </div>
                <span style={{ fontSize:11, background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', color:C.text2 }}>{plan.slug}</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {plan.features.map(f => (
                  <span key={f} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Tab content map ────────────────────────────────────────────────────────── */
const TAB_CONTENT = {
  dashboard:     ({ changeTab }) => <DashboardTab changeTab={changeTab}/>,
  reports:       () => <ReportsTab/>,
  photos:        () => <PhotosTab/>,
  profiles:      () => <ProfilesTab/>,
  users:         () => <UsersTab/>,
  verifications: () => <VerificationsTab/>,
  conversations: () => <ConversationsTab/>,
  audit:         () => <AuditTab/>,
  beta:          () => <BetaTab/>,
  configuracoes: () => <ConfiguracoesTab/>,
  me:            ({ changeTab }) => <AdminAccountTab changeTab={changeTab}/>,
}

/* ─── Main AdminPage ─────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(urlTab || 'dashboard')

  // Keep in sync when navigation happens outside changeTab() — e.g. the
  // "Conta (Admin)" menu item does navigate('/admin/me') directly so it
  // works from any tab without needing 'me' in ROLE_TABS/TabBar.
  useEffect(() => { setTab(urlTab || 'dashboard') }, [urlTab])

  const role = user?.adminRole || 'SUPPORT'
  const allowedTabs = ROLE_TABS[role] || ['dashboard']

  const changeTab = t => {
    if (!allowedTabs.includes(t)) return
    setTab(t)
    navigate(`/admin/${t}`, { replace: true })
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  const Content = TAB_CONTENT[tab] || TAB_CONTENT['dashboard']

  return (
    <div style={{ minHeight:'100vh', background:C.bg, width:'100%' }}>
      <AdminHeader user={user} onLogout={handleLogout}/>
      <ServiceStatus role={role}/>
      <TabBar tab={tab} changeTab={changeTab} allowedTabs={allowedTabs}/>
      <div style={{ padding:'16px 16px calc(40px + env(safe-area-inset-bottom))' }}>
        <Content changeTab={changeTab}/>
      </div>
    </div>
  )
}
