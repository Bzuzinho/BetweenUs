// 10.13 — Events: discrete cards (city/date/verified-event badge/request
// attendance). Deliberately NOT a "swinger party directory" grid — same
// card language as GuideScreen/RoomsScreen, no explicit imagery, text-led.
import { useState, useEffect } from 'react'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171',
}

const fmtDate = (d) => new Date(d).toLocaleDateString('pt-PT', { day:'2-digit', month:'short', year:'numeric' })

const ATTENDANCE_LABEL = {
  REQUESTED: 'Pedido enviado', APPROVED: 'Confirmado', DECLINED: 'Recusado', CANCELLED: null, ATTENDED: 'Participaste',
}

export default function EventsScreen() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/events').then(r => setEvents(r.data.events || [])).catch(() => setEvents([])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const attend = async (eventId) => {
    setMsg('')
    try {
      const r = await api.post(`/events/${eventId}/attend`)
      setMsg(r.data.status === 'APPROVED' ? 'Inscrição confirmada.' : 'Pedido enviado — aguarda aprovação do organizador.')
      load()
    } catch (e) {
      setMsg(e.response?.data?.error || 'Não foi possível pedir participação.')
    }
  }

  const event = events.find(e => e.id === open)

  if (event) return (
    <div style={{ paddingBottom:32 }}>
      <button onClick={() => setOpen(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:20 }}>←</button>

      <div style={{ fontSize:11, color:C.primary, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
        {event.city}, {event.country} · {fmtDate(event.startsAt)}
      </div>
      <h1 style={{ fontSize:22, fontWeight:500, color:C.text, marginBottom:12, lineHeight:1.4 }}>{event.title}</h1>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <span style={{ fontSize:11, background:C.successDim, border:'1px solid rgba(74,222,128,0.3)', color:C.success, borderRadius:20, padding:'4px 10px' }}>
          ✓ Evento verificado
        </span>
        {event.capacity && <span style={{ fontSize:11, background:C.elevated, border:`1px solid ${C.border}`, color:C.text2, borderRadius:20, padding:'4px 10px' }}>Capacidade: {event.capacity}</span>}
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
        <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:'0 0 16px', whiteSpace:'pre-wrap' }}>{event.description}</p>

        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, fontSize:13, color:C.muted }}>
          {event.venueRevealed
            ? <>Local: <span style={{ color:C.text2 }}>{event.venueDetail}</span></>
            : <>Local: <span style={{ color:C.text2 }}>revelado após confirmação de participação, por privacidade.</span></>}
        </div>

        {msg && <div style={{ marginTop:14, fontSize:13, color:C.primary }}>{msg}</div>}

        {!event.isOrganizer && event.myAttendanceStatus == null && (
          <button onClick={() => attend(event.id)} style={{ marginTop:16, width:'100%', background:C.primary, border:'none', borderRadius:12, padding:'13px', color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer' }}>
            Pedir participação
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>Encontros privados, moderados e com local revelado apenas a participantes aprovados.</p>
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>A carregar…</div>}
      {!loading && events.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>◇</div>
          <div>Sem eventos disponíveis de momento.</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {events.map(e => (
          <div key={e.id} onClick={() => setOpen(e.id)} style={{
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
            padding:16, cursor:'pointer',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{e.city}, {e.country} · {fmtDate(e.startsAt)}</div>
                <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:6 }}>{e.title}</div>
                <span style={{ fontSize:10, background:C.successDim, border:'1px solid rgba(74,222,128,0.3)', color:C.success, borderRadius:20, padding:'2px 8px' }}>✓ verificado</span>
              </div>
              <span style={{ color:C.muted, fontSize:18, flexShrink:0 }}>›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
