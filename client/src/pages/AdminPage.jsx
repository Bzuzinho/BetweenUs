import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C', red:'#E05C7A'
}

const TABS = [
  { key:'dashboard', label:'Dashboard', icon:'📊' },
  { key:'reports', label:'Reports', icon:'⚠️' },
  { key:'photos', label:'Fotos', icon:'📷' },
  { key:'profiles', label:'Perfis', icon:'👤' },
  { key:'users', label:'Utilizadores', icon:'👥' },
  { key:'verifications', label:'Verificações', icon:'✅' },
  { key:'conversations', label:'Conversas', icon:'💬' },
  { key:'audit', label:'Auditoria', icon:'📋' },
  { key:'beta', label:'Convites Beta', icon:'🎟️' },
]

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
      borderRadius:14, padding:'14px 16px', textAlign:'center', flex:1, minWidth:100 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
        fontWeight:700, color: color || colors.accent }}>{value ?? '—'}</div>
      <div style={{ color:colors.muted, fontSize:10, marginTop:3,
        textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
    </div>
  )
}

function SensitiveBanner({ children }) {
  return (
    <div style={{ background:'rgba(224,92,122,0.08)', border:'1px solid rgba(224,92,122,0.25)',
      borderRadius:10, padding:'8px 14px', marginBottom:16, fontSize:11, color:colors.red,
      display:'flex', alignItems:'center', gap:8 }}>
      🔒 {children}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color:colors.muted }}>A carregar...</div>
  if (!data) return null

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <StatCard label="Utilizadores" value={data.users?.total} />
        <StatCard label="Novos hoje" value={data.users?.newToday} color={colors.green} />
        <StatCard label="Novos 7 dias" value={data.users?.newWeek} />
        <StatCard label="Risco elevado" value={data.users?.highRisk} color={colors.red} />
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <StatCard label="Perfis" value={data.profiles?.total} />
        <StatCard label="Pendentes" value={data.profiles?.pending} color={colors.accent} />
        <StatCard label="Aprovados" value={data.profiles?.approved} color={colors.green} />
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <StatCard label="Fotos" value={data.photos?.total} />
        <StatCard label="Pendentes" value={data.photos?.pending} color={colors.accent} />
        <StatCard label="Matches ativos" value={data.matches?.active} />
        <StatCard label="Mensagens" value={data.messages?.total} />
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <StatCard label="Reports pendentes" value={data.reports?.pending} color={colors.red} />
        <StatCard label="Verificações pend." value={data.verifications?.pending} color={colors.accent} />
        <StatCard label="Premium" value={data.subscriptions?.premium} color={colors.green} />
        <StatCard label="Casal Premium" value={data.subscriptions?.couple} color={colors.green} />
      </div>
    </div>
  )
}

