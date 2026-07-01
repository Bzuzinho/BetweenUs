import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0E0818', card:'#1A1028', input:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C', red:'#E05C7A'
}

const TABS = [
  { key:'dashboard', label:'Dashboard', icon:'📊' },
  { key:'reports',   label:'Reports',   icon:'⚠️' },
  { key:'photos',    label:'Fotos',     icon:'📷' },
  { key:'profiles',  label:'Perfis',    icon:'👤' },
  { key:'users',     label:'Users',     icon:'👥' },
  { key:'verifications', label:'Verif.', icon:'✅' },
  { key:'conversations', label:'Chats', icon:'💬' },
  { key:'audit',     label:'Auditoria', icon:'📋' },
  { key:'beta',      label:'Beta',      icon:'🎟️' },
]

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.plum}`,
      borderRadius: 14, padding: '14px 12px', textAlign: 'center', flex: 1, minWidth: 80
    }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: color || C.accent }}>
        {value ?? '—'}
      </div>
      <div style={{ color: C.muted, fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  )
}

function DashboardTab() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).catch(() => {}) }, [])
  if (!data) return <div style={{ color: C.muted, padding: 20 }}>A carregar...</div>
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <StatCard label="Utilizadores" value={data.users?.total} />
        <StatCard label="Hoje" value={data.users?.newToday} color={C.green} />
        <StatCard label="Risco" value={data.users?.highRisk} color={C.red} />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <StatCard label="Perfis" value={data.profiles?.total} />
        <StatCard label="Pendentes" value={data.profiles?.pending} color={C.accent} />
        <StatCard label="Aprovados" value={data.profiles?.approved} color={C.green} />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <StatCard label="Reports" value={data.reports?.pending} color={C.red} />
        <StatCard label="Fotos pend." value={data.photos?.pending} color={C.accent} />
        <StatCard label="Premium" value={data.subscriptions?.total} color={C.green} />
      </div>
    </div>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState('PENDING')
  const load = useCallback(() => {
    api.get(`/admin/reports?status=${status}`).then(r => setReports(r.data.reports || []))
  }, [status])
  useEffect(() => { load() }, [load])
  const resolve = async (id, s) => { await api.put(`/admin/reports/${id}`, { status: s }); load() }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['PENDING','REVIEWING','RESOLVED','DISMISSED'].map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            background: status===s ? 'rgba(201,149,107,0.2)' : C.card,
            border: `1px solid ${status===s ? C.accent : C.plum}`,
            borderRadius: 20, padding: '6px 12px',
            color: status===s ? C.accent : C.muted, fontSize: 12, minHeight: 36,
          }}>{s}</button>
        ))}
      </div>
      {reports.length === 0 && <p style={{ color: C.muted }}>Sem reports.</p>}
      {reports.map(r => (
        <div key={r.id} style={{ background: C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:14, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color: C.accent, fontWeight:600, fontSize:13 }}>{r.reason}</span>
            <span style={{ color: C.muted, fontSize:11 }}>{new Date(r.createdAt).toLocaleDateString('pt')}</span>
          </div>
          <div style={{ color: C.lavLight, fontSize:12, marginBottom:4 }}>
            Denunciado: {r.reportedUser?.email} {r.reportedUser?.riskScore > 0 && <span style={{color:C.red}}>· risco {r.reportedUser.riskScore}</span>}
          </div>
          {r.details && <div style={{ color:C.muted, fontSize:12, marginBottom:8 }}>{r.details}</div>}
          {status === 'PENDING' && (
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button onClick={() => resolve(r.id,'RESOLVED')} style={{ flex:1, background:'rgba(61,214,140,0.15)', border:`1px solid ${C.green}`, borderRadius:10, padding:'8px', color:C.green, fontSize:12, minHeight:40 }}>✓ Procedente</button>
              <button onClick={() => resolve(r.id,'DISMISSED')} style={{ flex:1, background:C.input, border:`1px solid ${C.plum}`, borderRadius:10, padding:'8px', color:C.muted, fontSize:12, minHeight:40 }}>✕ Improcedente</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PhotosTab() {
  const [photos, setPhotos] = useState([])
  const load = useCallback(() => { api.get('/admin/photos?status=PENDING').then(r => setPhotos(r.data.photos || [])) }, [])
  useEffect(() => { load() }, [load])
  const moderate = async (id, s) => { await api.put(`/admin/photos/${id}`, { moderationStatus: s }); setPhotos(prev => prev.filter(p => p.id !== id)) }

  return (
    <div>
      {photos.length === 0 && <p style={{ color:C.muted }}>Sem fotos pendentes.</p>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {photos.map(p => (
          <div key={p.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, overflow:'hidden' }}>
            <img src={p.storagePath} alt="" style={{ width:'100%', height:140, objectFit:'cover' }} />
            <div style={{ padding:10 }}>
              <div style={{ color:C.lavLight, fontSize:11, marginBottom:8 }}>{p.profile?.displayName}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => moderate(p.id,'APPROVED')} style={{ flex:1, background:'rgba(61,214,140,0.15)', border:`1px solid ${C.green}`, borderRadius:8, padding:8, color:C.green, fontSize:13, minHeight:40 }}>✓</button>
                <button onClick={() => moderate(p.id,'REJECTED')} style={{ flex:1, background:'rgba(224,92,122,0.15)', border:`1px solid ${C.red}`, borderRadius:8, padding:8, color:C.red, fontSize:13, minHeight:40 }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfilesTab() {
  const [profiles, setProfiles] = useState([])
  const load = useCallback(() => { api.get('/admin/profiles?status=PENDING_REVIEW').then(r => setProfiles(r.data.profiles || [])) }, [])
  useEffect(() => { load() }, [load])
  const moderate = async (id, s) => { await api.put(`/admin/profiles/${id}/status`, { status: s }); setProfiles(prev => prev.filter(p => p.id !== id)) }

  return (
    <div>
      {profiles.length === 0 && <p style={{ color:C.muted }}>Sem perfis pendentes.</p>}
      {profiles.map(p => (
        <div key={p.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:14, marginBottom:10 }}>
          <div style={{ color:C.white, fontWeight:600, fontSize:14, marginBottom:4 }}>{p.displayName}</div>
          <div style={{ color:C.muted, fontSize:12, marginBottom:10 }}>{p.user?.email} · {p.type} · {p.city || '—'}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => moderate(p.id,'APPROVED')} style={{ flex:1, background:'rgba(61,214,140,0.15)', border:`1px solid ${C.green}`, borderRadius:10, padding:'8px', color:C.green, fontSize:13, minHeight:40 }}>Aprovar</button>
            <button onClick={() => moderate(p.id,'REJECTED')} style={{ flex:1, background:'rgba(224,92,122,0.15)', border:`1px solid ${C.red}`, borderRadius:10, padding:'8px', color:C.red, fontSize:13, minHeight:40 }}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const load = useCallback(() => {
    const p = search ? `?search=${encodeURIComponent(search)}` : ''
    api.get(`/admin/users${p}`).then(r => setUsers(r.data.users || []))
  }, [search])
  useEffect(() => { load() }, [load])

  const changeStatus = async (id, s) => { await api.put(`/admin/users/${id}/status`, { status: s }); load() }

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Pesquisar email ou nome..."
        style={{ width:'100%', background:C.input, border:`1.5px solid ${C.plum}`, borderRadius:12, padding:'10px 14px', color:C.white, fontSize:14, marginBottom:14 }}
      />
      {users.map(u => (
        <div key={u.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:14, marginBottom:8 }}>
          <div style={{ color:C.white, fontSize:13, fontWeight:600, marginBottom:4 }}>
            {u.email} {u.adminRole && <span style={{color:C.accent}}>· {u.adminRole}</span>}
          </div>
          <div style={{ color:C.muted, fontSize:11, marginBottom:8 }}>
            {u.profile?.displayName || 'sem perfil'} · {u.status}
            {u.riskScore > 30 && <span style={{color:C.red}}> · risco {u.riskScore}</span>}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {u.status !== 'SUSPENDED' && (
              <button onClick={() => changeStatus(u.id,'SUSPENDED')} style={{ background:C.input, border:`1px solid ${C.plum}`, borderRadius:8, padding:'6px 12px', color:C.muted, fontSize:12, minHeight:36 }}>Suspender</button>
            )}
            {u.status !== 'BANNED' && (
              <button onClick={() => changeStatus(u.id,'BANNED')} style={{ background:'rgba(224,92,122,0.1)', border:`1px solid ${C.red}`, borderRadius:8, padding:'6px 12px', color:C.red, fontSize:12, minHeight:36 }}>Banir</button>
            )}
            {u.status !== 'ACTIVE' && (
              <button onClick={() => changeStatus(u.id,'ACTIVE')} style={{ background:'rgba(61,214,140,0.1)', border:`1px solid ${C.green}`, borderRadius:8, padding:'6px 12px', color:C.green, fontSize:12, minHeight:36 }}>Reativar</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function VerificationsTab() {
  const [list, setList] = useState([])
  const load = useCallback(() => { api.get('/admin/verifications').then(r => setList(r.data.verifications || [])) }, [])
  useEffect(() => { load() }, [load])
  const review = async (userId, s) => { await api.put(`/admin/verifications/${userId}`, { status: s }); setList(prev => prev.filter(v => v.userId !== userId)) }

  return (
    <div>
      {list.length === 0 && <p style={{ color:C.muted }}>Sem verificações pendentes.</p>}
      {list.map(v => (
        <div key={v.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:14, marginBottom:8 }}>
          <div style={{ color:C.white, fontSize:13, marginBottom:4 }}>{v.user?.profile?.displayName}</div>
          <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>{v.user?.email}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => review(v.userId,'APPROVED')} style={{ flex:1, background:'rgba(61,214,140,0.15)', border:`1px solid ${C.green}`, borderRadius:10, padding:8, color:C.green, fontSize:13, minHeight:40 }}>Aprovar</button>
            <button onClick={() => review(v.userId,'REJECTED')} style={{ flex:1, background:'rgba(224,92,122,0.15)', border:`1px solid ${C.red}`, borderRadius:10, padding:8, color:C.red, fontSize:13, minHeight:40 }}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AuditTab() {
  const [logs, setLogs] = useState([])
  useEffect(() => { api.get('/admin/audit').then(r => setLogs(r.data.logs || [])) }, [])
  return (
    <div>
      {logs.map(l => (
        <div key={l.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:10, padding:'10px 14px', marginBottom:6, fontSize:12 }}>
          <span style={{color:C.accent}}>{l.admin?.email}</span>{' '}
          <span style={{color:C.white}}>{l.action}</span>{' '}
          <span style={{color:C.muted}}>{new Date(l.createdAt).toLocaleString('pt')}</span>
          {l.reason && <div style={{color:C.muted, marginTop:2}}>↳ {l.reason}</div>}
        </div>
      ))}
    </div>
  )
}

function BetaTab() {
  const [invites, setInvites] = useState([])
  const [form, setForm] = useState({ email:'', maxUses:1 })
  const [newInvite, setNewInvite] = useState(null)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => { api.get('/admin/beta/invites').then(r => setInvites(r.data.invites || [])) }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setError('')
    try {
      const res = await api.post('/admin/beta/invites', { email: form.email || undefined, maxUses: Number(form.maxUses) })
      setNewInvite(res.data)
      setForm({ email:'', maxUses:1 })
      load()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  const toggle = async (id) => { await api.put(`/admin/beta/invites/${id}/toggle`); load() }
  const remove = async (id) => {
    try { await api.delete(`/admin/beta/invites/${id}`); load() }
    catch (err) { setError(err.response?.data?.error || 'Erro ao apagar.') }
  }
  const copy = (url, id) => { navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) }) }

  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:16, marginBottom:20 }}>
        <div style={{ color:C.lavLight, fontWeight:600, fontSize:13, marginBottom:10 }}>Criar convite</div>
        {error && <div style={{ color:C.red, fontSize:12, marginBottom:8 }}>{error}</div>}
        <input value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="Email (opcional)"
          style={{ width:'100%', background:C.input, border:`1px solid ${C.plum}`, borderRadius:10, padding:'10px 12px', color:C.white, fontSize:14, marginBottom:8 }} />
        <button onClick={create} style={{ width:'100%', background:`linear-gradient(135deg,${C.accent},${C.rose})`, border:'none', borderRadius:12, padding:'12px', color:'#1A0A2E', fontWeight:700, fontSize:14, minHeight:48 }}>
          Criar convite
        </button>
        {newInvite && (
          <div style={{ marginTop:12, background:C.input, borderRadius:10, padding:'10px 12px', fontSize:12, color:C.lavLight, wordBreak:'break-all' }}>
            {newInvite.inviteUrl}
            <button onClick={() => copy(newInvite.inviteUrl,'new')} style={{ marginLeft:8, color:C.accent, border:'none', background:'none', fontSize:12 }}>
              {copied==='new' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {invites.map(inv => {
        const url = `${window.location.origin}/join/${inv.code}`
        return (
          <div key={inv.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:12, padding:14, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ color:C.accent, fontWeight:700, fontSize:16, letterSpacing:1 }}>{inv.code}</span>
              <span style={{ color: inv.active ? C.green : C.muted, fontSize:11 }}>{inv.active ? '● Activo' : '○ Inactivo'}</span>
            </div>
            <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>
              {inv.useCount}/{inv.maxUses} usos {inv.email && `· ${inv.email}`}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={() => copy(url,inv.id)} style={{ background:C.input, border:`1px solid ${C.plum}`, borderRadius:8, padding:'6px 12px', color:C.lavLight, fontSize:12, minHeight:36 }}>
                {copied===inv.id ? '✓' : '📋 Copiar'}
              </button>
              <button onClick={() => toggle(inv.id)} style={{ background:C.input, border:`1px solid ${C.plum}`, borderRadius:8, padding:'6px 12px', color:C.lavLight, fontSize:12, minHeight:36 }}>
                {inv.active ? 'Desactivar' : 'Activar'}
              </button>
              {!inv.usedById && (
                <button onClick={() => remove(inv.id)} style={{ background:'rgba(224,92,122,0.1)', border:`1px solid ${C.red}`, borderRadius:8, padding:'6px 12px', color:C.red, fontSize:12, minHeight:36 }}>
                  Apagar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const TAB_CONTENT = {
  dashboard: DashboardTab, reports: ReportsTab, photos: PhotosTab,
  profiles: ProfilesTab, users: UsersTab, verifications: VerificationsTab,
  conversations: () => <p style={{color:'#7A6E88'}}>Conversas — em breve.</p>,
  audit: AuditTab, beta: BetaTab
}

export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(urlTab || 'dashboard')

  const changeTab = (t) => { setTab(t); navigate(`/admin/${t}`, { replace: true }) }

  const TabContent = TAB_CONTENT[tab] || DashboardTab

  return (
    <div style={{ minHeight:'100vh', background:C.bg, maxWidth:600, margin:'0 auto' }}>
      {/* Header */}
      <div style={{
        background: C.card,
        borderBottom: `1px solid ${C.plum}`,
        padding: 'calc(16px + env(safe-area-inset-top)) 16px 14px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.white }}>
              Between Us · Admin
            </div>
            <div style={{ fontSize:11, color:C.accent }}>{user?.email} · {user?.adminRole}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            style={{ background:'none', border:`1px solid ${C.plum}`, borderRadius:10, padding:'6px 14px', color:C.muted, fontSize:12, minHeight:36 }}>
            Sair
          </button>
        </div>
      </div>

      {/* Horizontal scrollable tab bar */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 4,
        padding: '10px 12px',
        borderBottom: `1px solid ${C.plum}`,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        background: C.bg,
        position: 'sticky',
        top: 72,
        zIndex: 40,
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)} style={{
            flexShrink: 0,
            background: tab===t.key ? 'rgba(201,149,107,0.15)' : 'none',
            border: `1px solid ${tab===t.key ? C.accent : 'transparent'}`,
            borderRadius: 10,
            padding: '7px 14px',
            color: tab===t.key ? C.accent : C.muted,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            whiteSpace: 'nowrap',
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px calc(32px + env(safe-area-inset-bottom))' }}>
        <TabContent />
      </div>
    </div>
  )
}
