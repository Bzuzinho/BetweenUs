import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

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
  SUPER_ADMIN:      ['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta'],
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
]

/* ─── Notification bell ──────────────────────────────────────────────────────── */
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const ref = useRef(null)

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
        position:'relative', background:'none', border:`1px solid ${C.border}`,
        borderRadius:10, width:38, height:38, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:C.text2,
      }}>
        🔔
        {unread > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, background:C.danger, color:'#fff', fontSize:9, fontWeight:700, borderRadius:10, padding:'1px 5px', minWidth:16, textAlign:'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

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
              <div key={n.id} onClick={() => markRead(n.id)} style={{
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

  const initials = (user?.email || '?')[0].toUpperCase()

  return (
    <div style={{
      background:C.surface, borderBottom:`1px solid ${C.border}`,
      padding:'10px 16px',
      display:'flex', alignItems:'center', gap:10,
      position:'sticky', top:0, zIndex:50,
    }}>
      {/* Logo */}
      <svg width="28" height="14" viewBox="0 0 56 28" style={{ flexShrink:0 }}>
        <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
        <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.75"/>
      </svg>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, lineHeight:1.2 }}>Between Us · Admin</div>
        <div style={{ fontSize:11, color:C.primary, lineHeight:1.2 }}>{user?.adminRole}</div>
      </div>

      {/* Bell */}
      <NotificationBell />

      {/* User avatar / menu */}
      <div ref={menuRef} style={{ position:'relative' }}>
        <div onClick={() => setShowMenu(o => !o)} style={{
          width:36, height:36, borderRadius:'50%',
          background:C.primaryDim, border:`1.5px solid ${C.primary}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:600, color:C.primary, cursor:'pointer', flexShrink:0,
        }}>
          {initials}
        </div>

        {showMenu && (
          <div style={{
            position:'absolute', top:42, right:0, width:200,
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:200, overflow:'hidden',
          }}>
            <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:2 }}>{user?.email}</div>
              <div style={{ fontSize:11, color:C.primary }}>{user?.adminRole}</div>
            </div>
            {[
              { label:'O meu perfil', action: () => { navigate('/profile'); setShowMenu(false) } },
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
  return (
    <div style={{
      display:'flex', overflowX:'auto', gap:4,
      padding:'8px 12px', background:C.bg,
      borderBottom:`1px solid ${C.border}`,
      scrollbarWidth:'none', position:'sticky',
      top:57, zIndex:40,
    }}>
      {tabs.map(t => {
        const active = tab === t.key
        return (
          <button key={t.key} onClick={() => changeTab(t.key)} style={{
            flexShrink:0, display:'flex', alignItems:'center', gap:5,
            background: active ? C.primaryDim : 'none',
            border:`1px solid ${active ? C.primary : 'transparent'}`,
            borderRadius:8, padding:'6px 12px',
            color: active ? C.primary : C.muted,
            fontSize:12, fontWeight: active ? 500 : 400,
            cursor:'pointer', whiteSpace:'nowrap', minHeight:32,
          }}>
            <span style={{ fontSize:13 }}>{t.icon}</span>
            {t.label}
          </button>
        )
      })}
    </div>
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

/* ─── Reports ────────────────────────────────────────────────────────────────── */
function ReportsTab() {
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState('PENDING')
  const load = useCallback(() => { api.get(`/admin/reports?status=${status}`).then(r => setReports(r.data.reports||[])) }, [status])
  useEffect(() => { load() }, [load])
  const resolve = async (id, s) => { await api.put(`/admin/reports/${id}`, { status: s }); load() }
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['PENDING','REVIEWING','RESOLVED','DISMISSED'].map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{ background:status===s?C.primaryDim:C.surface, border:`1px solid ${status===s?C.primary:C.border}`, borderRadius:8, padding:'6px 12px', color:status===s?C.primary:C.muted, fontSize:12, minHeight:34, cursor:'pointer' }}>{s}</button>
        ))}
      </div>
      {reports.length===0 && <p style={{color:C.muted}}>Sem reports com este estado.</p>}
      {reports.map(r => (
        <div key={r.id} style={{ background:C.surface, border:`1px solid ${r.priority>=8?'rgba(248,113,113,0.3)':C.border}`, borderRadius:14, padding:14, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color:r.priority>=8?C.danger:C.primary, fontWeight:500, fontSize:13 }}>{r.reason}</span>
            <span style={{ color:C.muted, fontSize:11 }}>{new Date(r.createdAt).toLocaleDateString('pt')}</span>
          </div>
          <div style={{ color:C.text2, fontSize:12, marginBottom:8 }}>{r.reportedUser?.email}{r.reportedUser?.riskScore>0&&<span style={{color:C.danger}}> · risco {r.reportedUser.riskScore}</span>}</div>
          {r.details && <div style={{ color:C.muted, fontSize:12, marginBottom:8 }}>{r.details}</div>}
          {status==='PENDING'&&(
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={() => resolve(r.id,'RESOLVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, fontSize:12, minHeight:40, cursor:'pointer' }}>✓ Procedente</button>
              <button onClick={() => resolve(r.id,'DISMISSED')} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.muted, fontSize:12, minHeight:40, cursor:'pointer' }}>✕ Dispensar</button>
            </div>
          )}
        </div>
      ))}
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
  const load = useCallback(() => { api.get('/admin/profiles?status=PENDING_REVIEW').then(r => setProfiles(r.data.profiles||[])) }, [])
  useEffect(() => { load() }, [load])
  const mod = async (id, s) => { await api.put(`/admin/profiles/${id}/status`, { status:s, reason:'Admin review' }); setProfiles(p => p.filter(x => x.id !== id)) }
  return (
    <div>
      {profiles.length===0 && <p style={{color:C.muted}}>Sem perfis pendentes.</p>}
      {profiles.map(p => (
        <div key={p.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:10 }}>
          <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:3 }}>{p.displayName}</div>
          <div style={{ color:C.muted, fontSize:12, marginBottom:10 }}>{p.user?.email} · {p.type}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={() => mod(p.id,'APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, fontSize:13, minHeight:42, cursor:'pointer' }}>Aprovar</button>
            <button onClick={() => mod(p.id,'REJECTED')} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:10, color:C.danger, fontSize:13, minHeight:42, cursor:'pointer' }}>Rejeitar</button>
          </div>
        </div>
      ))}
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

function UserDetail({ userId, onBack }) {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [view, setView] = useState('info')
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    api.get(`/admin/users/${userId}`).then(r => {
      setData(r.data)
      setForm({ email: r.data.email, displayName: r.data.profile?.displayName||'', bio: r.data.profile?.bio||'', city: r.data.profile?.city||'', profileStatus: r.data.profile?.status||'' })
    })
    api.get(`/admin/users/${userId}/history`).then(r => setHistory(r.data.history||[]))
  }, [userId])

  useEffect(() => { load() }, [load])

  const saveUser = async (reason, note) => { setEditing(null); try { await api.put(`/admin/users/${userId}`, { email: form.email, reason, internalNote: note }); setMsg('Actualizado.'); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const saveProfile = async (reason, note) => { if (!data?.profile?.id) return; setEditing(null); try { await api.put(`/admin/profiles/${data.profile.id}`, { displayName: form.displayName, bio: form.bio, city: form.city, status: form.profileStatus, reason, internalNote: note }); setMsg('Perfil actualizado.'); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const doStatus = async (status, reason) => { setModal(null); try { await api.put(`/admin/users/${userId}/status`, { status, reason }); setMsg(`Estado: ${status}.`); load() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const doDelete = async (reason, note) => { setModal(null); try { await api.delete(`/admin/users/${userId}`, { data: { reason, internalNote: note } }); onBack() } catch (e) { setErr(e.response?.data?.error||'Erro.') } }
  const resetPwd = async () => { try { await api.post(`/admin/users/${userId}/reset-password`); setMsg('Email de reset enviado.') } catch (e) { setErr('Erro.') } }

  if (!data) return <div style={{ color:C.muted, padding:20 }}>A carregar...</div>
  const u = data; const p = data.profile

  return (
    <>
      {modal==='suspend'  && <ReasonModal title="Suspender"      onConfirm={(r)=>doStatus('SUSPENDED',r)}  onCancel={()=>setModal(null)} hasNote/>}
      {modal==='ban'      && <ReasonModal title="Banir"          onConfirm={(r)=>doStatus('BANNED',r)}     onCancel={()=>setModal(null)} hasNote/>}
      {modal==='activate' && <ReasonModal title="Reactivar"      onConfirm={(r)=>doStatus('ACTIVE',r)}     onCancel={()=>setModal(null)}/>}
      {modal==='delete'   && <ReasonModal title="⚠️ Eliminar"   onConfirm={(r,n)=>doDelete(r,n)}          onCancel={()=>setModal(null)} hasNote/>}
      {editing==='user'   && <ReasonModal title="Guardar conta"  onConfirm={(r,n)=>saveUser(r,n)}          onCancel={()=>setEditing(null)} hasNote/>}
      {editing==='profile'&& <ReasonModal title="Guardar perfil" onConfirm={(r,n)=>saveProfile(r,n)}       onCancel={()=>setEditing(null)} hasNote/>}

      <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:14 }}>←</button>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:3 }}>{u.email}</div>
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
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        {u.status!=='ACTIVE'    && <button onClick={()=>setModal('activate')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:12, padding:11, color:C.success, fontSize:13, minHeight:44, cursor:'pointer' }}>✓ Reactivar</button>}
        {u.status!=='SUSPENDED' && <button onClick={()=>setModal('suspend')}  style={{ background:C.elevated,   border:`1px solid ${C.border}`,  borderRadius:12, padding:11, color:C.text2,  fontSize:13, minHeight:44, cursor:'pointer' }}>⏸ Suspender</button>}
        {u.status!=='BANNED'    && <button onClick={()=>setModal('ban')}      style={{ background:C.dangerDim,  border:`1px solid ${C.danger}`,  borderRadius:12, padding:11, color:C.danger,  fontSize:13, minHeight:44, cursor:'pointer' }}>🚫 Banir</button>}
        <button onClick={resetPwd} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:12, padding:11, color:C.text2, fontSize:13, minHeight:44, cursor:'pointer' }}>🔑 Reset password</button>
        <button onClick={()=>setModal('delete')} style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:12, padding:11, color:C.danger, fontSize:13, minHeight:44, cursor:'pointer' }}>🗑 Eliminar</button>
      </div>

      {msg && <div style={{ background:C.successDim, border:`1px solid rgba(74,222,128,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.success, fontSize:13 }}>{msg}</div>}
      {err && <div style={{ background:C.dangerDim,  border:`1px solid rgba(248,113,113,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.danger,  fontSize:13 }}>{err}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:16 }}>
        {[['info','📧 Conta'],['profile','👤 Perfil'],['history','📋 Histórico']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)} style={{ background:view===k?C.primaryDim:C.surface, border:`1.5px solid ${view===k?C.primary:C.border}`, borderRadius:10, padding:'9px 4px', color:view===k?C.primary:C.muted, fontSize:11, fontWeight:view===k?500:400, cursor:'pointer', minHeight:40 }}>{l}</button>
        ))}
      </div>

      {view==='info' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:14, fontWeight:500, color:C.text2 }}>Conta</span>
            <button onClick={() => setEditing('user')} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer', minHeight:32 }}>✏️ Editar</button>
          </div>
          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>EMAIL</label>
          <input style={INP} value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))}/>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
            <div>Email verificado: {u.emailVerifiedAt ? '✅ '+new Date(u.emailVerifiedAt).toLocaleDateString('pt') : '❌ Não'}</div>
            <div>Criado: {new Date(u.createdAt).toLocaleDateString('pt')}</div>
          </div>
          <RoleManager userId={userId} currentRole={u.adminRole} onChanged={load}/>
        </div>
      )}

      {view==='profile' && !p && <div style={{ color:C.muted, textAlign:'center', padding:20 }}>Sem perfil.</div>}
      {view==='profile' && p && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:14, fontWeight:500, color:C.text2 }}>Perfil</span>
            <button onClick={() => setEditing('profile')} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 12px', color:C.text2, fontSize:12, cursor:'pointer', minHeight:32 }}>✏️ Editar</button>
          </div>
          {[['Nome',form.displayName,'displayName'],['Bio',form.bio,'bio'],['Cidade',form.city,'city']].map(([lbl,val,key]) => (
            <div key={key} style={{ marginBottom:8 }}>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:3 }}>{lbl.toUpperCase()}</label>
              <input style={INP} value={val} onChange={e => setForm(pr => ({...pr,[key]:e.target.value}))}/>
            </div>
          ))}
          <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:3 }}>STATUS</label>
          <select value={form.profileStatus} onChange={e => setForm(pr => ({...pr,profileStatus:e.target.value}))} style={{ ...INP, marginBottom:0, cursor:'pointer' }}>
            {['DRAFT','PENDING_REVIEW','APPROVED','REJECTED','HIDDEN','SUSPENDED'].map(s => <option key={s} value={s} style={{background:C.surface}}>{s}</option>)}
          </select>
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
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const load = useCallback(() => {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    api.get(`/admin/users${q}`).then(r => setUsers(r.data.users||[]))
  }, [search])
  useEffect(() => { load() }, [load])
  if (selectedId) return <UserDetail userId={selectedId} onBack={() => { setSelectedId(null); load() }}/>
  return (
    <div>
      {showCreate && <CreateUserModal onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load()}}/>}
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar email ou nome..." style={{ ...INP, marginBottom:0, flex:1 }}/>
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
  const load = useCallback(() => { api.get('/admin/verifications').then(r => setList(r.data.verifications||[])) }, [])
  useEffect(() => { load() }, [load])
  const review = async (userId, s) => { await api.put(`/admin/verifications/${userId}`, { status: s }); setList(p => p.filter(v => v.userId !== userId)) }
  return (
    <div>
      {list.length===0 && <p style={{color:C.muted}}>Sem verificações pendentes.</p>}
      {list.map(v => (
        <div key={v.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:8 }}>
          <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:3 }}>{v.user?.profile?.displayName}</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{v.user?.email}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>review(v.userId,'APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, fontSize:13, minHeight:42, cursor:'pointer' }}>Aprovar</button>
            <button onClick={()=>review(v.userId,'REJECTED')} style={{ background:C.dangerDim,  border:`1px solid ${C.danger}`,  borderRadius:10, padding:10, color:C.danger,  fontSize:13, minHeight:42, cursor:'pointer' }}>Rejeitar</button>
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
}

/* ─── Main AdminPage ─────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(urlTab || 'dashboard')

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
    <div style={{ minHeight:'100vh', background:C.bg, maxWidth:960, margin:'0 auto' }}>
      <AdminHeader user={user} onLogout={handleLogout}/>
      <ServiceStatus role={role}/>
      <TabBar tab={tab} changeTab={changeTab} allowedTabs={allowedTabs}/>
      <div style={{ padding:'16px 16px calc(40px + env(safe-area-inset-bottom))' }}>
        <Content changeTab={changeTab}/>
      </div>
    </div>
  )
}
