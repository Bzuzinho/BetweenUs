import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const ROOM_TYPES = [
  { value:'TRIO',              label:'Trio',            desc:'3 pessoas', icon:'◎' },
  { value:'COUPLE_PLUS_ONE',   label:'Casal + 1',       desc:'Casal com terceira pessoa', icon:'◉' },
  { value:'COUPLE_PLUS_COUPLE',label:'Casal + Casal',   desc:'Dois casais', icon:'◎◎' },
  { value:'SWING_GROUP',       label:'Swing',           desc:'Até 6 pessoas', icon:'⟳' },
  { value:'POLYAMORY',         label:'Poliamor',        desc:'Até 8 pessoas', icon:'∞' },
  { value:'CUSTOM',            label:'Personalizada',   desc:'Até 12 pessoas', icon:'◌' },
]

function Avatar({ profile, size = 32 }) {
  const photo = profile?.photos?.[0]
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:C.elevated, border:`1px solid ${C.border}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.4, color:C.muted, overflow:'hidden', flexShrink:0,
    }}>
      {photo
        ? <img src={photo.blurredPath || photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : (profile?.displayName?.[0] || '?').toUpperCase()
      }
    </div>
  )
}

function RoomChat({ room, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(() => {
    api.get(`/rooms/${room.id}/messages`).then(r => {
      setMessages(r.data.messages || [])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    }).catch(() => {})
  }, [room.id])

  useEffect(() => { load() }, [load])

  const send = async () => {
    if (!body.trim() || sending) return
    setSending(true)
    try {
      const r = await api.post(`/rooms/${room.id}/messages`, { body })
      setMessages(prev => [...prev, r.data])
      setBody('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
    } catch {} finally { setSending(false) }
  }

  const leave = async () => {
    if (!confirm('Sair da sala?')) return
    await api.delete(`/rooms/${room.id}/leave`).catch(() => {})
    onBack()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg }}>
      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'10px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer' }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{room.title}</div>
            <div style={{ fontSize:11, color:C.muted }}>
              {room.members?.length || 0} participante{room.members?.length !== 1 ? 's' : ''}
            </div>
          </div>
          {/* Member avatars */}
          <div style={{ display:'flex' }}>
            {(room.members || []).slice(0,4).map((m, i) => (
              <div key={m.userId} style={{ marginLeft: i > 0 ? -8 : 0, zIndex:4-i }}>
                <Avatar profile={m.user?.profile} size={28}/>
              </div>
            ))}
          </div>
          <button onClick={leave} style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:8, padding:'6px 10px', color:C.danger, fontSize:12, cursor:'pointer' }}>
            Sair
          </button>
        </div>

        {/* Rules banner */}
        <div style={{ marginTop:8, background:C.primaryDim, borderRadius:8, padding:'6px 10px', fontSize:11, color:C.primary }}>
          📌 Sala privada. Consentimento obrigatório. Respeito sempre.
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', color:C.muted, fontSize:14, margin:'auto' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>◎</div>
            <div>Ainda sem mensagens nesta sala.</div>
            <div style={{ fontSize:12, marginTop:4 }}>Começa a conversa.</div>
          </div>
        )}
        {messages.map(msg => {
          const mine = msg.senderUserId === user?.id
          return (
            <div key={msg.id} style={{ display:'flex', gap:8, flexDirection: mine ? 'row-reverse' : 'row', alignItems:'flex-end' }}>
              {!mine && <Avatar profile={msg.sender?.profile} size={24}/>}
              <div style={{ maxWidth:'72%' }}>
                {!mine && (
                  <div style={{ fontSize:10, color:C.muted, marginBottom:3, marginLeft:4 }}>
                    {msg.sender?.profile?.displayName}
                  </div>
                )}
                <div style={{
                  background: mine ? C.primaryDim : C.surface,
                  border:`1px solid ${mine ? 'rgba(184,167,255,0.3)' : C.border}`,
                  borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding:'10px 14px', fontSize:14,
                  color: mine ? C.text : C.text2,
                }}>
                  {msg.body}
                </div>
                <div style={{ fontSize:10, color:C.muted, marginTop:3, textAlign: mine ? 'right' : 'left', marginLeft:4, marginRight:4 }}>
                  {new Date(msg.createdAt).toLocaleTimeString('pt', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'10px 16px', display:'flex', gap:10, alignItems:'center' }}>
        <input
          value={body} onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Mensagem…"
          style={{ flex:1, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:50, padding:'11px 16px', color:C.text, fontSize:14, outline:'none' }}
        />
        <button onClick={send} disabled={!body.trim() || sending} style={{
          width:42, height:42, borderRadius:'50%', border:'none',
          background: body.trim() ? C.primary : C.elevated,
          color: body.trim() ? '#0A141A' : C.muted,
          fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          ↑
        </button>
      </div>
    </div>
  )
}

function CreateRoomModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title:'', roomType:'COUPLE_PLUS_ONE', description:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!form.title.trim()) return setError('Nome da sala obrigatório.')
    setSaving(true); setError('')
    try {
      const r = await api.post('/rooms', form)
      onCreated(r.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar sala.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'24px 20px calc(32px + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 18px' }}/>
        <h3 style={{ color:C.text, fontSize:18, fontWeight:500, marginBottom:16, marginTop:0 }}>Nova sala privada</h3>

        {error && <div style={{ color:C.danger, fontSize:13, marginBottom:12 }}>{error}</div>}

        <input value={form.title} onChange={e => setForm(p => ({...p,title:e.target.value}))}
          placeholder="Nome da sala"
          style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:C.text, fontSize:15, marginBottom:12 }}/>

        <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Tipo de sala</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {ROOM_TYPES.map(t => (
            <div key={t.value} onClick={() => setForm(p => ({...p,roomType:t.value}))} style={{
              background: form.roomType===t.value ? C.primaryDim : C.elevated,
              border:`1.5px solid ${form.roomType===t.value ? C.primary : C.border}`,
              borderRadius:12, padding:'10px 12px', cursor:'pointer',
            }}>
              <div style={{ fontSize:16, marginBottom:3 }}>{t.icon}</div>
              <div style={{ fontSize:13, fontWeight:500, color: form.roomType===t.value ? C.primary : C.text }}>{t.label}</div>
              <div style={{ fontSize:11, color:C.muted }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:13, color:C.muted, fontSize:14, cursor:'pointer', minHeight:48 }}>Cancelar</button>
          <button onClick={create} disabled={saving} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:13, color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer', opacity:saving?0.6:1, minHeight:48 }}>
            {saving ? 'A criar…' : 'Criar sala'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RoomsScreen() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeRoom, setActiveRoom] = useState(null)

  const load = useCallback(() => {
    api.get('/rooms').then(r => setRooms(r.data.rooms || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (activeRoom) return <RoomChat room={activeRoom} onBack={() => { setActiveRoom(null); load() }}/>

  return (
    <div style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={r => { setRooms(prev => [r, ...prev]); setActiveRoom(r) }}/>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:0 }}>Salas privadas</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Grupos privados por convite</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background:C.primary, border:'none', borderRadius:12, padding:'10px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>
          + Nova sala
        </button>
      </div>

      {/* Room type legend */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {ROOM_TYPES.slice(0,4).map(t => (
          <div key={t.value} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', fontSize:11, color:C.muted }}>
            {t.icon} {t.label}
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>A carregar…</div>}

      {!loading && rooms.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16, opacity:0.4 }}>◎</div>
          <div style={{ fontSize:18, fontWeight:500, color:C.text, marginBottom:8 }}>Sem salas activas</div>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>
            Cria uma sala privada para conversas em grupo — trio, casal + pessoa, swing, poliamor ou personalizada.
          </p>
          <button onClick={() => setShowCreate(true)} style={{ background:C.primary, border:'none', borderRadius:50, padding:'12px 28px', color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer' }}>
            Criar primeira sala
          </button>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {rooms.map(room => (
          <div key={room.id} onClick={() => setActiveRoom(room)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'14px 16px', cursor:'pointer', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:C.primary, flexShrink:0 }}>
              {ROOM_TYPES.find(t => t.value === room.roomType)?.icon || '◌'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {room.title}
              </div>
              <div style={{ fontSize:12, color:C.muted }}>
                {room._count?.members || room.members?.length || 0} participante(s)
              </div>
            </div>
            {/* Member stack */}
            <div style={{ display:'flex' }}>
              {(room.members || []).slice(0,3).map((m, i) => (
                <div key={m.userId} style={{ marginLeft: i > 0 ? -8 : 0, zIndex:3-i }}>
                  <Avatar profile={m.user?.profile} size={26}/>
                </div>
              ))}
            </div>
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
