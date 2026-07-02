import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0A141A', card:'#102129', input:'#0F1E26', plum:'#1E3340',
  accent:'#B8A7FF', accentLight:'#D4C8FF', rose:'#9B8EE0', lavLight:'#AAB6C2',
  white:'#F5F7FA', muted:'#7E8FA3', green:'#4ADE80', red:'#F87171'
}

const INP = {
  width:'100%', background:C.input, border:`1.5px solid ${C.plum}`,
  borderRadius:12, padding:'12px 14px', color:C.white, fontSize:15,
  marginBottom:10, display:'block', WebkitAppearance:'none', outline:'none',
}

// ─── 3×3 Tab grid — no horizontal scroll ─────────────────────────────────────
function TabGrid({ tab, changeTab }) {
  const TABS = [
    { key:'dashboard',     label:'Dashboard',    icon:'📊' },
    { key:'reports',       label:'Reports',      icon:'⚠️' },
    { key:'photos',        label:'Fotos',        icon:'📷' },
    { key:'profiles',      label:'Perfis',       icon:'👤' },
    { key:'users',         label:'Utilizadores', icon:'👥' },
    { key:'verifications', label:'Verificações', icon:'✅' },
    { key:'conversations', label:'Conversas',    icon:'💬' },
    { key:'audit',         label:'Auditoria',    icon:'📋' },
    { key:'beta',          label:'Beta',         icon:'🎟️' },
  ]
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6,
      padding:'12px 12px 8px', background:C.bg,
      borderBottom:`1px solid ${C.plum}`,
    }}>
      {TABS.map(t => {
        const active = tab === t.key
        return (
          <button key={t.key} onClick={() => changeTab(t.key)} style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:4,
            background: active ? 'rgba(201,149,107,0.18)' : C.card,
            border: `1.5px solid ${active ? C.accent : C.plum}`,
            borderRadius:12, padding:'10px 6px', minHeight:60, cursor:'pointer',
          }}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{
              fontSize:10, fontWeight:active?700:400,
              color:active?C.accentLight:C.muted,
              lineHeight:1.2, textAlign:'center',
            }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:'14px 12px',textAlign:'center',flex:1,minWidth:80}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:color||C.accent}}>{value??'—'}</div>
      <div style={{color:C.muted,fontSize:10,marginTop:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
    </div>
  )
}

function ReasonModal({ title, onConfirm, onCancel, hasNote=false }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={onCancel}>
      <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'24px 20px calc(32px + env(safe-area-inset-bottom))'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.plum,borderRadius:2,margin:'0 auto 18px'}}/>
        <h3 style={{color:C.white,fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:14,marginTop:0}}>{title}</h3>
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo (obrigatório)" style={INP}/>
        {hasNote && (
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Nota interna (opcional — só admins vêem)" rows={3}
            style={{...INP,resize:'none'}}/>
        )}
        <div style={{display:'flex',gap:10,marginTop:6}}>
          <button onClick={onCancel} style={{flex:1,background:'none',border:`1px solid ${C.plum}`,borderRadius:50,padding:13,color:C.muted,fontSize:14,minHeight:50}}>Cancelar</button>
          <button onClick={()=>reason.trim()&&onConfirm(reason,note)} disabled={!reason.trim()}
            style={{flex:2,background:`linear-gradient(135deg,${C.accent},${C.rose})`,border:'none',borderRadius:50,padding:13,color:'#1A0A2E',fontWeight:700,fontSize:14,minHeight:50,opacity:reason.trim()?1:0.5}}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Role Manager — SUPER_ADMIN only ─────────────────────────────────────────
const ROLES = [
  { value: null,               label: 'Utilizador normal',    desc: 'Sem acesso ao admin' },
  { value: 'CONTENT_REVIEWER', label: 'Revisor de conteúdo',  desc: 'Aprova/rejeita fotos e perfis' },
  { value: 'SUPPORT',          label: 'Suporte',              desc: 'Vê utilizadores e reports' },
  { value: 'MODERATOR',        label: 'Moderador',            desc: 'Perfis, fotos, reports, conversas' },
  { value: 'FINANCE',          label: 'Financeiro',           desc: 'Subscrições e métricas' },
  { value: 'ADMIN',            label: 'Admin',                desc: 'Tudo excepto gerir roles' },
  { value: 'SUPER_ADMIN',      label: 'Super Admin',          desc: 'Acesso total incluindo roles' },
]

