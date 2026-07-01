import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0E0818', card:'#1A1028', input:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C', red:'#E05C7A'
}

const inp = {
  width:'100%', background:C.input, border:`1.5px solid ${C.plum}`,
  borderRadius:12, padding:'11px 14px', color:C.white, fontSize:14,
  marginBottom:10, display:'block'
}

const TABS = [
  { key:'dashboard',     label:'Dashboard',  icon:'📊' },
  { key:'reports',       label:'Reports',    icon:'⚠️' },
  { key:'photos',        label:'Fotos',      icon:'📷' },
  { key:'profiles',      label:'Perfis',     icon:'👤' },
  { key:'users',         label:'Utilizadores',icon:'👥'},
  { key:'verifications', label:'Verif.',     icon:'✅' },
  { key:'conversations', label:'Chats',      icon:'💬' },
  { key:'audit',         label:'Auditoria',  icon:'📋' },
  { key:'beta',          label:'Beta',       icon:'🎟️' },
]

// ─── Shared ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:'14px 12px', textAlign:'center', flex:1, minWidth:80 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:color||C.accent }}>{value??'—'}</div>
      <div style={{ color:C.muted, fontSize:10, marginTop:3, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
    </div>
  )
}

function ReasonModal({ title, onConfirm, onCancel, hasNote=false }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onCancel}>
      <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:'24px 20px 36px' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ width:36, height:4, background:C.plum, borderRadius:2, margin:'0 auto 18px' }} />
        <h3 style={{ color:C.white, fontFamily:"'Playfair Display',serif", fontSize:18, marginBottom:14 }}>{title}</h3>
        <input value={reason} onChange={e=>setReason(e.target.value)}
          placeholder="Motivo (obrigatório)"
          style={inp} />
        {hasNote && (
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Nota interna (opcional — só visível a admins)"
            rows={3}
            style={{ ...inp, resize:'none' }} />
        )}
        <div style={{ display:'flex', gap:10, marginTop:6 }}>
          <button onClick={onCancel} style={{ flex:1, background:'none', border:`1px solid ${C.plum}`, borderRadius:50, padding:12, color:C.muted, fontSize:14, minHeight:48 }}>Cancelar</button>
          <button onClick={()=>reason.trim()&&onConfirm(reason,note)} disabled={!reason.trim()}
            style={{ flex:2, background:`linear-gradient(135deg,${C.accent},${C.rose})`, border:'none', borderRadius:50, padding:12, color:'#1A0A2E', fontWeight:700, fontSize:14, minHeight:48, opacity:reason.trim()?1:0.5 }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Detail (customer support) ──────────────────────────────────────────
function UserDetail({ userId, onBack }) {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [view, setView] = useState('info') // info | profile | history
  const [editing, setEditing] = useState(null) // null | 'user' | 'profile'
  const [modal, setModal] = useState(null)  // null | 'suspend' | 'ban' | 'activate' | 'delete'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get(`/admin/users/${userId}`).then(r => {
      setData(r.data)
      setForm({
        email: r.data.email,
        displayName: r.data.profile?.displayName || '',
        bio: r.data.profile?.bio || '',
        city: r.data.profile?.city || '',
        profileStatus: r.data.profile?.status || '',
      })
    })
    api.get(`/admin/users/${userId}/history`).then(r => setHistory(r.data.history || []))
  }, [userId])

  useEffect(() => { load() }, [load])

  const saveUser = async (reason, note) => {
    setSaving(true); setMsg(''); setError('')
    try {
      await api.put(`/admin/users/${userId}`, { email: form.email, reason, internalNote: note })
      setMsg('Utilizador actualizado.')
      setEditing(null); load()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
    finally { setSaving(false) }
  }

  const saveProfile = async (reason, note) => {
    if (!data?.profile?.id) return
    setSaving(true); setMsg(''); setError('')
    try {
      await api.put(`/admin/profiles/${data.profile.id}`, {
        displayName: form.displayName, bio: form.bio,
        city: form.city, status: form.profileStatus, reason, internalNote: note
      })
      setMsg('Perfil actualizado.')
      setEditing(null); load()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
    finally { setSaving(false) }
  }

  const doStatusChange = async (status, reason, note) => {
    setModal(null)
    try {
      await api.put(`/admin/users/${userId}/status`, { status, reason })
      setMsg(`Utilizador ${status}.`)
      load()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  const doDelete = async (reason, note) => {
    setModal(null)
    try {
      await api.delete(`/admin/users/${userId}`, { data: { reason, internalNote: note } })
      setMsg('Utilizador eliminado.')
      onBack()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  if (!data) return <div style={{ color:C.muted, padding:20 }}>A carregar...</div>

  const u = data
  const p = data.profile

  return (
    <>
      {modal === 'suspend' && <ReasonModal title="Suspender utilizador" onConfirm={(r,n)=>doStatusChange('SUSPENDED',r,n)} onCancel={()=>setModal(null)} hasNote />}
      {modal === 'ban'     && <ReasonModal title="Banir utilizador" onConfirm={(r,n)=>doStatusChange('BANNED',r,n)} onCancel={()=>setModal(null)} hasNote />}
      {modal === 'activate'&& <ReasonModal title="Reactivar utilizador" onConfirm={(r,n)=>doStatusChange('ACTIVE',r,n)} onCancel={()=>setModal(null)} />}
      {modal === 'delete'  && <ReasonModal title="⚠️ Eliminar utilizador (RGPD)" onConfirm={(r,n)=>doDelete(r,n)} onCancel={()=>setModal(null)} hasNote />}
      {editing === 'user'  && <ReasonModal title="Editar utilizador" onConfirm={(r,n)=>saveUser(r,n)} onCancel={()=>setEditing(null)} hasNote />}
      {editing === 'profile'&& <ReasonModal title="Editar perfil" onConfirm={(r,n)=>saveProfile(r,n)} onCancel={()=>setEditing(null)} hasNote />}

      <div>
        {/* Back */}
        <button onClick={onBack} style={{ color:C.lavLight, fontSize:14, marginBottom:16, padding:'4px 0' }}>← Utilizadores</button>

        {/* Header card */}
        <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:4 }}>{u.email}</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>
            {u.status} {u.adminRole && <span style={{color:C.accent}}>· {u.adminRole}</span>}
            {u.riskScore > 0 && <span style={{color:C.red}}> · risco {u.riskScore}</span>}
          </div>
          <div style={{ fontSize:11, color:C.muted }}>
            Criado: {new Date(u.createdAt).toLocaleDateString('pt')}
            {u.lastSeenAt && ` · Último acesso: ${new Date(u.lastSeenAt).toLocaleDateString('pt')}`}
          </div>
        </div>

        {/* Status actions */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          {u.status !== 'SUSPENDED' && <button onClick={()=>setModal('suspend')} style={{ background:'rgba(201,149,107,0.1)', border:`1px solid ${C.accent}`, borderRadius:10, padding:'8px 14px', color:C.accent, fontSize:12, minHeight:38 }}>Suspender</button>}
          {u.status !== 'BANNED'    && <button onClick={()=>setModal('ban')}     style={{ background:'rgba(224,92,122,0.1)', border:`1px solid ${C.red}`,    borderRadius:10, padding:'8px 14px', color:C.red,    fontSize:12, minHeight:38 }}>Banir</button>}
          {u.status !== 'ACTIVE'    && <button onClick={()=>setModal('activate')} style={{ background:'rgba(61,214,140,0.1)', border:`1px solid ${C.green}`,  borderRadius:10, padding:'8px 14px', color:C.green,  fontSize:12, minHeight:38 }}>Reactivar</button>}
          <button onClick={()=>setModal('delete')} style={{ background:'rgba(224,92,122,0.05)', border:`1px solid rgba(224,92,122,0.3)`, borderRadius:10, padding:'8px 14px', color:C.red, fontSize:12, minHeight:38 }}>Eliminar (RGPD)</button>
        </div>

        {msg   && <div style={{ background:'rgba(61,214,140,0.1)',  border:`1px solid ${C.green}`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.green, fontSize:13 }}>{msg}</div>}
        {error && <div style={{ background:'rgba(224,92,122,0.1)', border:`1px solid ${C.red}`,   borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.red,   fontSize:13 }}>{error}</div>}

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {[['info','📧 Conta'],['profile','👤 Perfil'],['history','📋 Histórico']].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)} style={{
              background: view===k ? 'rgba(201,149,107,0.15)' : C.card,
              border: `1px solid ${view===k ? C.accent : C.plum}`,
              borderRadius:10, padding:'8px 14px', color:view===k ? C.accent : C.muted,
              fontSize:13, minHeight:38
            }}>{l}</button>
          ))}
        </div>

        {/* Info tab */}
        {view === 'info' && (
          <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:16, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ color:C.lavLight, fontWeight:600, fontSize:14 }}>Dados da conta</span>
              <button onClick={()=>setEditing('user')} style={{ color:C.accent, fontSize:13, border:`1px solid ${C.plum}`, borderRadius:8, padding:'5px 12px', minHeight:34 }}>✏️ Editar</button>
            </div>
            <label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>EMAIL</label>
            <input style={inp} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="Email" />
            <div style={{ color:C.muted, fontSize:12, marginTop:6 }}>
              <div>Email verificado: {u.emailVerifiedAt ? '✅ ' + new Date(u.emailVerifiedAt).toLocaleDateString('pt') : '❌ Não verificado'}</div>
              <div>Subscrição: {u.subscription?.plan || 'FREE'} · {u.subscription?.status || '—'}</div>
              <div>Verificação: {u.verification?.status || 'Sem verificação'}</div>
            </div>
          </div>
        )}

        {/* Profile tab */}
        {view === 'profile' && p && (
          <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:16, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ color:C.lavLight, fontWeight:600, fontSize:14 }}>Perfil</span>
              <button onClick={()=>setEditing('profile')} style={{ color:C.accent, fontSize:13, border:`1px solid ${C.plum}`, borderRadius:8, padding:'5px 12px', minHeight:34 }}>✏️ Editar</button>
            </div>
            {[['Nome',form.displayName,'displayName'],['Bio',form.bio,'bio'],['Cidade',form.city,'city']].map(([label,val,key])=>(
              <div key={key} style={{ marginBottom:10 }}>
                <label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>{label.toUpperCase()}</label>
                <input style={inp} value={val} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={label} />
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>STATUS DO PERFIL</label>
              <select value={form.profileStatus} onChange={e=>setForm(pr=>({...pr,profileStatus:e.target.value}))}
                style={{ ...inp, marginBottom:0 }}>
                {['DRAFT','PENDING_REVIEW','APPROVED','REJECTED','HIDDEN','SUSPENDED'].map(s=>(
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ color:C.muted, fontSize:12, marginTop:8 }}>
              <div>Tipo: {p.type} · Relação: {p.relationshipStatus}</div>
              <div>Orientação: {p.orientation || '—'} · Género: {p.gender || '—'}</div>
              {p.rejectionReason && <div style={{color:C.red}}>Motivo de rejeição: {p.rejectionReason}</div>}
              {p.moderationNotes && <div style={{color:C.accent}}>Notas de moderação: {p.moderationNotes}</div>}
            </div>
            {p.photos?.length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ color:C.lavLight, fontSize:12, fontWeight:600, marginBottom:8 }}>Fotos ({p.photos.length})</div>
                <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
                  {p.photos.map(ph=>(
                    <div key={ph.id} style={{ flexShrink:0 }}>
                      <img src={ph.storagePath} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:10, border:`1px solid ${C.plum}` }} />
                      <div style={{ fontSize:9, color:C.muted, textAlign:'center', marginTop:2 }}>{ph.moderationStatus}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {view === 'profile' && !p && (
          <div style={{ color:C.muted, padding:20, textAlign:'center' }}>Sem perfil criado.</div>
        )}

        {/* History tab */}
        {view === 'history' && (
          <div>
            <div style={{ background:'rgba(201,149,107,0.08)', border:'1px solid rgba(201,149,107,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:C.accent }}>
              🔒 Histórico visível apenas a administradores
            </div>
            {history.length === 0 && <p style={{ color:C.muted }}>Sem histórico para este utilizador.</p>}
            {history.map(h=>(
              <div key={h.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color:C.accent, fontWeight:600, fontSize:13 }}>{h.action}</span>
                  <span style={{ color:C.muted, fontSize:11 }}>{new Date(h.createdAt).toLocaleString('pt')}</span>
                </div>
                <div style={{ color:C.lavLight, fontSize:12, marginBottom:4 }}>
                  Por: {h.admin?.email} ({h.admin?.adminRole})
                </div>
                {h.reason && <div style={{ color:C.white, fontSize:12, marginBottom:4 }}>Motivo: {h.reason}</div>}
                {h.internalNote && <div style={{ color:C.accent, fontSize:12, marginBottom:4 }}>Nota interna: {h.internalNote}</div>}
                {h.previousData && (
                  <details style={{ marginTop:6 }}>
                    <summary style={{ color:C.muted, fontSize:11, cursor:'pointer' }}>Ver alterações</summary>
                    <div style={{ marginTop:6, fontSize:11, color:C.muted }}>
                      <div>Antes: <code style={{color:C.lavLight}}>{JSON.stringify(h.previousData)}</code></div>
                      {h.newData && <div>Depois: <code style={{color:C.green}}>{JSON.stringify(h.newData)}</code></div>}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Users list ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const load = useCallback(() => {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    api.get(`/admin/users${q}`).then(r => setUsers(r.data.users || []))
  }, [search])

  useEffect(() => { load() }, [load])

  if (selectedId) return <UserDetail userId={selectedId} onBack={() => { setSelectedId(null); load() }} />

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Pesquisar email ou nome..."
        style={{ width:'100%', background:C.input, border:`1.5px solid ${C.plum}`, borderRadius:12, padding:'11px 14px', color:C.white, fontSize:14, marginBottom:14 }}
      />
      {users.map(u => (
        <div key={u.id}
          onClick={() => setSelectedId(u.id)}
          style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:14, marginBottom:8, cursor:'pointer' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:C.white, fontSize:13, fontWeight:600, marginBottom:3 }}>
                {u.email}
                {u.adminRole && <span style={{ color:C.accent, fontSize:11, marginLeft:8 }}>{u.adminRole}</span>}
              </div>
              <div style={{ color:C.muted, fontSize:12 }}>
                {u.profile?.displayName || 'sem perfil'} · {u.status}
                {u.riskScore > 30 && <span style={{ color:C.red }}> · risco {u.riskScore}</span>}
              </div>
            </div>
            <span style={{ color:C.muted, fontSize:20 }}>›</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).catch(() => {}) }, [])
  if (!data) return <div style={{ color:C.muted }}>A carregar...</div>
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
        <StatCard label="Reports" value={data.reports?.pending} color={C.red} />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <StatCard label="Fotos pend." value={data.photos?.pending} color={C.accent} />
        <StatCard label="Premium" value={data.subscriptions?.total} color={C.green} />
        <StatCard label="Verif." value={data.verifications?.pending} color={C.accent} />
      </div>
    </div>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState('PENDING')
  const load = useCallback(() => { api.get(`/admin/reports?status=${status}`).then(r => setReports(r.data.reports||[])) }, [status])
  useEffect(() => { load() }, [load])
  const resolve = async (id, s) => { await api.put(`/admin/reports/${id}`, { status: s }); load() }
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['PENDING','REVIEWING','RESOLVED','DISMISSED'].map(s=>(
          <button key={s} onClick={()=>setStatus(s)} style={{ background:status===s?'rgba(201,149,107,0.2)':C.card, border:`1px solid ${status===s?C.accent:C.plum}`, borderRadius:20, padding:'6px 12px', color:status===s?C.accent:C.muted, fontSize:12, minHeight:36 }}>{s}</button>
        ))}
      </div>
      {reports.length===0 && <p style={{color:C.muted}}>Sem reports.</p>}
      {reports.map(r=>(
        <div key={r.id} style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:14, padding:14, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{color:C.accent,fontWeight:600,fontSize:13}}>{r.reason}</span>
            <span style={{color:C.muted,fontSize:11}}>{new Date(r.createdAt).toLocaleDateString('pt')}</span>
          </div>
          <div style={{color:C.lavLight,fontSize:12,marginBottom:8}}>
            {r.reportedUser?.email}
            {r.reportedUser?.riskScore>0&&<span style={{color:C.red}}> · risco {r.reportedUser.riskScore}</span>}
          </div>
          {status==='PENDING'&&(
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>resolve(r.id,'RESOLVED')} style={{flex:1,background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:10,padding:8,color:C.green,fontSize:12,minHeight:40}}>✓ Procedente</button>
              <button onClick={()=>resolve(r.id,'DISMISSED')} style={{flex:1,background:C.input,border:`1px solid ${C.plum}`,borderRadius:10,padding:8,color:C.muted,fontSize:12,minHeight:40}}>✕ Dispensar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PhotosTab() {
  const [photos, setPhotos] = useState([])
  const load = useCallback(()=>{api.get('/admin/photos?status=PENDING').then(r=>setPhotos(r.data.photos||[]))}, [])
  useEffect(()=>{load()},[load])
  const moderate = async(id,s)=>{await api.put(`/admin/photos/${id}`,{moderationStatus:s});setPhotos(prev=>prev.filter(p=>p.id!==id))}
  return (
    <div>
      {photos.length===0&&<p style={{color:C.muted}}>Sem fotos pendentes.</p>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {photos.map(p=>(
          <div key={p.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,overflow:'hidden'}}>
            <img src={p.storagePath} alt="" style={{width:'100%',height:140,objectFit:'cover'}}/>
            <div style={{padding:10}}>
              <div style={{color:C.lavLight,fontSize:11,marginBottom:8}}>{p.profile?.displayName}</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>moderate(p.id,'APPROVED')} style={{flex:1,background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:8,padding:8,color:C.green,fontSize:13,minHeight:40}}>✓</button>
                <button onClick={()=>moderate(p.id,'REJECTED')} style={{flex:1,background:'rgba(224,92,122,0.15)',border:`1px solid ${C.red}`,borderRadius:8,padding:8,color:C.red,fontSize:13,minHeight:40}}>✕</button>
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
  const load = useCallback(()=>{api.get('/admin/profiles?status=PENDING_REVIEW').then(r=>setProfiles(r.data.profiles||[]))},[])
  useEffect(()=>{load()},[load])
  const moderate = async(id,s)=>{await api.put(`/admin/profiles/${id}/status`,{status:s,reason:'Admin review'});setProfiles(prev=>prev.filter(p=>p.id!==id))}
  return (
    <div>
      {profiles.length===0&&<p style={{color:C.muted}}>Sem perfis pendentes.</p>}
      {profiles.map(p=>(
        <div key={p.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:14,marginBottom:10}}>
          <div style={{color:C.white,fontWeight:600,fontSize:14,marginBottom:4}}>{p.displayName}</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:10}}>{p.user?.email} · {p.type} · {p.city||'—'}</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>moderate(p.id,'APPROVED')} style={{flex:1,background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:10,padding:8,color:C.green,fontSize:13,minHeight:40}}>Aprovar</button>
            <button onClick={()=>moderate(p.id,'REJECTED')} style={{flex:1,background:'rgba(224,92,122,0.15)',border:`1px solid ${C.red}`,borderRadius:10,padding:8,color:C.red,fontSize:13,minHeight:40}}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function VerificationsTab() {
  const [list, setList] = useState([])
  const load = useCallback(()=>{api.get('/admin/verifications').then(r=>setList(r.data.verifications||[]))},[])
  useEffect(()=>{load()},[load])
  const review = async(userId,s)=>{await api.put(`/admin/verifications/${userId}`,{status:s});setList(prev=>prev.filter(v=>v.userId!==userId))}
  return (
    <div>
      {list.length===0&&<p style={{color:C.muted}}>Sem verificações pendentes.</p>}
      {list.map(v=>(
        <div key={v.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:14,marginBottom:8}}>
          <div style={{color:C.white,fontSize:13,marginBottom:4}}>{v.user?.profile?.displayName}</div>
          <div style={{color:C.muted,fontSize:11,marginBottom:10}}>{v.user?.email}</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>review(v.userId,'APPROVED')} style={{flex:1,background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:10,padding:8,color:C.green,fontSize:13,minHeight:40}}>Aprovar</button>
            <button onClick={()=>review(v.userId,'REJECTED')} style={{flex:1,background:'rgba(224,92,122,0.15)',border:`1px solid ${C.red}`,borderRadius:10,padding:8,color:C.red,fontSize:13,minHeight:40}}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AuditTab() {
  const [logs, setLogs] = useState([])
  useEffect(()=>{api.get('/admin/audit').then(r=>setLogs(r.data.logs||[]))},[])
  return (
    <div>
      {logs.map(l=>(
        <div key={l.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:10,padding:'10px 14px',marginBottom:6}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{color:C.accent,fontWeight:600,fontSize:12}}>{l.action}</span>
            <span style={{color:C.muted,fontSize:10}}>{new Date(l.createdAt).toLocaleString('pt')}</span>
          </div>
          <div style={{color:C.lavLight,fontSize:11}}>Por: {l.admin?.email}</div>
          {l.reason&&<div style={{color:C.muted,fontSize:11,marginTop:2}}>↳ {l.reason}</div>}
        </div>
      ))}
    </div>
  )
}

function BetaTab() {
  const [invites, setInvites] = useState([])
  const [form, setForm] = useState({email:'',maxUses:1})
  const [newInvite, setNewInvite] = useState(null)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(()=>{api.get('/admin/beta/invites').then(r=>setInvites(r.data.invites||[]))},[])
  useEffect(()=>{load()},[load])
  const create = async()=>{
    setError('')
    try{const res=await api.post('/admin/beta/invites',{email:form.email||undefined,maxUses:Number(form.maxUses)});setNewInvite(res.data);setForm({email:'',maxUses:1});load()}
    catch(err){setError(err.response?.data?.error||'Erro.')}
  }
  const toggle = async(id)=>{await api.put(`/admin/beta/invites/${id}/toggle`);load()}
  const remove = async(id)=>{try{await api.delete(`/admin/beta/invites/${id}`);load()}catch(err){setError(err.response?.data?.error||'Erro.')}}
  const copy = (url,id)=>{navigator.clipboard.writeText(url).then(()=>{setCopied(id);setTimeout(()=>setCopied(''),2000)})}
  return (
    <div>
      <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{color:C.lavLight,fontWeight:600,fontSize:13,marginBottom:10}}>Criar convite</div>
        {error&&<div style={{color:C.red,fontSize:12,marginBottom:8}}>{error}</div>}
        <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="Email (opcional)" style={inp}/>
        <button onClick={create} style={{width:'100%',background:`linear-gradient(135deg,${C.accent},${C.rose})`,border:'none',borderRadius:12,padding:12,color:'#1A0A2E',fontWeight:700,fontSize:14,minHeight:48}}>Criar convite</button>
        {newInvite&&<div style={{marginTop:12,background:C.input,borderRadius:10,padding:'10px 12px',fontSize:12,color:C.lavLight,wordBreak:'break-all'}}>
          {newInvite.inviteUrl}
          <button onClick={()=>copy(newInvite.inviteUrl,'new')} style={{marginLeft:8,color:C.accent,border:'none',background:'none',fontSize:12}}>{copied==='new'?'✓ Copiado':'Copiar'}</button>
        </div>}
      </div>
      {invites.map(inv=>{
        const url=`${window.location.origin}/join/${inv.code}`
        return(
          <div key={inv.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:12,padding:14,marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{color:C.accent,fontWeight:700,fontSize:16,letterSpacing:1}}>{inv.code}</span>
              <span style={{color:inv.active?C.green:C.muted,fontSize:11}}>{inv.active?'● Activo':'○ Inactivo'}</span>
            </div>
            <div style={{color:C.muted,fontSize:11,marginBottom:10}}>{inv.useCount}/{inv.maxUses} usos{inv.email&&` · ${inv.email}`}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button onClick={()=>copy(url,inv.id)} style={{background:C.input,border:`1px solid ${C.plum}`,borderRadius:8,padding:'6px 12px',color:C.lavLight,fontSize:12,minHeight:36}}>{copied===inv.id?'✓':'📋 Copiar'}</button>
              <button onClick={()=>toggle(inv.id)} style={{background:C.input,border:`1px solid ${C.plum}`,borderRadius:8,padding:'6px 12px',color:C.lavLight,fontSize:12,minHeight:36}}>{inv.active?'Desactivar':'Activar'}</button>
              {!inv.usedById&&<button onClick={()=>remove(inv.id)} style={{background:'rgba(224,92,122,0.1)',border:`1px solid ${C.red}`,borderRadius:8,padding:'6px 12px',color:C.red,fontSize:12,minHeight:36}}>Apagar</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const TAB_CONTENT = {
  dashboard:DashboardTab, reports:ReportsTab, photos:PhotosTab,
  profiles:ProfilesTab, users:UsersTab, verifications:VerificationsTab,
  conversations:()=><p style={{color:C.muted}}>Conversas — em breve.</p>,
  audit:AuditTab, beta:BetaTab
}

export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(urlTab||'dashboard')
  const changeTab = t => { setTab(t); navigate(`/admin/${t}`,{replace:true}) }
  const TabContent = TAB_CONTENT[tab] || DashboardTab

  return (
    <div style={{minHeight:'100vh',background:C.bg,maxWidth:600,margin:'0 auto'}}>
      {/* Header */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.plum}`, padding:'calc(16px + env(safe-area-inset-top)) 16px 14px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:C.white}}>Between Us · Admin</div>
            <div style={{fontSize:11,color:C.accent}}>{user?.email} · {user?.adminRole}</div>
          </div>
          <button onClick={()=>{logout();navigate('/login')}} style={{background:'none',border:`1px solid ${C.plum}`,borderRadius:10,padding:'6px 14px',color:C.muted,fontSize:12,minHeight:36}}>Sair</button>
        </div>
      </div>
      {/* Tabs */}
      <div style={{display:'flex',overflowX:'auto',gap:4,padding:'10px 12px',borderBottom:`1px solid ${C.plum}`,WebkitOverflowScrolling:'touch',scrollbarWidth:'none',background:C.bg,position:'sticky',top:72,zIndex:40}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>changeTab(t.key)} style={{flexShrink:0,background:tab===t.key?'rgba(201,149,107,0.15)':'none',border:`1px solid ${tab===t.key?C.accent:'transparent'}`,borderRadius:10,padding:'7px 14px',color:tab===t.key?C.accent:C.muted,fontSize:12,display:'flex',alignItems:'center',gap:5,minHeight:36,whiteSpace:'nowrap'}}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{padding:'16px 16px calc(32px + env(safe-area-inset-bottom))'}}>
        <TabContent />
      </div>
    </div>
  )
}
