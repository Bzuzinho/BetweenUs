import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { Logo } from '../lib/design'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)', warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)'
}

const NAV = [
  ['dashboard','Dashboard'],['reports','Reports'],['photos','Fotos'],['profiles','Perfis'],['users','Utilizadores'],
  ['verifications','Verificações'],['conversations','Conversas'],['audit','Auditoria'],['affiliations','Afiliações'],['configuracoes','Configurações']
]

function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get('/admin/affiliations/overview').then(r => setData(r.data)).catch(e => setError(e.response?.data?.error || 'Não foi possível carregar os indicadores.'))
  }, [])
  if (error) return <Notice danger>{error}</Notice>
  if (!data) return <Empty>A carregar…</Empty>
  const cards = [
    ['Códigos de membros', data.referralCodes], ['Convites convertidos', data.totalConversions], ['Subscrições', data.subscribedConversions],
    ['Benefícios atribuídos', data.rewardsGranted], ['Pedidos beta pendentes', data.pendingBetaApplications]
  ]
  return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10}}>
    {cards.map(([label,value]) => <div key={label} style={card}><div style={{fontSize:28,color:C.primary,fontWeight:700}}>{value || 0}</div><div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:'.05em',marginTop:5}}>{label}</div></div>)}
  </div>
}

function AffiliateRuleManager() {
  const [rule,setRule] = useState(null)
  const [form,setForm] = useState({referralsRequired:2,rewardMonths:2})
  const [msg,setMsg] = useState(''); const [err,setErr] = useState(''); const [saving,setSaving] = useState(false)
  const load = useCallback(() => api.get('/admin/referral-rule').then(r => { setRule(r.data.rule); setForm({referralsRequired:r.data.rule.referralsRequired,rewardMonths:r.data.rule.rewardMonths}) }).catch(() => setErr('Não foi possível carregar a regra.')),[])
  useEffect(()=>{load()},[load])
  const save = async () => { setSaving(true); setErr(''); setMsg(''); try { const r=await api.put('/admin/referral-rule',{referralsRequired:Number(form.referralsRequired),rewardMonths:Number(form.rewardMonths)}); setRule(r.data.rule); setMsg('Regra atualizada.') } catch(e){setErr(e.response?.data?.error||'Erro ao guardar.')} finally{setSaving(false)} }
  if(!rule) return <Empty>A carregar…</Empty>
  return <div style={{...card,maxWidth:520}}>
    <h3 style={heading}>Benefícios por afiliação</h3>
    <p style={copy}>Define quando um membro recebe Premium por trazer novos membros que subscrevem.</p>
    <label style={label}>CONVIDADOS SUBSCRITOS NECESSÁRIOS</label>
    <input type="number" min="1" value={form.referralsRequired} onChange={e=>setForm(f=>({...f,referralsRequired:e.target.value}))} style={input}/>
    <label style={label}>MESES DE PREMIUM ATRIBUÍDOS</label>
    <input type="number" min="1" value={form.rewardMonths} onChange={e=>setForm(f=>({...f,rewardMonths:e.target.value}))} style={input}/>
    {err&&<Notice danger>{err}</Notice>}{msg&&<Notice>{msg}</Notice>}
    <button onClick={save} disabled={saving} style={primaryButton}>{saving?'A guardar…':'Guardar regra'}</button>
    <div style={{fontSize:12,color:C.muted,marginTop:14}}>Regra atual: cada <b style={{color:C.text}}>{rule.referralsRequired}</b> convidados subscritos atribuem <b style={{color:C.text}}>{rule.rewardMonths}</b> meses Premium.</div>
  </div>
}

function Conversions() {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  useEffect(()=>{api.get('/admin/affiliations/conversions').then(r=>setItems(r.data.conversions||[])).catch(e=>setError(e.response?.data?.error||'Erro ao carregar.')).finally(()=>setLoading(false))},[])
  if(loading) return <Empty>A carregar…</Empty>
  if(error) return <Notice danger>{error}</Notice>
  if(!items.length) return <Empty>Ainda não existem conversões de afiliação.</Empty>
  return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,300px),1fr))',gap:12}}>{items.map(x=><div key={x.id} style={card}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><div style={{color:C.text,fontWeight:600}}>{x.referrerEmail}</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>convidou {x.referredEmail}</div></div><div style={{fontSize:12,color:x.subscribedAt?C.success:C.warning}}>{x.subscribedAt?'Subscrito':'Registado'}</div></div>
    <div style={{fontSize:11,color:C.muted,marginTop:8}}>Código {x.code} · {new Date(x.createdAt).toLocaleString('pt-PT')} {x.creditGranted?'· benefício atribuído':''}</div>
  </div>)}</div>
}