function RoleManager({ userId, currentRole, onChanged }) {
  const { user: me } = useAuth()
  const [selectedRole, setSelectedRole] = useState(currentRole || null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  if (me?.adminRole !== 'SUPER_ADMIN') return null

  const save = async () => {
    if (!reason.trim()) return setError('Motivo obrigatório.')
    setSaving(true); setMsg(''); setError('')
    try {
      await api.put(`/admin/users/${userId}/role`, { adminRole: selectedRole, reason })
      setMsg('Role actualizado.')
      setReason('')
      setOpen(false)
      onChanged()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro.')
    } finally {
      setSaving(false)
    }
  }

  const current = ROLES.find(r => r.value === currentRole) || ROLES[0]

  return (
    <div style={{borderTop:`1px solid ${C.plum}`,paddingTop:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:open?12:0}}>
        <div>
          <div style={{fontSize:12,color:C.lavLight,fontWeight:600}}>Role de admin</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{current.label} — {current.desc}</div>
        </div>
        <button onClick={()=>setOpen(!open)} style={{background:C.input,border:`1px solid ${C.plum}`,borderRadius:8,padding:'6px 12px',color:C.lavLight,fontSize:12,minHeight:34}}>
          {open ? 'Cancelar' : '✏️ Alterar role'}
        </button>
      </div>

      {open && (
        <div>
          {msg   && <div style={{background:'rgba(61,214,140,0.1)',border:`1px solid ${C.green}`,borderRadius:8,padding:'8px 12px',marginBottom:10,color:C.green,fontSize:12}}>{msg}</div>}
          {error && <div style={{background:'rgba(224,92,122,0.1)',border:`1px solid ${C.red}`,borderRadius:8,padding:'8px 12px',marginBottom:10,color:C.red,fontSize:12}}>{error}</div>}

          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
            {ROLES.map(r => (
              <div key={String(r.value)} onClick={()=>setSelectedRole(r.value)} style={{
                background: selectedRole===r.value ? 'rgba(201,149,107,0.15)' : C.input,
                border:`1.5px solid ${selectedRole===r.value ? C.accent : C.plum}`,
                borderRadius:10, padding:'10px 12px', cursor:'pointer',
              }}>
                <div style={{fontSize:13,fontWeight:600,color:selectedRole===r.value?C.accent:C.white}}>{r.label}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{r.desc}</div>
              </div>
            ))}
          </div>

          <input value={reason} onChange={e=>setReason(e.target.value)}
            placeholder="Motivo da alteração (obrigatório)"
            style={{width:'100%',background:C.input,border:`1.5px solid ${C.plum}`,borderRadius:10,padding:'10px 12px',color:C.white,fontSize:13,marginBottom:10}} />

          <button onClick={save} disabled={saving||!reason.trim()} style={{
            width:'100%',background:`linear-gradient(135deg,${C.accent},${C.rose})`,border:'none',
            borderRadius:50,padding:'11px',fontSize:13,fontWeight:700,color:'#1A0A2E',
            cursor:saving||!reason.trim()?'not-allowed':'pointer',
            opacity:saving||!reason.trim()?0.5:1, minHeight:44,
          }}>
            {saving ? 'A guardar...' : 'Guardar role'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email:'', password:'', adminRole:'', reason:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!form.email || !form.password || !form.reason) {
      return setError('Email, password e motivo são obrigatórios.')
    }
    setSaving(true); setError('')
    try {
      const res = await api.post('/admin/users', {
        email: form.email,
        password: form.password,
        adminRole: form.adminRole || undefined,
        reason: form.reason
      })
      onCreated(res.data.user)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar utilizador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={onClose}>
      <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'24px 20px calc(32px + env(safe-area-inset-bottom))'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.plum,borderRadius:2,margin:'0 auto 18px'}}/>
        <h3 style={{color:C.white,fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:16,marginTop:0}}>Criar utilizador</h3>

        {error && <div style={{background:'rgba(224,92,122,0.1)',border:`1px solid ${C.red}`,borderRadius:10,padding:'10px 12px',marginBottom:12,color:C.red,fontSize:13}}>{error}</div>}

        <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
          type="email" placeholder="Email *"
          style={{width:'100%',background:C.input,border:`1.5px solid ${C.plum}`,borderRadius:12,padding:'11px 14px',color:C.white,fontSize:14,marginBottom:10}} />

        <input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}
          type="password" placeholder="Password inicial *"
          style={{width:'100%',background:C.input,border:`1.5px solid ${C.plum}`,borderRadius:12,padding:'11px 14px',color:C.white,fontSize:14,marginBottom:10}} />

        <select value={form.adminRole} onChange={e=>setForm(p=>({...p,adminRole:e.target.value}))}
          style={{width:'100%',background:C.input,border:`1.5px solid ${C.plum}`,borderRadius:12,padding:'11px 14px',color:C.white,fontSize:14,marginBottom:10}}>
          <option value="">Utilizador normal</option>
          <option value="CONTENT_REVIEWER">Revisor de conteúdo</option>
          <option value="SUPPORT">Suporte</option>
          <option value="MODERATOR">Moderador</option>
          <option value="FINANCE">Financeiro</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>

        <input value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}
          placeholder="Motivo da criação *"
          style={{width:'100%',background:C.input,border:`1.5px solid ${C.plum}`,borderRadius:12,padding:'11px 14px',color:C.white,fontSize:14,marginBottom:16}} />

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,background:'none',border:`1px solid ${C.plum}`,borderRadius:50,padding:12,color:C.muted,fontSize:14,minHeight:48}}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{flex:2,background:`linear-gradient(135deg,${C.accent},${C.rose})`,border:'none',borderRadius:50,padding:12,color:'#1A0A2E',fontWeight:700,fontSize:14,minHeight:48,opacity:saving?0.6:1}}>
            {saving ? 'A criar...' : 'Criar utilizador'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Detail ──────────────────────────────────────────────────────────────
function UserDetail({ userId, onBack }) {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [view, setView] = useState('info')
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
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
    setEditing(null); setMsg(''); setError('')
    try {
      await api.put(`/admin/users/${userId}`, { email: form.email, reason, internalNote: note })
      setMsg('Utilizador actualizado.'); load()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  const saveProfile = async (reason, note) => {
    if (!data?.profile?.id) return
    setEditing(null); setMsg(''); setError('')
    try {
      await api.put(`/admin/profiles/${data.profile.id}`, {
        displayName: form.displayName, bio: form.bio,
        city: form.city, status: form.profileStatus, reason, internalNote: note
      })
      setMsg('Perfil actualizado.'); load()
    } catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  const doStatusChange = async (status, reason) => {
    setModal(null)
    try { await api.put(`/admin/users/${userId}/status`, { status, reason }); setMsg(`Estado: ${status}.`); load() }
    catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  const doDelete = async (reason, note) => {
    setModal(null)
    try { await api.delete(`/admin/users/${userId}`, { data: { reason, internalNote: note } }); onBack() }
    catch (err) { setError(err.response?.data?.error || 'Erro.') }
  }

  if (!data) return <div style={{color:C.muted,padding:20}}>A carregar...</div>
  const u = data; const p = data.profile

  return (
    <>
      {modal==='suspend' && <ReasonModal title="Suspender utilizador" onConfirm={(r,n)=>doStatusChange('SUSPENDED',r)} onCancel={()=>setModal(null)} hasNote/>}
      {modal==='ban'     && <ReasonModal title="Banir utilizador"    onConfirm={(r,n)=>doStatusChange('BANNED',r)}    onCancel={()=>setModal(null)} hasNote/>}
      {modal==='activate'&& <ReasonModal title="Reactivar"           onConfirm={(r,n)=>doStatusChange('ACTIVE',r)}    onCancel={()=>setModal(null)}/>}
      {modal==='delete'  && <ReasonModal title="⚠️ Eliminar (RGPD)"  onConfirm={(r,n)=>doDelete(r,n)}                 onCancel={()=>setModal(null)} hasNote/>}
      {editing==='user'  && <ReasonModal title="Guardar alterações"  onConfirm={(r,n)=>saveUser(r,n)}                 onCancel={()=>setEditing(null)} hasNote/>}
      {editing==='profile'&&<ReasonModal title="Guardar perfil"      onConfirm={(r,n)=>saveProfile(r,n)}              onCancel={()=>setEditing(null)} hasNote/>}

      <button onClick={onBack} style={{color:C.lavLight,fontSize:14,padding:'4px 0',marginBottom:14}}>← Utilizadores</button>

      {/* Header */}
      <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:16,padding:16,marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:700,color:C.white,marginBottom:4}}>{u.email}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>
          {u.status}{u.adminRole && <span style={{color:C.accent}}> · {u.adminRole}</span>}
          {u.riskScore > 0 && <span style={{color:C.red}}> · risco {u.riskScore}</span>}
        </div>
        <div style={{fontSize:11,color:C.muted}}>
          Criado: {new Date(u.createdAt).toLocaleDateString('pt')}
          {u.lastSeenAt && ` · Visto: ${new Date(u.lastSeenAt).toLocaleDateString('pt')}`}
        </div>
      </div>

      {/* Actions */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
        {u.status!=='ACTIVE'    && <button onClick={()=>setModal('activate')} style={{background:'rgba(61,214,140,0.1)',border:`1px solid ${C.green}`,borderRadius:12,padding:12,color:C.green,fontSize:13,minHeight:46}}>✓ Reactivar</button>}
        {u.status!=='SUSPENDED' && <button onClick={()=>setModal('suspend')} style={{background:'rgba(201,149,107,0.1)',border:`1px solid ${C.accent}`,borderRadius:12,padding:12,color:C.accent,fontSize:13,minHeight:46}}>⏸ Suspender</button>}
        {u.status!=='BANNED'    && <button onClick={()=>setModal('ban')} style={{background:'rgba(224,92,122,0.1)',border:`1px solid ${C.red}`,borderRadius:12,padding:12,color:C.red,fontSize:13,minHeight:46}}>🚫 Banir</button>}
        <button onClick={()=>setModal('delete')} style={{background:'rgba(224,92,122,0.05)',border:'1px solid rgba(224,92,122,0.25)',borderRadius:12,padding:12,color:C.red,fontSize:13,minHeight:46}}>🗑 Eliminar</button>
      </div>

      {msg   && <div style={{background:'rgba(61,214,140,0.1)',border:`1px solid ${C.green}`,borderRadius:10,padding:'10px 14px',marginBottom:12,color:C.green,fontSize:13}}>{msg}</div>}
      {error && <div style={{background:'rgba(224,92,122,0.1)',border:`1px solid ${C.red}`,borderRadius:10,padding:'10px 14px',marginBottom:12,color:C.red,fontSize:13}}>{error}</div>}

      {/* Sub-tabs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:16}}>
        {[['info','📧 Conta'],['profile','👤 Perfil'],['history','📋 Histórico']].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{
            background:view===k?'rgba(201,149,107,0.15)':C.card,
            border:`1.5px solid ${view===k?C.accent:C.plum}`,
            borderRadius:12,padding:'10px 4px',color:view===k?C.accent:C.muted,
            fontSize:11,minHeight:44,fontWeight:view===k?700:400,
          }}>{l}</button>
        ))}
      </div>

      {/* Conta */}
      {view==='info' && (
        <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:16,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span style={{color:C.lavLight,fontWeight:600,fontSize:14}}>Dados da conta</span>
            <button onClick={()=>setEditing('user')} style={{color:C.accent,fontSize:13,border:`1px solid ${C.plum}`,borderRadius:8,padding:'6px 12px',minHeight:34}}>✏️ Editar</button>
          </div>
          <label style={{color:C.muted,fontSize:11,display:'block',marginBottom:4}}>EMAIL</label>
          <input style={INP} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
          <div style={{color:C.muted,fontSize:12,lineHeight:1.8,marginTop:8}}>
            <div>Email verificado: {u.emailVerifiedAt?'✅ '+new Date(u.emailVerifiedAt).toLocaleDateString('pt'):'❌ Não'}</div>
            <div>Subscrição: <span style={{color:C.accent}}>{u.subscription?.plan||'FREE'}</span> · {u.subscription?.status||'—'}</div>
            <div>Verificação selfie: {u.verification?.status||'—'}</div>
          </div>
        </div>
      )}

      {/* Perfil */}
      {view==='profile' && !p && <div style={{color:C.muted,padding:20,textAlign:'center'}}>Sem perfil criado.</div>}
      {view==='profile' && p && (
        <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:16,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span style={{color:C.lavLight,fontWeight:600,fontSize:14}}>Perfil</span>
            <button onClick={()=>setEditing('profile')} style={{color:C.accent,fontSize:13,border:`1px solid ${C.plum}`,borderRadius:8,padding:'6px 12px',minHeight:34}}>✏️ Editar</button>
          </div>
          {[['Nome',form.displayName,'displayName'],['Bio',form.bio,'bio'],['Cidade',form.city,'city']].map(([lbl,val,key])=>(
            <div key={key} style={{marginBottom:8}}>
              <label style={{color:C.muted,fontSize:11,display:'block',marginBottom:4}}>{lbl.toUpperCase()}</label>
              <input style={INP} value={val} onChange={e=>setForm(pr=>({...pr,[key]:e.target.value}))}/>
            </div>
          ))}
          <label style={{color:C.muted,fontSize:11,display:'block',marginBottom:4}}>STATUS</label>
          <select value={form.profileStatus} onChange={e=>setForm(pr=>({...pr,profileStatus:e.target.value}))}
            style={{...INP,marginBottom:0}}>
            {['DRAFT','PENDING_REVIEW','APPROVED','REJECTED','HIDDEN','SUSPENDED'].map(s=>(
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div style={{color:C.muted,fontSize:12,lineHeight:1.8,marginTop:10}}>
            <div>Tipo: {p.type} · {p.relationshipStatus}</div>
            {p.rejectionReason && <div style={{color:C.red}}>Rejeição: {p.rejectionReason}</div>}
            {p.moderationNotes && <div style={{color:C.accent}}>Notas: {p.moderationNotes}</div>}
          </div>
          {p.photos?.length > 0 && (
            <div style={{marginTop:14}}>
              <div style={{color:C.lavLight,fontSize:12,fontWeight:600,marginBottom:8}}>Fotos ({p.photos.length})</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {p.photos.map(ph=>(
                  <div key={ph.id}>
                    <img src={ph.storagePath} alt="" style={{width:72,height:72,objectFit:'cover',borderRadius:10,border:`1px solid ${C.plum}`}}/>
                    <div style={{fontSize:9,color:C.muted,textAlign:'center',marginTop:2}}>{ph.moderationStatus}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {view==='history' && (
        <div>
          <div style={{background:'rgba(201,149,107,0.08)',border:'1px solid rgba(201,149,107,0.2)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:C.accent}}>
            🔒 Histórico visível apenas a administradores
          </div>
          {history.length===0 && <p style={{color:C.muted}}>Sem histórico.</p>}
          {history.map(h=>(
            <div key={h.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:12,padding:'12px 14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{color:C.accent,fontWeight:600,fontSize:13}}>{h.action}</span>
                <span style={{color:C.muted,fontSize:11}}>{new Date(h.createdAt).toLocaleString('pt')}</span>
              </div>
              <div style={{color:C.lavLight,fontSize:12,marginBottom:4}}>Por: {h.admin?.email}</div>
              {h.reason && <div style={{color:C.white,fontSize:12,marginBottom:4}}>Motivo: {h.reason}</div>}
              {h.internalNote && <div style={{color:C.accent,fontSize:12,marginBottom:4}}>Nota: {h.internalNote}</div>}
              {h.previousData && (
                <details style={{marginTop:6}}>
                  <summary style={{color:C.muted,fontSize:11,cursor:'pointer'}}>Ver alterações</summary>
                  <div style={{marginTop:6,fontSize:11}}>
                    <div style={{color:C.muted}}>Antes: <code style={{color:C.lavLight}}>{JSON.stringify(h.previousData)}</code></div>
                    {h.newData && <div style={{color:C.muted,marginTop:4}}>Depois: <code style={{color:C.green}}>{JSON.stringify(h.newData)}</code></div>}
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────
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
        style={{...INP, marginBottom:14}}/>
      {users.map(u => (
        <div key={u.id} onClick={() => setSelectedId(u.id)}
          style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:14,marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{color:C.white,fontSize:13,fontWeight:600,marginBottom:3}}>
              {u.email}{u.adminRole && <span style={{color:C.accent,fontSize:11,marginLeft:8}}>{u.adminRole}</span>}
            </div>
            <div style={{color:C.muted,fontSize:12}}>
              {u.profile?.displayName||'sem perfil'} · {u.status}
              {u.riskScore>30 && <span style={{color:C.red}}> · risco {u.riskScore}</span>}
            </div>
          </div>
          <span style={{color:C.muted,fontSize:20}}>›</span>
        </div>
      ))}
    </div>
  )
}

function DashboardTab() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).catch(() => {}) }, [])
  if (!data) return <div style={{color:C.muted}}>A carregar...</div>
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        <StatCard label="Utilizadores" value={data.users?.total}/>
        <StatCard label="Hoje" value={data.users?.newToday} color={C.green}/>
        <StatCard label="Alto risco" value={data.users?.highRisk} color={C.red}/>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        <StatCard label="Perfis" value={data.profiles?.total}/>
        <StatCard label="Pendentes" value={data.profiles?.pending} color={C.accent}/>
        <StatCard label="Reports" value={data.reports?.pending} color={C.red}/>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <StatCard label="Fotos pend." value={data.photos?.pending} color={C.accent}/>
        <StatCard label="Premium" value={data.subscriptions?.total} color={C.green}/>
        <StatCard label="Verif." value={data.verifications?.pending} color={C.accent}/>
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
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14}}>
        {['PENDING','REVIEWING','RESOLVED','DISMISSED'].map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            background:status===s?'rgba(201,149,107,0.2)':C.card,
            border:`1px solid ${status===s?C.accent:C.plum}`,
            borderRadius:10, padding:'10px 4px',
            color:status===s?C.accent:C.muted, fontSize:12, minHeight:42,
          }}>{s}</button>
        ))}
      </div>
      {reports.length===0 && <p style={{color:C.muted}}>Sem reports.</p>}
      {reports.map(r => (
        <div key={r.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:14,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{color:C.accent,fontWeight:600,fontSize:13}}>{r.reason}</span>
            <span style={{color:C.muted,fontSize:11}}>{new Date(r.createdAt).toLocaleDateString('pt')}</span>
          </div>
          <div style={{color:C.lavLight,fontSize:12,marginBottom:8}}>
            {r.reportedUser?.email}
            {r.reportedUser?.riskScore>0 && <span style={{color:C.red}}> · risco {r.reportedUser.riskScore}</span>}
          </div>
          {status==='PENDING' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={()=>resolve(r.id,'RESOLVED')} style={{background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:10,padding:10,color:C.green,fontSize:13,minHeight:44}}>✓ Procedente</button>
              <button onClick={()=>resolve(r.id,'DISMISSED')} style={{background:C.input,border:`1px solid ${C.plum}`,borderRadius:10,padding:10,color:C.muted,fontSize:13,minHeight:44}}>✕ Dispensar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PhotosTab() {
  const [photos, setPhotos] = useState([])
  const load = useCallback(() => { api.get('/admin/photos?status=PENDING').then(r => setPhotos(r.data.photos||[])) }, [])
  useEffect(() => { load() }, [load])
  const moderate = async (id, s) => { await api.put(`/admin/photos/${id}`, { moderationStatus: s }); setPhotos(prev => prev.filter(p => p.id!==id)) }
  return (
    <div>
      {photos.length===0 && <p style={{color:C.muted}}>Sem fotos pendentes.</p>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {photos.map(p => (
          <div key={p.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,overflow:'hidden'}}>
            <img src={p.storagePath} alt="" style={{width:'100%',height:140,objectFit:'cover'}}/>
            <div style={{padding:10}}>
              <div style={{color:C.lavLight,fontSize:11,marginBottom:8}}>{p.profile?.displayName}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <button onClick={()=>moderate(p.id,'APPROVED')} style={{background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:8,padding:8,color:C.green,fontSize:14,minHeight:42}}>✓</button>
                <button onClick={()=>moderate(p.id,'REJECTED')} style={{background:'rgba(224,92,122,0.15)',border:`1px solid ${C.red}`,borderRadius:8,padding:8,color:C.red,fontSize:14,minHeight:42}}>✕</button>
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
  const load = useCallback(() => { api.get('/admin/profiles?status=PENDING_REVIEW').then(r => setProfiles(r.data.profiles||[])) }, [])
  useEffect(() => { load() }, [load])
  const moderate = async (id, s) => { await api.put(`/admin/profiles/${id}/status`, { status: s, reason:'Admin review' }); setProfiles(prev => prev.filter(p => p.id!==id)) }
  return (
    <div>
      {profiles.length===0 && <p style={{color:C.muted}}>Sem perfis pendentes.</p>}
      {profiles.map(p => (
        <div key={p.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:14,marginBottom:10}}>
          <div style={{color:C.white,fontWeight:600,fontSize:14,marginBottom:4}}>{p.displayName}</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:10}}>{p.user?.email} · {p.type}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={()=>moderate(p.id,'APPROVED')} style={{background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:10,padding:10,color:C.green,fontSize:13,minHeight:44}}>Aprovar</button>
            <button onClick={()=>moderate(p.id,'REJECTED')} style={{background:'rgba(224,92,122,0.15)',border:`1px solid ${C.red}`,borderRadius:10,padding:10,color:C.red,fontSize:13,minHeight:44}}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function VerificationsTab() {
  const [list, setList] = useState([])
  const load = useCallback(() => { api.get('/admin/verifications').then(r => setList(r.data.verifications||[])) }, [])
  useEffect(() => { load() }, [load])
  const review = async (userId, s) => { await api.put(`/admin/verifications/${userId}`, { status: s }); setList(prev => prev.filter(v => v.userId!==userId)) }
  return (
    <div>
      {list.length===0 && <p style={{color:C.muted}}>Sem verificações pendentes.</p>}
      {list.map(v => (
        <div key={v.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:14,marginBottom:8}}>
          <div style={{color:C.white,fontSize:13,marginBottom:4}}>{v.user?.profile?.displayName}</div>
          <div style={{color:C.muted,fontSize:11,marginBottom:10}}>{v.user?.email}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={()=>review(v.userId,'APPROVED')} style={{background:'rgba(61,214,140,0.15)',border:`1px solid ${C.green}`,borderRadius:10,padding:10,color:C.green,fontSize:13,minHeight:44}}>Aprovar</button>
            <button onClick={()=>review(v.userId,'REJECTED')} style={{background:'rgba(224,92,122,0.15)',border:`1px solid ${C.red}`,borderRadius:10,padding:10,color:C.red,fontSize:13,minHeight:44}}>Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConversationsTab() {
  return <div style={{color:C.muted,padding:'40px 0',textAlign:'center'}}>Conversas — em breve.</div>
}

function AuditTab() {
  const [logs, setLogs] = useState([])
  useEffect(() => { api.get('/admin/audit').then(r => setLogs(r.data.logs||[])) }, [])
  return (
    <div>
      {logs.map(l => (
        <div key={l.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:10,padding:'10px 14px',marginBottom:6}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{color:C.accent,fontWeight:600,fontSize:12}}>{l.action}</span>
            <span style={{color:C.muted,fontSize:10}}>{new Date(l.createdAt).toLocaleString('pt')}</span>
          </div>
          <div style={{color:C.lavLight,fontSize:11}}>Por: {l.admin?.email}</div>
          {l.reason && <div style={{color:C.muted,fontSize:11,marginTop:2}}>↳ {l.reason}</div>}
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
  const load = useCallback(() => { api.get('/admin/beta/invites').then(r => setInvites(r.data.invites||[])) }, [])
  useEffect(() => { load() }, [load])
  const create = async () => {
    setError('')
    try {
      const res = await api.post('/admin/beta/invites', { email: form.email||undefined, maxUses: Number(form.maxUses) })
      setNewInvite(res.data); setForm({email:'',maxUses:1}); load()
    } catch (err) { setError(err.response?.data?.error||'Erro.') }
  }
  const toggle = async id => { await api.put(`/admin/beta/invites/${id}/toggle`); load() }
  const remove = async id => { try { await api.delete(`/admin/beta/invites/${id}`); load() } catch (err) { setError(err.response?.data?.error||'Erro.') } }
  const copy = (url, id) => { navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) }) }
  return (
    <div>
      <div style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{color:C.lavLight,fontWeight:600,fontSize:13,marginBottom:10}}>Criar convite</div>
        {error && <div style={{color:C.red,fontSize:12,marginBottom:8}}>{error}</div>}
        <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="Email (opcional)" style={INP}/>
        <button onClick={create} style={{width:'100%',background:`linear-gradient(135deg,${C.accent},${C.rose})`,border:'none',borderRadius:12,padding:13,color:'#1A0A2E',fontWeight:700,fontSize:15,minHeight:50}}>
          Criar convite
        </button>
        {newInvite && (
          <div style={{marginTop:12,background:C.input,borderRadius:10,padding:'10px 12px',fontSize:12,color:C.lavLight,wordBreak:'break-all'}}>
            {newInvite.inviteUrl}
            <button onClick={()=>copy(newInvite.inviteUrl,'new')} style={{marginLeft:8,color:C.accent,border:'none',background:'none',fontSize:12}}>
              {copied==='new'?'✓ Copiado':'Copiar'}
            </button>
          </div>
        )}
      </div>
      {invites.map(inv => {
        const url = `${window.location.origin}/join/${inv.code}`
        return (
          <div key={inv.id} style={{background:C.card,border:`1px solid ${C.plum}`,borderRadius:12,padding:14,marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{color:C.accent,fontWeight:700,fontSize:16,letterSpacing:1}}>{inv.code}</span>
              <span style={{color:inv.active?C.green:C.muted,fontSize:11}}>{inv.active?'● Activo':'○ Inactivo'}</span>
            </div>
            <div style={{color:C.muted,fontSize:11,marginBottom:10}}>{inv.useCount}/{inv.maxUses} usos{inv.email&&` · ${inv.email}`}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button onClick={()=>copy(url,inv.id)} style={{background:C.input,border:`1px solid ${C.plum}`,borderRadius:8,padding:'8px 12px',color:C.lavLight,fontSize:12,minHeight:38}}>{copied===inv.id?'✓ Copiado':'📋 Copiar link'}</button>
              <button onClick={()=>toggle(inv.id)} style={{background:C.input,border:`1px solid ${C.plum}`,borderRadius:8,padding:'8px 12px',color:C.lavLight,fontSize:12,minHeight:38}}>{inv.active?'Desactivar':'Activar'}</button>
              {!inv.usedById && <button onClick={()=>remove(inv.id)} style={{background:'rgba(224,92,122,0.1)',border:`1px solid ${C.red}`,borderRadius:8,padding:'8px 12px',color:C.red,fontSize:12,minHeight:38}}>Apagar</button>}
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
  conversations: ConversationsTab, audit: AuditTab, beta: BetaTab,
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(urlTab || 'dashboard')
  const changeTab = t => { setTab(t); navigate(`/admin/${t}`, { replace: true }) }
  const TabContent = TAB_CONTENT[tab] || DashboardTab

  return (
    <div style={{ minHeight:'100vh', background:C.bg, maxWidth:540, margin:'0 auto' }}>

      {/* Header */}
      <div style={{
        background: C.card,
        borderBottom: `1px solid ${C.plum}`,
        padding: 'calc(16px + env(safe-area-inset-top)) 16px 14px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.white }}>
              Between Us · Admin
            </div>
            <div style={{ fontSize:11, color:C.accent }}>{user?.email} · {user?.adminRole}</div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ background:'none', border:`1px solid ${C.plum}`, borderRadius:10, padding:'8px 14px', color:C.muted, fontSize:13, minHeight:38 }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* 3×3 grid — no scroll */}
      <div style={{ position:'sticky', top:72, zIndex:40, background:C.bg }}>
        <TabGrid tab={tab} changeTab={changeTab} />
      </div>

      {/* Content */}
      <div style={{ padding:'16px 16px calc(40px + env(safe-area-inset-bottom))' }}>
        <TabContent />
      </div>
    </div>
  )
}