// ─── Reports ───────────────────────────────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('PENDING')

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/admin/reports?status=${status}`)
      .then(r => setReports(r.data.reports || []))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => { load() }, [load])

  const resolve = async (id, newStatus) => {
    await api.put(`/admin/reports/${id}`, { status: newStatus })
    load()
  }

  return (
    <div>
      <SensitiveBanner>Dados de denúncias — acesso registado em auditoria.</SensitiveBanner>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['PENDING','REVIEWING','RESOLVED','DISMISSED'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            style={{ background: status === s ? 'rgba(201,149,107,0.2)' : colors.bgCard,
              border:`1px solid ${status === s ? colors.accent : colors.plum}`,
              borderRadius:20, padding:'6px 14px', color: status === s ? colors.accent : colors.muted,
              cursor:'pointer', fontSize:12 }}>{s}</button>
        ))}
      </div>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {!loading && reports.length === 0 && <div style={{ color:colors.muted }}>Sem reports.</div>}
      {reports.map(r => (
        <div key={r.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:16, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:colors.accent, fontWeight:600, fontSize:13 }}>{r.reason}</span>
            <span style={{ color:colors.muted, fontSize:11 }}>
              {new Date(r.createdAt).toLocaleDateString('pt')}
            </span>
          </div>
          <div style={{ fontSize:12, color:colors.lavLight, marginBottom:4 }}>
            Denunciante: {r.reporter?.email}
          </div>
          <div style={{ fontSize:12, color:colors.lavLight, marginBottom:8 }}>
            Denunciado: {r.reportedUser?.email} ({r.reportedUser?.profile?.displayName || 'sem perfil'})
            {r.reportedUser?.riskScore > 0 && (
              <span style={{ color:colors.red }}> · risco {r.reportedUser.riskScore}</span>
            )}
          </div>
          {r.details && <div style={{ fontSize:12, color:colors.muted, marginBottom:10 }}>{r.details}</div>}
          {status === 'PENDING' && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => resolve(r.id, 'RESOLVED')}
                style={{ background:'rgba(61,214,140,0.15)', border:`1px solid ${colors.green}`,
                  borderRadius:10, padding:'6px 14px', color:colors.green, cursor:'pointer', fontSize:12 }}>
                Procedente
              </button>
              <button onClick={() => resolve(r.id, 'DISMISSED')}
                style={{ background:colors.bgInput, border:`1px solid ${colors.plum}`,
                  borderRadius:10, padding:'6px 14px', color:colors.muted, cursor:'pointer', fontSize:12 }}>
                Improcedente
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Photos ────────────────────────────────────────────────────────────────────
function PhotosTab() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/photos?status=PENDING').then(r => setPhotos(r.data.photos || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const moderate = async (id, moderationStatus) => {
    await api.put(`/admin/photos/${id}`, { moderationStatus })
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <SensitiveBanner>Moderação de fotos pendentes.</SensitiveBanner>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {!loading && photos.length === 0 && <div style={{ color:colors.muted }}>Sem fotos pendentes.</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
        {photos.map(p => (
          <div key={p.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:14, overflow:'hidden' }}>
            <img src={p.storagePath} alt="" style={{ width:'100%', height:140, objectFit:'cover' }} />
            <div style={{ padding:10 }}>
              <div style={{ fontSize:11, color:colors.lavLight, marginBottom:8 }}>
                {p.profile?.displayName} ({p.profile?.user?.email})
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => moderate(p.id, 'APPROVED')}
                  style={{ flex:1, background:'rgba(61,214,140,0.15)', border:`1px solid ${colors.green}`,
                    borderRadius:8, padding:'5px', color:colors.green, cursor:'pointer', fontSize:11 }}>✓</button>
                <button onClick={() => moderate(p.id, 'REJECTED')}
                  style={{ flex:1, background:'rgba(224,92,122,0.15)', border:`1px solid ${colors.red}`,
                    borderRadius:8, padding:'5px', color:colors.red, cursor:'pointer', fontSize:11 }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Profiles ──────────────────────────────────────────────────────────────────
function ProfilesTab() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/profiles?status=PENDING_REVIEW').then(r => setProfiles(r.data.profiles || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const moderate = async (id, status) => {
    await api.put(`/admin/profiles/${id}/status`, { status })
    setProfiles(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {!loading && profiles.length === 0 && <div style={{ color:colors.muted }}>Sem perfis pendentes.</div>}
      {profiles.map(p => (
        <div key={p.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:16, marginBottom:10, display:'flex',
          justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:colors.white, fontWeight:600, fontSize:14 }}>{p.displayName}</div>
            <div style={{ color:colors.muted, fontSize:12 }}>
              {p.user?.email} · {p.type} · {p.city || 'sem cidade'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => moderate(p.id, 'APPROVED')}
              style={{ background:'rgba(61,214,140,0.15)', border:`1px solid ${colors.green}`,
                borderRadius:10, padding:'6px 14px', color:colors.green, cursor:'pointer', fontSize:12 }}>Aprovar</button>
            <button onClick={() => moderate(p.id, 'REJECTED')}
              style={{ background:'rgba(224,92,122,0.15)', border:`1px solid ${colors.red}`,
                borderRadius:10, padding:'6px 14px', color:colors.red, cursor:'pointer', fontSize:12 }}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortByRisk, setSortByRisk] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sortByRisk) params.set('sortByRisk', 'true')
    api.get(`/admin/users?${params}`).then(r => setUsers(r.data.users || [])).finally(() => setLoading(false))
  }, [search, sortByRisk])

  useEffect(() => { load() }, [load])

  const changeStatus = async (id, status) => {
    await api.put(`/admin/users/${id}/status`, { status })
    load()
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por email ou nome..."
          style={{ flex:1, background:colors.bgInput, border:`1.5px solid ${colors.plum}`,
            borderRadius:10, padding:'8px 12px', color:colors.white, fontSize:13, outline:'none' }} />
        <button onClick={() => setSortByRisk(p => !p)}
          style={{ background: sortByRisk ? 'rgba(224,92,122,0.15)' : colors.bgCard,
            border:`1px solid ${sortByRisk ? colors.red : colors.plum}`,
            borderRadius:10, padding:'8px 14px', color: sortByRisk ? colors.red : colors.muted,
            cursor:'pointer', fontSize:12 }}>Por risco</button>
      </div>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {users.map(u => (
        <div key={u.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:14, marginBottom:8, display:'flex',
          justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ color:colors.white, fontSize:13, fontWeight:600 }}>
              {u.email} {u.adminRole && <span style={{ color:colors.accent }}>· {u.adminRole}</span>}
            </div>
            <div style={{ color:colors.muted, fontSize:11 }}>
              {u.profile?.displayName || 'sem perfil'} · {u.status}
              {u.riskScore > 30 && <span style={{ color:colors.red }}> · risco {u.riskScore}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {u.status !== 'SUSPENDED' && (
              <button onClick={() => changeStatus(u.id, 'SUSPENDED')}
                style={{ background:colors.bgInput, border:`1px solid ${colors.plum}`,
                  borderRadius:8, padding:'5px 10px', color:colors.muted, cursor:'pointer', fontSize:11 }}>
                Suspender
              </button>
            )}
            {u.status !== 'BANNED' && (
              <button onClick={() => changeStatus(u.id, 'BANNED')}
                style={{ background:'rgba(224,92,122,0.1)', border:`1px solid ${colors.red}`,
                  borderRadius:8, padding:'5px 10px', color:colors.red, cursor:'pointer', fontSize:11 }}>
                Banir
              </button>
            )}
            {u.status !== 'ACTIVE' && (
              <button onClick={() => changeStatus(u.id, 'ACTIVE')}
                style={{ background:'rgba(61,214,140,0.1)', border:`1px solid ${colors.green}`,
                  borderRadius:8, padding:'5px 10px', color:colors.green, cursor:'pointer', fontSize:11 }}>
                Reativar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Verifications ─────────────────────────────────────────────────────────────
function VerificationsTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/verifications').then(r => setList(r.data.verifications || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const review = async (userId, status) => {
    await api.put(`/admin/verifications/${userId}`, { status })
    setList(prev => prev.filter(v => v.userId !== userId))
  }

  return (
    <div>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {!loading && list.length === 0 && <div style={{ color:colors.muted }}>Sem verificações pendentes.</div>}
      {list.map(v => (
        <div key={v.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:14, marginBottom:8, display:'flex',
          justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:colors.white, fontSize:13 }}>{v.user?.profile?.displayName}</div>
            <div style={{ color:colors.muted, fontSize:11 }}>{v.user?.email}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => review(v.userId, 'APPROVED')}
              style={{ background:'rgba(61,214,140,0.15)', border:`1px solid ${colors.green}`,
                borderRadius:10, padding:'6px 14px', color:colors.green, cursor:'pointer', fontSize:12 }}>Aprovar</button>
            <button onClick={() => review(v.userId, 'REJECTED')}
              style={{ background:'rgba(224,92,122,0.15)', border:`1px solid ${colors.red}`,
                borderRadius:10, padding:'6px 14px', color:colors.red, cursor:'pointer', fontSize:12 }}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Conversations ─────────────────────────────────────────────────────────────
function ConversationsTab() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [openConv, setOpenConv] = useState(null)
  const [reason, setReason] = useState('')
  const [convDetail, setConvDetail] = useState(null)

  useEffect(() => {
    api.get('/admin/conversations?reported=true').then(r => setConversations(r.data.conversations || [])).finally(() => setLoading(false))
  }, [])

  const openConversation = async (id) => {
    if (!reason.trim()) { setOpenConv(id); return }
    try {
      const res = await api.get(`/admin/conversations/${id}?reason=${encodeURIComponent(reason)}`)
      setConvDetail(res.data)
    } catch {}
  }

  return (
    <div>
      <SensitiveBanner>Acesso a conteúdo de conversas exige motivo e fica registado em auditoria.</SensitiveBanner>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {!convDetail && conversations.map(c => (
        <div key={c.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:14, marginBottom:8 }}>
          <div style={{ color:colors.white, fontSize:13, marginBottom:4 }}>
            {c.match?.profileOne?.displayName} ↔ {c.match?.profileTwo?.displayName}
          </div>
          <div style={{ color:colors.muted, fontSize:11, marginBottom:8 }}>
            {c._count?.messages} mensagens · status {c.match?.status}
          </div>
          {openConv === c.id ? (
            <div style={{ display:'flex', gap:8 }}>
              <input value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Motivo do acesso (obrigatório)"
                style={{ flex:1, background:colors.bgInput, border:`1px solid ${colors.plum}`,
                  borderRadius:8, padding:'6px 10px', color:colors.white, fontSize:12, outline:'none' }} />
              <button onClick={() => openConversation(c.id)}
                style={{ background:colors.accent, border:'none', borderRadius:8,
                  padding:'6px 14px', color:'#1A0A2E', cursor:'pointer', fontSize:12 }}>Ver</button>
            </div>
          ) : (
            <button onClick={() => setOpenConv(c.id)}
              style={{ background:colors.bgInput, border:`1px solid ${colors.plum}`,
                borderRadius:8, padding:'6px 14px', color:colors.lavLight, cursor:'pointer', fontSize:12 }}>
              Abrir conversa
            </button>
          )}
        </div>
      ))}
      {convDetail && (
        <div>
          <button onClick={() => { setConvDetail(null); setOpenConv(null); setReason('') }}
            style={{ background:'none', border:'none', color:colors.lavLight,
              fontSize:13, cursor:'pointer', marginBottom:12 }}>← Voltar</button>
          <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:14, padding:16, maxHeight:400, overflowY:'auto' }}>
            {convDetail.messages?.map(m => (
              <div key={m.id} style={{ marginBottom:10, fontSize:12,
                opacity: m.deletedAt ? 0.4 : 1 }}>
                <span style={{ color:colors.accent }}>{m.sender?.email}:</span>{' '}
                <span style={{ color:colors.lavLight }}>
                  {m.deletedAt ? '[mensagem removida]' : m.body}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Audit ─────────────────────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/audit').then(r => setLogs(r.data.logs || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {logs.map(l => (
        <div key={l.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:10, padding:'10px 14px', marginBottom:6, fontSize:12 }}>
          <span style={{ color:colors.accent }}>{l.admin?.email}</span>{' '}
          <span style={{ color:colors.white }}>{l.action}</span>{' '}
          <span style={{ color:colors.muted }}>
            em {l.targetType} · {new Date(l.createdAt).toLocaleString('pt')}
          </span>
          {l.reason && <div style={{ color:colors.muted, marginTop:2 }}>Motivo: {l.reason}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Beta invites (corrigido para endpoints reais) ─────────────────────────────
function BetaTab() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email:'', maxUses:1, expiresAt:'' })
  const [creating, setCreating] = useState(false)
  const [newInvite, setNewInvite] = useState(null)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/beta/invites').then(r => setInvites(r.data.invites || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setCreating(true); setError('')
    try {
      const res = await api.post('/admin/beta/invites', {
        email: form.email || undefined,
        maxUses: Number(form.maxUses),
        expiresAt: form.expiresAt || undefined
      })
      setNewInvite(res.data)
      setForm({ email:'', maxUses:1, expiresAt:'' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar convite.')
    } finally { setCreating(false) }
  }

  const toggle = async (id) => {
    await api.put(`/admin/beta/invites/${id}/toggle`)
    load()
  }

  const remove = async (id) => {
    try {
      await api.delete(`/admin/beta/invites/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao apagar.')
    }
  }

  const copy = (url, id) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id); setTimeout(() => setCopied(''), 2000)
    })
  }

  return (
    <div>
      <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
        borderRadius:14, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:13, color:colors.lavLight, fontWeight:600, marginBottom:10 }}>
          Criar novo convite
        </div>
        {error && <div style={{ color:colors.red, fontSize:12, marginBottom:8 }}>{error}</div>}
        <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
          <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="Email (opcional)"
            style={{ flex:1, minWidth:160, background:colors.bgInput, border:`1px solid ${colors.plum}`,
              borderRadius:8, padding:'8px 10px', color:colors.white, fontSize:12, outline:'none' }} />
          <input type="number" value={form.maxUses} min="1"
            onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
            placeholder="Usos"
            style={{ width:80, background:colors.bgInput, border:`1px solid ${colors.plum}`,
              borderRadius:8, padding:'8px 10px', color:colors.white, fontSize:12, outline:'none' }} />
        </div>
        <button onClick={handleCreate} disabled={creating}
          style={{ background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            border:'none', borderRadius:10, padding:'8px 20px', color:'#1A0A2E',
            cursor:'pointer', fontSize:12, fontWeight:600 }}>
          {creating ? 'A criar...' : 'Criar convite'}
        </button>
        {newInvite && (
          <div style={{ marginTop:12, background:colors.bgInput, borderRadius:10,
            padding:'10px 12px', fontSize:11, color:colors.lavLight, wordBreak:'break-all' }}>
            {newInvite.inviteUrl}
            <button onClick={() => copy(newInvite.inviteUrl, 'new')}
              style={{ marginLeft:8, background:'none', border:'none',
                color:colors.accent, cursor:'pointer', fontSize:11 }}>
              {copied === 'new' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {loading && <div style={{ color:colors.muted }}>A carregar...</div>}
      {invites.map(inv => {
        const url = `${window.location.origin}/join/${inv.code}`
        return (
          <div key={inv.id} style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:12, padding:14, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <span style={{ color:colors.accent, fontWeight:700, fontSize:14, letterSpacing:1 }}>
                  {inv.code}
                </span>
                <span style={{ color: inv.active ? colors.green : colors.muted,
                  fontSize:11, marginLeft:10 }}>
                  {inv.active ? '● Ativo' : '○ Inativo'}
                </span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => copy(url, inv.id)}
                  style={{ background:colors.bgInput, border:`1px solid ${colors.plum}`,
                    borderRadius:8, padding:'4px 10px', color:colors.lavLight, cursor:'pointer', fontSize:11 }}>
                  {copied === inv.id ? '✓' : '📋'}
                </button>
                <button onClick={() => toggle(inv.id)}
                  style={{ background:colors.bgInput, border:`1px solid ${colors.plum}`,
                    borderRadius:8, padding:'4px 10px', color:colors.lavLight, cursor:'pointer', fontSize:11 }}>
                  {inv.active ? 'Desativar' : 'Ativar'}
                </button>
                {!inv.usedById && (
                  <button onClick={() => remove(inv.id)}
                    style={{ background:'rgba(224,92,122,0.1)', border:`1px solid ${colors.red}`,
                      borderRadius:8, padding:'4px 10px', color:colors.red, cursor:'pointer', fontSize:11 }}>
                    Apagar
                  </button>
                )}
              </div>
            </div>
            <div style={{ color:colors.muted, fontSize:11, marginTop:6 }}>
              {inv.useCount}/{inv.maxUses} usos
              {inv.email && ` · reservado: ${inv.email}`}
              {inv.usedBy && ` · usado por: ${inv.usedBy.email}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main AdminPage ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(urlTab || 'dashboard')

  const changeTab = (t) => { setTab(t); navigate(`/admin/${t}`, { replace: true }) }

  const renderTab = () => {
    switch (tab) {
      case 'dashboard': return <DashboardTab />
      case 'reports': return <ReportsTab />
      case 'photos': return <PhotosTab />
      case 'profiles': return <ProfilesTab />
      case 'users': return <UsersTab />
      case 'verifications': return <VerificationsTab />
      case 'conversations': return <ConversationsTab />
      case 'audit': return <AuditTab />
      case 'beta': return <BetaTab />
      default: return <DashboardTab />
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:colors.bg }}>
      {/* Header */}
      <div style={{ background:colors.bgCard, borderBottom:`1px solid ${colors.plum}`,
        padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
            fontWeight:700, color:colors.white }}>Between Us — Admin</div>
          <div style={{ fontSize:11, color:colors.accent }}>{user?.email} · {user?.adminRole}</div>
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
          style={{ background:'none', border:`1px solid ${colors.plum}`,
            borderRadius:10, padding:'6px 14px', color:colors.muted, cursor:'pointer', fontSize:12 }}>
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, padding:'12px 16px', overflowX:'auto',
        borderBottom:`1px solid ${colors.plum}` }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)}
            style={{ whiteSpace:'nowrap', background: tab === t.key ? 'rgba(201,149,107,0.15)' : 'none',
              border:`1px solid ${tab === t.key ? colors.accent : 'transparent'}`,
              borderRadius:10, padding:'6px 14px', color: tab === t.key ? colors.accent : colors.muted,
              cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:'20px 16px', maxWidth:900, margin:'0 auto' }}>
        {renderTab()}
      </div>
    </div>
  )
}