function BetaApplications() {
  const [items,setItems]=useState([]); const [status,setStatus]=useState('ALL'); const [enabled,setEnabled]=useState(true)
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState('')
  const load=useCallback(()=>{setLoading(true);setError('');const q=status==='ALL'?'':`?status=${status}`;api.get(`/admin/beta/applications${q}`).then(r=>{setItems(r.data.applications||[]);setEnabled(r.data.enabled!==false)}).catch(e=>setError(e.response?.data?.error||'Não foi possível carregar os pedidos.')).finally(()=>setLoading(false))},[status])
  useEffect(()=>{load()},[load])
  const invite=async item=>{setBusy(item.id);setMessage('');setError('');try{await api.post(`/admin/beta/applications/${item.id}/invite`);setMessage(`Convite enviado para ${item.email}.`);load()}catch(e){setError(e.response?.data?.error||'Não foi possível enviar o convite.')}finally{setBusy('')}}
  const reject=async item=>{if(!confirm(`Arquivar o pedido de ${item.email}?`))return;setBusy(item.id);setMessage('');setError('');try{await api.put(`/admin/beta/applications/${item.id}/reject`);setMessage('Pedido arquivado.');load()}catch(e){setError(e.response?.data?.error||'Não foi possível arquivar.')}finally{setBusy('')}}
  return <div>
    {!enabled&&<Notice danger>A receção de novos pedidos beta está desativada. O histórico continua disponível.</Notice>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}><div><h3 style={heading}>Pedidos de acesso beta</h3><p style={copy}>Área temporária, separada das afiliações entre membros.</p></div><select value={status} onChange={e=>setStatus(e.target.value)} style={{...input,width:'auto',marginBottom:0}}><option value="ALL">Todos</option><option value="PENDING">Pendentes</option><option value="INVITED">Convidados</option><option value="REJECTED">Arquivados</option></select></div>
    {message&&<Notice>{message}</Notice>}{error&&<Notice danger>{error}</Notice>}
    {loading?<Empty>A carregar…</Empty>:!items.length?<Empty>Não existem pedidos neste estado.</Empty>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,340px),1fr))',gap:12}}>{items.map(item=><div key={item.id} style={card}>
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{flex:1,minWidth:220}}><div style={{color:C.text,fontWeight:600}}>{item.email}</div><div style={{fontSize:11,color:C.muted,marginTop:4}}>{new Date(item.createdAt).toLocaleString('pt-PT')} · {item.source}</div>{item.inviteCode&&<div style={{fontSize:11,color:C.text2,marginTop:3}}>Convite: {item.inviteCode}{item.inviteUsedAt?' · utilizado':''}</div>}</div><span style={{fontSize:11,color:item.status==='INVITED'?C.success:item.status==='PENDING'?C.warning:C.muted,background:C.elevated,border:`1px solid ${C.border}`,borderRadius:999,padding:'4px 10px'}}>{item.status}</span><div style={{display:'flex',gap:7}}>{item.status!=='INVITED'&&<button disabled={busy===item.id} onClick={()=>invite(item)} style={primaryButton}>{busy===item.id?'…':'Aprovar e enviar convite'}</button>}{item.status==='PENDING'&&<button disabled={busy===item.id} onClick={()=>reject(item)} style={secondaryButton}>Arquivar</button>}</div></div>
    </div>)}</div>}
  </div>
}

export default function AffiliationsAdminPage(){
  const {user}=useAuth(); const [searchParams,setSearchParams]=useSearchParams()
  const tabs=useMemo(()=>[['overview','Visão geral'],['affiliates','Afiliados'],['conversions','Convites e conversões'],['beta-access','Pedidos de acesso']],[])
  const requestedTab=searchParams.get('tab')
  const subtab=tabs.some(([key])=>key===requestedTab)?requestedTab:'overview'
  const selectSubtab=key=>setSearchParams(key==='overview'?{}:{tab:key})
  return <div style={{minHeight:'100vh',background:C.bg,color:C.text}}>
    <header style={{height:48,borderBottom:`1px solid ${C.border}`,background:C.surface,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><Logo size={30}/><b>Between Us</b></div><div style={{fontSize:12,color:C.text2}}>{user?.email}</div></header>
    <nav style={{display:'flex',gap:22,padding:'12px 20px',borderBottom:`1px solid ${C.border}`,overflowX:'auto',whiteSpace:'nowrap'}}>{NAV.map(([key,text])=><Link key={key} to={key==='affiliations'?'/admin/affiliations':`/admin/${key}`} style={{color:key==='affiliations'?C.primary:C.text,textDecoration:'none',fontSize:13,padding:key==='affiliations'?'7px 10px':'7px 0',border:key==='affiliations'?`1px solid ${C.primary}`:'none',borderRadius:8}}>{text}</Link>)}</nav>
    <main style={{width:'100%',padding:'18px clamp(16px, 2vw, 32px)',boxSizing:'border-box'}}><div style={{display:'flex',gap:6,marginBottom:18,flexWrap:'wrap'}}>{tabs.map(([key,text])=><button key={key} onClick={()=>selectSubtab(key)} style={{background:subtab===key?C.primaryDim:C.surface,border:`1px solid ${subtab===key?C.primary:C.border}`,borderRadius:9,padding:'8px 13px',color:subtab===key?C.primary:C.text2,cursor:'pointer'}}>{text}</button>)}</div>{subtab==='overview'&&<Overview/>}{subtab==='affiliates'&&<AffiliateRuleManager/>}{subtab==='conversions'&&<Conversions/>}{subtab==='beta-access'&&<BetaApplications/>}</main>
  </div>
}

const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16}
const input={width:'100%',boxSizing:'border-box',background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:'11px 13px',color:C.text,fontSize:14,marginBottom:12}
const label={display:'block',fontSize:11,color:C.muted,marginBottom:5}
const heading={margin:'0 0 5px',fontSize:16,color:C.text}
const copy={margin:'0 0 14px',fontSize:12,color:C.muted}
const primaryButton={background:C.primary,border:'none',borderRadius:9,padding:'8px 12px',color:'#0A141A',fontWeight:700,cursor:'pointer'}
const secondaryButton={background:'none',border:`1px solid ${C.border}`,borderRadius:9,padding:'8px 12px',color:C.text2,cursor:'pointer'}
function Notice({children,danger=false}){return <div style={{background:danger?C.dangerDim:C.successDim,border:`1px solid ${danger?C.danger:C.success}`,borderRadius:10,padding:'10px 12px',color:danger?C.danger:C.success,fontSize:12,marginBottom:12}}>{children}</div>}
function Empty({children}){return <div style={{...card,color:C.muted,textAlign:'center',padding:28}}>{children}</div>}
