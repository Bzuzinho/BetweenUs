// 10.13 — Circles: local-community framing, short description, join
// request. Admin-curated only (10.11) — this screen never offers a
// "create Circle" action, only browse/join/leave.
import { useState, useEffect } from 'react'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
}

const MEMBERSHIP_LABEL = { REQUESTED: 'Pedido enviado', APPROVED: 'Membro', DECLINED: null, LEFT: null, REMOVED: null }

export default function CirclesScreen() {
  const [circles, setCircles] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/circles').then(r => r.data.circles || []).catch(() => []),
      api.get('/circles/mine').then(r => r.data.memberships || []).catch(() => []),
    ]).then(([c, m]) => { setCircles(c); setMine(m) }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const myStatusFor = (circleId) => mine.find(m => m.circleId === circleId)?.status || null

  const join = async (slug) => {
    setMsg('')
    try {
      await api.post(`/circles/${slug}/join`)
      setMsg('Pedido enviado — aguarda aprovação de um moderador local.')
      load()
    } catch (e) {
      setMsg(e.response?.data?.error || 'Não foi possível pedir para entrar.')
    }
  }

  const leave = async (slug) => {
    setMsg('')
    try {
      await api.post(`/circles/${slug}/leave`)
      setMsg('Saíste do Circle.')
      load()
    } catch (e) {
      setMsg(e.response?.data?.error || 'Não foi possível sair.')
    }
  }

  const circle = circles.find(c => c.id === open)

  if (circle) {
    const status = myStatusFor(circle.id)
    return (
      <div style={{ paddingBottom:32 }}>
        <button onClick={() => setOpen(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:20 }}>←</button>

        {circle.city && (
          <div style={{ fontSize:11, color:C.primary, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
            Comunidade local · {circle.city}
          </div>
        )}
        <h1 style={{ fontSize:22, fontWeight:500, color:C.text, marginBottom:16, lineHeight:1.4 }}>{circle.name}</h1>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
          <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:'0 0 16px', whiteSpace:'pre-wrap' }}>
            {circle.description || 'Uma comunidade local dentro do Between Us.'}
          </p>
          <div style={{ fontSize:12, color:C.muted }}>{circle.memberCount ?? 0} membros</div>

          {msg && <div style={{ marginTop:14, fontSize:13, color:C.primary }}>{msg}</div>}

          {status === 'APPROVED' ? (
            <button onClick={() => leave(circle.slug)} style={{ marginTop:16, width:'100%', background:'none', border:`1px solid ${C.border}`, borderRadius:12, padding:'13px', color:C.text2, fontWeight:500, fontSize:14, cursor:'pointer' }}>
              Sair do Circle
            </button>
          ) : status === 'REQUESTED' ? (
            <div style={{ marginTop:16, textAlign:'center', fontSize:13, color:C.muted }}>Pedido pendente de aprovação.</div>
          ) : (
            <button onClick={() => join(circle.slug)} style={{ marginTop:16, width:'100%', background:C.primary, border:'none', borderRadius:12, padding:'13px', color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer' }}>
              Pedir para entrar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>Comunidades locais e temáticas, com moderação própria. Curadas pela equipa Between Us.</p>
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>A carregar…</div>}
      {!loading && circles.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>◎</div>
          <div>Ainda sem Circles disponíveis.</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {circles.map(c => {
          const status = myStatusFor(c.id)
          const label = status ? MEMBERSHIP_LABEL[status] : null
          return (
            <div key={c.id} onClick={() => setOpen(c.id)} style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
              padding:16, cursor:'pointer',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  {c.city && <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{c.city}</div>}
                  <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:6 }}>{c.name}</div>
                  {c.description && <div style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{c.description}</div>}
                  {label && <span style={{ display:'inline-block', marginTop:8, fontSize:10, background:C.successDim, border:'1px solid rgba(74,222,128,0.3)', color:C.success, borderRadius:20, padding:'2px 8px' }}>{label}</span>}
                </div>
                <span style={{ color:C.muted, fontSize:18, flexShrink:0 }}>›</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
