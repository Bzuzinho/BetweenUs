import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
  warning:'#FBBF24',
}

// 7.2 — composition-based taxonomy (replaces the old vibe-label set).
const ROOM_TYPES = [
  { value:'INDIVIDUAL_PAIR', label:'Duas pessoas',      desc:'2 pessoas',              icon:'◉' },
  { value:'COUPLE_SINGLE',   label:'Casal + pessoa',     desc:'Casal com uma pessoa',   icon:'◎' },
  { value:'COUPLE_COUPLE',   label:'Casal + Casal',      desc:'Dois casais',            icon:'◎◎' },
  { value:'POLY_GROUP',      label:'Grupo',              desc:'Até 8 pessoas',          icon:'∞' },
  { value:'CUSTOM',          label:'Personalizada',      desc:'Até 12 pessoas',         icon:'◌' },
]
const TTL_OPTIONS = [
  { value:'NONE', label:'Sem expiração' },
  { value:'ONE_HOUR', label:'1 hora' },
  { value:'ONE_DAY', label:'24 horas' },
  { value:'SEVEN_DAYS', label:'7 dias' },
]
const STATUS_LABEL = {
  DRAFT:'Rascunho', WAITING_CONSENT:'A aguardar consentimento', ACTIVE:'Ativa',
  PAUSED:'Em pausa', CLOSED:'Fechada', SAFETY_LOCKED:'Bloqueada por segurança',
}
const STATUS_COLOR = {
  DRAFT:C.muted, WAITING_CONSENT:C.warning, ACTIVE:C.success,
  PAUSED:C.warning, CLOSED:C.muted, SAFETY_LOCKED:C.danger,
}
// 7.10 — maps directly onto ConsentCheckPhase (server enum), reused as-is
// rather than inventing a room-specific concept.
const CONSENT_PHASES = [
  { value:'CHAT', label:'Continuar a conversar' },
  { value:'PHOTO_REQUEST', label:'Pedido de fotos' },
  { value:'FACE_REVEAL', label:'Revelar rosto' },
  { value:'VIDEO_CALL', label:'Chamada de vídeo' },
  { value:'MEETING_PROPOSAL', label:'Propor encontro' },
]
const REPORT_REASONS = [
  { value:'HARASSMENT', label:'Assédio' },
  { value:'OFFENSIVE_CONTENT', label:'Conteúdo ofensivo' },
  { value:'NON_CONSENSUAL_IMAGE', label:'Partilha não consentida' },
  { value:'THREAT', label:'Ameaça' },
  { value:'FAKE_PROFILE', label:'Perfil falso' },
  { value:'OTHER', label:'Outro' },
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

function Sheet({ onClose, title, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:250, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'20px 20px calc(28px + env(safe-area-inset-bottom))', maxHeight:'82vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 16px' }}/>
        <h3 style={{ color:C.text, fontSize:17, fontWeight:500, marginBottom:14, marginTop:0 }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

// 7.10 — Room Rules: pinned section content, expanded into a modal here.
// "Rules are visible to everyone. Consent can be updated anytime." is not
// just copy — the Revoke button below is a real, always-available action.
function RulesModal({ roomId, onClose, onChanged }) {
  const [consent, setConsent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.get(`/rooms/${roomId}/rules`).then(r => setConsent(r.data.consent)).catch(() => {}).finally(() => setLoading(false))
  }, [roomId])
  useEffect(() => { load() }, [load])

  const accept = async () => {
    setBusy(true)
    try { await api.post(`/rooms/${roomId}/rules/accept`); await load(); onChanged?.() } finally { setBusy(false) }
  }
  const revoke = async () => {
    setBusy(true)
    try { await api.post(`/rooms/${roomId}/rules/revoke`); await load(); onChanged?.() } finally { setBusy(false) }
  }

  return (
    <Sheet onClose={onClose} title="📌 Regras da sala">
      <p style={{ color:C.muted, fontSize:12, lineHeight:1.6, marginBottom:16 }}>
        As regras são visíveis para todos. O consentimento pode ser atualizado a qualquer momento.
      </p>
      {loading && <div style={{ color:C.muted, fontSize:13 }}>A carregar...</div>}
      {!loading && !consent && <div style={{ color:C.muted, fontSize:13 }}>Sem regras definidas.</div>}
      {consent && (
        <>
          <div style={{ fontSize:12, color:C.text2, marginBottom:10 }}>
            Versão {consent.version} · {consent.status === 'ACTIVE' ? '✅ Ativa' : '⏳ A aguardar aceitação'}
            {' · '}{consent.approvedCount}/{consent.requiredCount} aceitaram
          </div>
          {(consent.rules || []).map(r => (
            <div key={r.id} style={{ padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>{r.ruleType}</div>
              <div style={{ fontSize:13, color:C.text }}>{r.label}</div>
            </div>
          ))}
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            {consent.status !== 'ACTIVE' ? (
              <button onClick={accept} disabled={busy} style={{ flex:1, background:C.primary, border:'none', borderRadius:50, padding:12, color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                Aceitar regras
              </button>
            ) : (
              <button onClick={revoke} disabled={busy} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:12, color:C.muted, fontSize:13, cursor:'pointer' }}>
                Revogar a minha aceitação
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  )
}

// 7.11 — Safe Exit. Each action is its own independent call, never
// bundled — selecting "Reportar" does not also block, selecting "Bloquear"
// does not also report. The user chooses exactly what they want.
function SafeExitModal({ room, onClose, onLeft }) {
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [confirmReport, setConfirmReport] = useState(false)
  const [reportReason, setReportReason] = useState('HARASSMENT')
  const [targetUserId, setTargetUserId] = useState(room.members?.find(m => m.userId)?.userId || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const otherMembers = (room.members || [])

  const leaveRoom = async () => {
    setBusy(true)
    try { await api.delete(`/rooms/${room.id}/leave`); onLeft() } finally { setBusy(false) }
  }
  const deleteLocalHistory = () => {
    // Client-side only — no server concept of "local history" to delete.
    try { localStorage.removeItem(`room-cache-${room.id}`) } catch {}
    setMsg('Histórico local apagado neste dispositivo.')
  }
  const blockUser = async () => {
    if (!targetUserId) return
    setBusy(true)
    try {
      const member = otherMembers.find(m => m.userId === targetUserId)
      const profileId = member?.user?.profile?.id
      if (profileId) await api.post(`/privacy/block/${profileId}`)
      setMsg('Utilizador bloqueado.')
      setConfirmBlock(false)
    } finally { setBusy(false) }
  }
  const reportUser = async () => {
    if (!targetUserId) return
    setBusy(true)
    try {
      await api.post('/reports', { reportedUserId: targetUserId, reason: reportReason, details: `Denúncia a partir da Private Room ${room.id}` })
      setMsg('Denúncia enviada.')
      setConfirmReport(false)
    } finally { setBusy(false) }
  }
  const hideProfile = async () => {
    setBusy(true)
    try { await api.put('/privacy', { visibleInDiscovery: false }); setMsg('O teu perfil ficou oculto no discovery.') } finally { setBusy(false) }
  }

  return (
    <Sheet onClose={onClose} title="🚪 Saída segura">
      {msg && <div style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:10, padding:'10px 14px', marginBottom:14, color:C.success, fontSize:13 }}>{msg}</div>}

      <button onClick={leaveRoom} disabled={busy} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:8, textAlign:'left', color:C.text, fontSize:14, cursor:'pointer' }}>
        🚪 Sair da sala
      </button>

      <button onClick={deleteLocalHistory} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:8, textAlign:'left', color:C.text, fontSize:14, cursor:'pointer' }}>
        🗑 Apagar histórico local
      </button>

      <button onClick={hideProfile} disabled={busy} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:8, textAlign:'left', color:C.text, fontSize:14, cursor:'pointer' }}>
        🙈 Ocultar o meu perfil
      </button>

      <button onClick={() => window.open('/safety', '_self')} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:8, textAlign:'left', color:C.text, fontSize:14, cursor:'pointer' }}>
        💚 Ajuda de segurança / Check-in
      </button>

      {otherMembers.length > 0 && (
        <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
          style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', color:C.text, fontSize:13, marginBottom:8 }}>
          {otherMembers.map(m => (
            <option key={m.userId} value={m.userId}>{m.user?.profile?.displayName || m.userId}</option>
          ))}
        </select>
      )}

      {!confirmBlock ? (
        <button onClick={() => setConfirmBlock(true)} style={{ width:'100%', background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:14, padding:'14px 16px', marginBottom:8, textAlign:'left', color:C.danger, fontSize:14, cursor:'pointer' }}>
          🚫 Bloquear utilizador/perfil
        </button>
      ) : (
        <div style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:14, padding:14, marginBottom:8 }}>
          <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>Confirmas o bloqueio? Não podem voltar a interagir.</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirmBlock(false)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.muted, fontSize:12, cursor:'pointer' }}>Cancelar</button>
            <button onClick={blockUser} disabled={busy} style={{ flex:1, background:C.danger, border:'none', borderRadius:10, padding:10, color:'#1A0A0A', fontWeight:600, fontSize:12, cursor:'pointer' }}>Confirmar bloqueio</button>
          </div>
        </div>
      )}

      {!confirmReport ? (
        <button onClick={() => setConfirmReport(true)} style={{ width:'100%', background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:14, padding:'14px 16px', textAlign:'left', color:C.danger, fontSize:14, cursor:'pointer' }}>
          ⚠️ Denunciar comportamento
        </button>
      ) : (
        <div style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:14, padding:14 }}>
          <select value={reportReason} onChange={e => setReportReason(e.target.value)}
            style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 12px', color:C.text, fontSize:13, marginBottom:10 }}>
            {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirmReport(false)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.muted, fontSize:12, cursor:'pointer' }}>Cancelar</button>
            <button onClick={reportUser} disabled={busy} style={{ flex:1, background:C.danger, border:'none', borderRadius:10, padding:10, color:'#1A0A0A', fontWeight:600, fontSize:12, cursor:'pointer' }}>Enviar denúncia</button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function ConsentCheckModal({ room, onClose }) {
  const [phase, setPhase] = useState('CHAT')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const send = async () => {
    if (!room.matchId) return
    setBusy(true)
    try {
      await api.post('/consent/check', { matchId: room.matchId, phase })
      setDone(true)
    } finally { setBusy(false) }
  }

  return (
    <Sheet onClose={onClose} title="✅ Consent Check">
      {!room.matchId && <div style={{ color:C.muted, fontSize:13 }}>Esta sala não está ligada a um match — Consent Check não está disponível.</div>}
      {room.matchId && !done && (
        <>
          <p style={{ color:C.muted, fontSize:12, marginBottom:14 }}>Pede confirmação explícita a todos antes de avançar.</p>
          <select value={phase} onChange={e => setPhase(e.target.value)}
            style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', color:C.text, fontSize:13, marginBottom:14 }}>
            {CONSENT_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={send} disabled={busy} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:12, color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            Pedir confirmação
          </button>
        </>
      )}
      {done && <div style={{ color:C.success, fontSize:13 }}>✓ Pedido enviado.</div>}
    </Sheet>
  )
}

function MessageBubble({ msg, mine }) {
  if (msg.messageType === 'SYSTEM' || msg.messageType === 'RULE_UPDATE' || msg.messageType === 'SAFETY') {
    const icon = msg.messageType === 'SAFETY' ? '💚' : msg.messageType === 'RULE_UPDATE' ? '📌' : 'ℹ️'
    return (
      <div style={{ textAlign:'center' }}>
        <span style={{ background:'rgba(201,149,107,0.1)', border:'1px solid rgba(201,149,107,0.2)', borderRadius:20, padding:'4px 12px', fontSize:11, color:C.primary }}>
          {icon} {msg.body || 'Atualização da sala'}
        </span>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', gap:8, flexDirection: mine ? 'row-reverse' : 'row', alignItems:'flex-end' }}>
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
          {msg.messageType === 'IMAGE' ? '📷 Foto (pré-visualização não disponível)' : msg.body}
        </div>
        <div style={{ fontSize:10, color:C.muted, marginTop:3, textAlign: mine ? 'right' : 'left', marginLeft:4, marginRight:4 }}>
          {new Date(msg.createdAt).toLocaleTimeString('pt', { hour:'2-digit', minute:'2-digit' })}
          {msg.expiresAt && ' · ⏱ temporária'}
        </div>
      </div>
    </div>
  )
}

function RoomChat({ room: initialRoom, onBack }) {
  const { user } = useAuth()
  const [room, setRoom] = useState(initialRoom)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showSafeExit, setShowSafeExit] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [consentSummary, setConsentSummary] = useState(null)
  const [typingUsers, setTypingUsers] = useState([])
  const bottomRef = useRef(null)

  const load = useCallback(() => {
    api.get(`/rooms/${room.id}`).then(r => setRoom(prev => ({ ...prev, ...r.data }))).catch(() => {})
    api.get(`/rooms/${room.id}/rules`).then(r => setConsentSummary(r.data.consent)).catch(() => {})
    api.get(`/rooms/${room.id}/messages`).then(r => {
      setMessages(r.data.messages || [])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    }).catch(() => {})
  }, [room.id])

  useEffect(() => { load() }, [load])

  // 7.8 — real-time updates via the authenticated socket. Sending still
  // goes through the HTTP route (simpler, one write path); the socket is
  // used purely to receive what other members do.
  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('room:join', room.id)

    const onCreated = (m) => {
      if (m.roomId !== room.id) return
      setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
    }
    const onDeleted = ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId))
    const onStatus = ({ roomId, status }) => { if (roomId === room.id) setRoom(prev => ({ ...prev, status })) }
    const onClosed = ({ roomId }) => { if (roomId === room.id) { alert('Esta sala foi fechada.'); onBack() } }
    const onConsent = ({ roomId }) => { if (roomId === room.id) api.get(`/rooms/${roomId}/rules`).then(r => setConsentSummary(r.data.consent)).catch(() => {}) }
    const onTypingStart = ({ roomId, userId }) => { if (roomId === room.id && userId !== user?.id) setTypingUsers(prev => [...new Set([...prev, userId])]) }
    const onTypingStop = ({ roomId, userId }) => { if (roomId === room.id) setTypingUsers(prev => prev.filter(u => u !== userId)) }

    socket.on('message:created', onCreated)
    socket.on('message:delete', onDeleted)
    socket.on('room:status', onStatus)
    socket.on('room:closed', onClosed)
    socket.on('consent:updated', onConsent)
    socket.on('rules:updated', onConsent)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)

    return () => {
      socket.emit('room:leave', room.id)
      socket.off('message:created', onCreated)
      socket.off('message:delete', onDeleted)
      socket.off('room:status', onStatus)
      socket.off('room:closed', onClosed)
      socket.off('consent:updated', onConsent)
      socket.off('rules:updated', onConsent)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
    }
  }, [room.id, user?.id, onBack])

  const canSend = room.status === 'ACTIVE'

  const send = async () => {
    if (!body.trim() || sending || !canSend) return
    setSending(true)
    const text = body.trim()
    setBody('')
    try {
      await api.post(`/rooms/${room.id}/messages`, { body: text })
      // socket message:created will append it — but append optimistically
      // too in case the socket round-trip is slow, guarded against
      // duplicates by id in onCreated above.
    } catch {} finally { setSending(false) }
  }

  const notifyTyping = (starting) => {
    const socket = getSocket()
    socket.emit(starting ? 'typing:start' : 'typing:stop', room.id)
  }

  const privacyIndicator = room.status === 'ACTIVE' ? '🔒 Privada e ativa'
    : room.status === 'WAITING_CONSENT' ? '⏳ A aguardar consentimento de todos'
    : room.status === 'PAUSED' ? '⏸ Em pausa'
    : room.status === 'SAFETY_LOCKED' ? '🔐 Bloqueada por segurança'
    : '🔒 Privada'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg }}>
      {showRules && <RulesModal roomId={room.id} onClose={() => setShowRules(false)} onChanged={load} />}
      {showSafeExit && <SafeExitModal room={room} onClose={() => setShowSafeExit(false)} onLeft={onBack} />}
      {showConsent && <ConsentCheckModal room={room} onClose={() => setShowConsent(false)} />}

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'10px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer' }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:500, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{room.title || 'Private Room'}</div>
            <div style={{ fontSize:11, color:C.muted }}>
              {room.members?.length || 0} participante{room.members?.length !== 1 ? 's' : ''}
              {' · '}
              <span style={{ color: STATUS_COLOR[room.status] }}>{STATUS_LABEL[room.status] || room.status}</span>
            </div>
          </div>
          <div style={{ display:'flex' }}>
            {(room.members || []).slice(0,4).map((m, i) => (
              <div key={m.userId} style={{ marginLeft: i > 0 ? -8 : 0, zIndex:4-i }}>
                <Avatar profile={m.user?.profile} size={28}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop:8, background:C.primaryDim, borderRadius:8, padding:'6px 10px', fontSize:11, color:C.primary }}>
          {privacyIndicator}
        </div>

        {/* Pinned rules/consent */}
        {consentSummary && (
          <button onClick={() => setShowRules(true)} style={{ width:'100%', marginTop:6, background:'transparent', border:'none', borderTop:`1px solid ${C.border}`, paddingTop:8, cursor:'pointer', textAlign:'left', color:C.text2, fontSize:11 }}>
            📌 {consentSummary.approvedCount}/{consentSummary.requiredCount} aceitaram a v{consentSummary.version} das regras — toca para ver
          </button>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
          <button onClick={() => setShowConsent(true)} style={actionBtn}>✅ Consent Check</button>
          <button onClick={() => setShowConsent(true)} style={actionBtn}>👁 Soft Reveal</button>
          <button onClick={() => setShowRules(true)} style={actionBtn}>📌 Regras</button>
          <button onClick={() => setShowSafeExit(true)} style={{ ...actionBtn, color:C.danger, borderColor:'rgba(248,113,113,0.3)' }}>🚪 Safe Exit</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', color:C.muted, fontSize:14, margin:'auto' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>◎</div>
            <div>Ainda sem mensagens nesta sala.</div>
            {!canSend && <div style={{ fontSize:12, marginTop:8, color:C.warning }}>Aceita as regras para poderes enviar mensagens.</div>}
          </div>
        )}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} mine={msg.senderUserId === user?.id} />)}
        {typingUsers.length > 0 && <div style={{ fontSize:11, color:C.muted, fontStyle:'italic' }}>a escrever...</div>}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'10px 16px', display:'flex', gap:10, alignItems:'center' }}>
        <input
          value={body}
          onChange={e => { setBody(e.target.value); notifyTyping(true) }}
          onBlur={() => notifyTyping(false)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={canSend ? 'Mensagem…' : 'A sala não aceita mensagens neste estado'}
          disabled={!canSend}
          style={{ flex:1, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:50, padding:'11px 16px', color:C.text, fontSize:14, outline:'none', opacity: canSend ? 1 : 0.5 }}
        />
        <button onClick={send} disabled={!body.trim() || sending || !canSend} style={{
          width:42, height:42, borderRadius:'50%', border:'none',
          background: body.trim() && canSend ? C.primary : C.elevated,
          color: body.trim() && canSend ? '#0A141A' : C.muted,
          fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          ↑
        </button>
      </div>
    </div>
  )
}

const actionBtn = {
  background:C.input, border:`1px solid ${C.border}`, borderRadius:20,
  padding:'6px 12px', fontSize:11, color:C.text2, cursor:'pointer',
}

function CreateRoomModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title:'', roomType:'COUPLE_SINGLE', description:'', defaultMessageTtl:'NONE' })
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
    <Sheet onClose={onClose} title="Nova sala privada">
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

      <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Mensagens temporárias</div>
      <select value={form.defaultMessageTtl} onChange={e => setForm(p => ({...p, defaultMessageTtl:e.target.value}))}
        style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'11px 14px', color:C.text, fontSize:14, marginBottom:16 }}>
        {TTL_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <div style={{ fontSize:11, color:C.muted, marginTop:-10, marginBottom:16 }}>
        A expiração apaga o conteúdo da mensagem depois do prazo — não é proteção contra capturas de ecrã.
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:13, color:C.muted, fontSize:14, cursor:'pointer', minHeight:48 }}>Cancelar</button>
        <button onClick={create} disabled={saving} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:13, color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer', opacity:saving?0.6:1, minHeight:48 }}>
          {saving ? 'A criar…' : 'Criar sala'}
        </button>
      </div>
    </Sheet>
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
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Espaço próprio, com regras e consentimento partilhados</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background:C.primary, border:'none', borderRadius:12, padding:'10px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>
          + Nova sala
        </button>
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>A carregar…</div>}

      {!loading && rooms.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16, opacity:0.4 }}>◎</div>
          <div style={{ fontSize:18, fontWeight:500, color:C.text, marginBottom:8 }}>Sem salas activas</div>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>
            Cria uma sala privada para conversas com regras e consentimento partilhados.
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
              <div style={{ fontSize:12, color: STATUS_COLOR[room.status] || C.muted }}>
                {STATUS_LABEL[room.status] || room.status} · {room.members?.length || 0} participante(s)
              </div>
            </div>
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
