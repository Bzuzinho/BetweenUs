import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { RoomConsentCheckModal, RoomRulesModal, RoomSafeExitModal } from '../components/RoomSafetyModals'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2',
  muted:'#7E8FA3', success:'#4ADE80', danger:'#F87171', warning:'#FBBF24',
}
const ROOM_TYPES = [
  { value:'INDIVIDUAL_PAIR', icon:'◉' }, { value:'COUPLE_SINGLE', icon:'◎' },
  { value:'COUPLE_COUPLE', icon:'◎◎' }, { value:'POLY_GROUP', icon:'∞' }, { value:'CUSTOM', icon:'◌' },
]
const TTL_OPTIONS = ['NONE','ONE_HOUR','ONE_DAY','SEVEN_DAYS']
const STATUS_COLOR = { DRAFT:C.muted, WAITING_CONSENT:C.warning, ACTIVE:C.success, PAUSED:C.warning, CLOSED:C.muted, SAFETY_LOCKED:C.danger }
const INTENT_FIELDS = {
  connection_goal:['CHAT_ONLY','CASUAL','ONE_TIME','RECURRING','OPEN_TO_DISCOVER'],
  meeting_openness:['NOT_YET','MAYBE_LATER','OPEN_NOW'],
  emotional_openness:['NO_EMOTIONAL','OPEN_TO_EMOTIONAL','UNSURE'],
  recurrence:['ONE_TIME','OCCASIONAL','REGULAR','UNSURE'],
  confidentiality:['FULL_DISCRETION','KNOWN_CIRCLE_OK','OPEN'],
  communication_pace:['SLOW','STEADY','FREQUENT'],
}

function Avatar({ profile, size=32 }) {
  const photo = profile?.photos?.[0]
  return <div style={{ width:size, height:size, borderRadius:'50%', background:C.elevated, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.4, color:C.muted, overflow:'hidden', flexShrink:0 }}>
    {photo ? <img src={photo.blurredPath || photo.storagePath} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (profile?.displayName?.[0] || '?').toUpperCase()}
  </div>
}

function Sheet({ onClose, title, children }) {
  return <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:250, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'20px 20px calc(28px + env(safe-area-inset-bottom))', maxHeight:'82vh', overflowY:'auto' }} onClick={event => event.stopPropagation()}>
      <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 16px' }}/>
      <h3 style={{ color:C.text, fontSize:17, fontWeight:500, margin:'0 0 14px' }}>{title}</h3>
      {children}
    </div>
  </div>
}

function IntentAlignmentModal({ room, onClose }) {
  const { user } = useAuth()
  const { t, formatNumber } = useI18n()
  const [active, setActive] = useState(null)
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/rooms/${room.id}/intent-alignment`).then(response => {
      setActive(response.data.active)
      setPending(response.data.pending)
    }).catch(() => setError(t('rooms.genericError'))).finally(() => setLoading(false))
  }, [room.id, t])
  useEffect(() => { load() }, [load])

  const propose = async () => {
    const items = Object.keys(INTENT_FIELDS).filter(key => draft[key]).map(key => ({ key, value:draft[key] }))
    if (!items.length) return
    setBusy(true); setError('')
    try { await api.post(`/rooms/${room.id}/intent-alignment`, { items }); await load() }
    catch { setError(t('rooms.genericError')) }
    finally { setBusy(false) }
  }
  const respond = async action => {
    setBusy(true); setError('')
    try { await api.post(`/rooms/${room.id}/intent-alignment/${pending.id}/${action}`); await load() }
    catch { setError(t('rooms.genericError')) }
    finally { setBusy(false) }
  }

  const myApproval = (pending?.approvals || []).find(item => item.userId === user?.id)
  const alreadyResponded = myApproval && (myApproval.approvedAt || myApproval.declinedAt)
  const labelField = key => t(`rooms.intentFields.${key}`, key)
  const labelValue = value => t(`rooms.intentValues.${value}`, value)

  return <Sheet onClose={onClose} title={`🧭 ${t('rooms.intentionsTitle')}`}>
    <p style={{ color:C.muted, fontSize:12, marginBottom:14 }}>{t('rooms.intentionsHelp')}</p>
    {error && <div style={{ color:C.danger, fontSize:12, marginBottom:12 }}>{error}</div>}
    {loading && <div style={{ color:C.muted, fontSize:13 }}>{t('rooms.loading')}</div>}
    {!loading && pending && <div style={{ background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.25)', borderRadius:14, padding:14, marginBottom:14 }}>
      <div style={{ color:C.warning, fontSize:12, fontWeight:600, marginBottom:8 }}>{t('rooms.proposalWaiting')} (v{formatNumber(pending.version)})</div>
      {(pending.items || []).map(item => <div key={item.key} style={{ fontSize:12, color:C.text2, marginBottom:2 }}>{labelField(item.key)}: {labelValue(item.value)}</div>)}
      {!alreadyResponded && <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button onClick={() => respond('approve')} disabled={busy} style={{ flex:1, background:C.success, border:'none', borderRadius:10, padding:9, color:'#0A140A', fontWeight:600 }}>{t('rooms.approve')}</button>
        <button onClick={() => respond('decline')} disabled={busy} style={{ flex:1, background:'transparent', border:'1px solid rgba(248,113,113,.3)', borderRadius:10, padding:9, color:C.danger }}>{t('rooms.decline')}</button>
      </div>}
      {alreadyResponded && <div style={{ fontSize:11, color:C.muted, marginTop:8 }}>{t('rooms.alreadyResponded')}</div>}
    </div>}
    {!loading && active && <div style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
      <div style={{ color:C.text, fontSize:12, fontWeight:600, marginBottom:8 }}>{t('rooms.activeIntentions')} (v{formatNumber(active.version)})</div>
      {(active.items || []).map(item => <div key={item.key} style={{ fontSize:12, color:C.text2, marginBottom:2 }}>{labelField(item.key)}: {labelValue(item.value)}</div>)}
    </div>}
    {!loading && !pending && <>
      <div style={{ color:C.text, fontSize:12, fontWeight:600, marginBottom:8 }}>{active ? t('rooms.proposeUpdate') : t('rooms.proposeIntentions')}</div>
      {Object.entries(INTENT_FIELDS).map(([key, values]) => <div key={key} style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{labelField(key)}</div>
        <select value={draft[key] || ''} onChange={event => setDraft(previous => ({ ...previous, [key]:event.target.value }))} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 12px', color:C.text, fontSize:13 }}>
          <option value="">{t('rooms.notDefined')}</option>
          {values.map(value => <option key={value} value={value}>{labelValue(value)}</option>)}
        </select>
      </div>)}
      <button onClick={propose} disabled={busy} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:12, color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', opacity:busy ? .6 : 1 }}>{t('rooms.propose')}</button>
    </>}
  </Sheet>
}

function MessageBubble({ message, mine }) {
  const { t, formatDate } = useI18n()
  if (['SYSTEM','RULE_UPDATE','SAFETY'].includes(message.messageType)) {
    const icon = message.messageType === 'SAFETY' ? '💚' : message.messageType === 'RULE_UPDATE' ? '📌' : 'ℹ️'
    return <div style={{ textAlign:'center' }}><span style={{ background:'rgba(184,167,255,.1)', border:'1px solid rgba(184,167,255,.2)', borderRadius:20, padding:'4px 12px', fontSize:11, color:C.primary }}>{icon} {message.body || t('rooms.roomUpdate')}</span></div>
  }
  return <div style={{ display:'flex', gap:8, flexDirection:mine ? 'row-reverse' : 'row', alignItems:'flex-end' }}>
    {!mine && <Avatar profile={message.sender?.profile} size={24}/>}<div style={{ maxWidth:'72%' }}>
      {!mine && <div style={{ fontSize:10, color:C.muted, margin:'0 0 3px 4px' }}>{message.sender?.profile?.displayName}</div>}
      <div style={{ background:mine ? C.primaryDim : C.surface, border:`1px solid ${mine ? 'rgba(184,167,255,.3)' : C.border}`, borderRadius:mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding:'10px 14px', fontSize:14, color:mine ? C.text : C.text2 }}>{message.messageType === 'IMAGE' ? `📷 ${t('rooms.imagePreview')}` : message.body}</div>
      <div style={{ fontSize:10, color:C.muted, marginTop:3, textAlign:mine ? 'right' : 'left', marginInline:4 }}>{formatDate(message.createdAt, { hour:'2-digit', minute:'2-digit' })}{message.expiresAt ? ` · ⏱ ${t('rooms.temporary')}` : ''}</div>
    </div>
  </div>
}

function RoomChat({ room:initialRoom, onBack }) {
  const { user } = useAuth()
  const { t, formatNumber } = useI18n()
  const [room, setRoom] = useState(initialRoom)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showSafeExit, setShowSafeExit] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [showIntentions, setShowIntentions] = useState(false)
  const [consentSummary, setConsentSummary] = useState(null)
  const [typingUsers, setTypingUsers] = useState([])
  const [refreshConsent, setRefreshConsent] = useState(0)
  const [refreshIntentions, setRefreshIntentions] = useState(0)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const load = useCallback(() => {
    Promise.all([
      api.get(`/rooms/${room.id}`).then(response => setRoom(previous => ({ ...previous, ...response.data }))),
      api.get(`/rooms/${room.id}/rules`).then(response => setConsentSummary(response.data.consent)),
      api.get(`/rooms/${room.id}/messages`).then(response => setMessages(response.data.messages || [])),
    ]).catch(() => setError(t('rooms.genericError'))).finally(() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 80))
  }, [room.id, t])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('room:join', room.id)
    const onCreated = message => { if (message.roomId === room.id) setMessages(previous => previous.some(item => item.id === message.id) ? previous : [...previous, message]) }
    const onDeleted = ({ messageId }) => setMessages(previous => previous.filter(item => item.id !== messageId))
    const onStatus = ({ roomId, status }) => { if (roomId === room.id) setRoom(previous => ({ ...previous, status })) }
    const onClosed = ({ roomId }) => { if (roomId === room.id) { window.alert(t('rooms.roomClosed')); onBack() } }
    const onRules = ({ roomId }) => { if (roomId === room.id) api.get(`/rooms/${roomId}/rules`).then(response => setConsentSummary(response.data.consent)).catch(() => {}) }
    const onConsent = ({ roomId }) => { if (roomId === room.id) setRefreshConsent(value => value + 1) }
    const onIntentions = ({ roomId }) => { if (roomId === room.id) setRefreshIntentions(value => value + 1) }
    const onTypingStart = ({ roomId, userId }) => { if (roomId === room.id && userId !== user?.id) setTypingUsers(previous => [...new Set([...previous, userId])]) }
    const onTypingStop = ({ roomId, userId }) => { if (roomId === room.id) setTypingUsers(previous => previous.filter(item => item !== userId)) }
    socket.on('message:created', onCreated); socket.on('message:delete', onDeleted); socket.on('room:status', onStatus); socket.on('room:closed', onClosed); socket.on('consent:updated', onRules); socket.on('rules:updated', onRules); socket.on('consent-check:updated', onConsent); socket.on('intent-alignment:updated', onIntentions); socket.on('typing:start', onTypingStart); socket.on('typing:stop', onTypingStop)
    return () => { socket.emit('room:leave', room.id); socket.off('message:created', onCreated); socket.off('message:delete', onDeleted); socket.off('room:status', onStatus); socket.off('room:closed', onClosed); socket.off('consent:updated', onRules); socket.off('rules:updated', onRules); socket.off('consent-check:updated', onConsent); socket.off('intent-alignment:updated', onIntentions); socket.off('typing:start', onTypingStart); socket.off('typing:stop', onTypingStop) }
  }, [room.id, user?.id, onBack, t])

  const canSend = room.status === 'ACTIVE'
  const send = async () => {
    if (!body.trim() || sending || !canSend) return
    const text = body.trim(); setBody(''); setSending(true); setError('')
    try {
      const response = await api.post(`/rooms/${room.id}/messages`, { body:text })
      const message = response.data?.message || response.data
      if (message?.id) setMessages(previous => previous.some(item => item.id === message.id) ? previous : [...previous, message])
    } catch { setBody(text); setError(t('rooms.genericError')) }
    finally { setSending(false) }
  }
  const notifyTyping = start => getSocket().emit(start ? 'typing:start' : 'typing:stop', room.id)
  const privacy = room.status === 'ACTIVE' ? t('rooms.privateActive') : room.status === 'WAITING_CONSENT' ? t('rooms.privateWaiting') : room.status === 'PAUSED' ? t('rooms.privatePaused') : room.status === 'SAFETY_LOCKED' ? t('rooms.privateLocked') : t('rooms.privateDefault')
  const actionBtn = { background:C.input, border:`1px solid ${C.border}`, borderRadius:20, padding:'6px 12px', fontSize:11, color:C.text2, cursor:'pointer' }

  return <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg }}>
    {showRules && <RoomRulesModal roomId={room.id} onClose={() => setShowRules(false)} onChanged={load}/>} {showSafeExit && <RoomSafeExitModal room={room} onClose={() => setShowSafeExit(false)} onLeft={onBack}/>} {showConsent && <RoomConsentCheckModal key={refreshConsent} room={room} onClose={() => setShowConsent(false)}/>} {showIntentions && <IntentAlignmentModal key={refreshIntentions} room={room} onClose={() => setShowIntentions(false)}/>} 
    <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'10px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}><button aria-label="back" onClick={onBack} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer' }}>←</button><div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:15, fontWeight:500, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{room.title || t('rooms.privateRoom')}</div><div style={{ fontSize:11, color:C.muted }}>{formatNumber(room.members?.length || 0)} {t('rooms.participants')} · <span style={{ color:STATUS_COLOR[room.status] }}>{t(`rooms.statuses.${room.status}`, room.status)}</span></div></div><div style={{ display:'flex' }}>{(room.members || []).slice(0,4).map((member,index) => <div key={member.userId} style={{ marginLeft:index ? -8 : 0, zIndex:4-index }}><Avatar profile={member.user?.profile} size={28}/></div>)}</div></div>
      <div style={{ marginTop:8, background:C.primaryDim, borderRadius:8, padding:'6px 10px', fontSize:11, color:C.primary }}>🔒 {privacy}</div>
      {consentSummary && <button onClick={() => setShowRules(true)} style={{ width:'100%', marginTop:6, background:'transparent', border:'none', borderTop:`1px solid ${C.border}`, paddingTop:8, cursor:'pointer', textAlign:'left', color:C.text2, fontSize:11 }}>📌 {formatNumber(consentSummary.approvedCount)}/{formatNumber(consentSummary.requiredCount)} {t('rooms.pinnedRules')} {formatNumber(consentSummary.version)} {t('rooms.tapRules')}</button>}
      <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}><button onClick={() => setShowConsent(true)} style={actionBtn}>✅ {t('rooms.consentTitle')}</button><button onClick={() => setShowIntentions(true)} style={actionBtn}>🧭 {t('rooms.intentions')}</button><button onClick={() => setShowRules(true)} style={actionBtn}>📌 {t('rooms.rules')}</button><button onClick={() => setShowSafeExit(true)} style={{ ...actionBtn, color:C.danger, borderColor:'rgba(248,113,113,.3)' }}>🚪 {t('rooms.safeExit')}</button></div>
    </div>
    {error && <div style={{ color:C.danger, fontSize:12, padding:'8px 16px' }}>{error}</div>}
    <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>{messages.length === 0 && <div style={{ textAlign:'center', color:C.muted, fontSize:14, margin:'auto' }}><div style={{ fontSize:32, marginBottom:8 }}>◎</div><div>{t('rooms.noMessages')}</div>{!canSend && <div style={{ fontSize:12, marginTop:8, color:C.warning }}>{t('rooms.acceptToMessage')}</div>}</div>}{messages.map(message => <MessageBubble key={message.id} message={message} mine={message.senderUserId === user?.id}/>)}{typingUsers.length > 0 && <div style={{ fontSize:11, color:C.muted, fontStyle:'italic' }}>{t('rooms.typing')}</div>}<div ref={bottomRef}/></div>
    <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'10px 16px', display:'flex', gap:10, alignItems:'center' }}><input value={body} onChange={event => { setBody(event.target.value); notifyTyping(true) }} onBlur={() => notifyTyping(false)} onKeyDown={event => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), send())} placeholder={canSend ? t('rooms.messagePlaceholder') : t('rooms.cannotMessage')} disabled={!canSend} style={{ flex:1, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:50, padding:'11px 16px', color:C.text, fontSize:14, outline:'none', opacity:canSend ? 1 : .5 }}/><button aria-label="send" onClick={send} disabled={!body.trim() || sending || !canSend} style={{ width:42, height:42, borderRadius:'50%', border:'none', background:body.trim() && canSend ? C.primary : C.elevated, color:body.trim() && canSend ? '#0A141A' : C.muted, fontSize:18, cursor:'pointer', opacity:sending ? .6 : 1 }}>↑</button></div>
  </div>
}

function CreateRoomModal({ onClose, onCreated }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ title:'', roomType:'COUPLE_SINGLE', description:'', defaultMessageTtl:'NONE' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const create = async () => {
    if (!form.title.trim()) return setError(t('rooms.roomNameRequired'))
    setSaving(true); setError('')
    try { const response = await api.post('/rooms', form); onCreated(response.data); onClose() }
    catch { setError(t('rooms.createError')) }
    finally { setSaving(false) }
  }
  return <Sheet onClose={onClose} title={t('rooms.createTitle')}>
    {error && <div style={{ color:C.danger, fontSize:13, marginBottom:12 }}>{error}</div>}
    <input value={form.title} onChange={event => setForm(previous => ({ ...previous, title:event.target.value }))} placeholder={t('rooms.roomName')} style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'13px 16px', color:C.text, fontSize:15, marginBottom:12 }}/>
    <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>{t('rooms.roomType')}</div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>{ROOM_TYPES.map(type => <button type="button" key={type.value} onClick={() => setForm(previous => ({ ...previous, roomType:type.value }))} style={{ background:form.roomType === type.value ? C.primaryDim : C.elevated, border:`1.5px solid ${form.roomType === type.value ? C.primary : C.border}`, borderRadius:12, padding:'10px 12px', cursor:'pointer', textAlign:'left' }}><div style={{ fontSize:16, marginBottom:3 }}>{type.icon}</div><div style={{ fontSize:13, fontWeight:500, color:form.roomType === type.value ? C.primary : C.text }}>{t(`rooms.roomTypes.${type.value}.label`)}</div><div style={{ fontSize:11, color:C.muted }}>{t(`rooms.roomTypes.${type.value}.desc`)}</div></button>)}</div>
    <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>{t('rooms.temporaryMessages')}</div><select value={form.defaultMessageTtl} onChange={event => setForm(previous => ({ ...previous, defaultMessageTtl:event.target.value }))} style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'11px 14px', color:C.text, fontSize:14, marginBottom:16 }}>{TTL_OPTIONS.map(value => <option key={value} value={value}>{t(`rooms.ttl.${value}`)}</option>)}</select><div style={{ fontSize:11, color:C.muted, marginTop:-10, marginBottom:16 }}>{t('rooms.ttlHelp')}</div>
    <div style={{ display:'flex', gap:10 }}><button onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:13, color:C.muted, fontSize:14, cursor:'pointer' }}>{t('rooms.cancel')}</button><button onClick={create} disabled={saving} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:13, color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer', opacity:saving ? .6 : 1 }}>{saving ? t('rooms.creating') : t('rooms.createRoom')}</button></div>
  </Sheet>
}

export default function RoomsLocalizedScreen() {
  const { t, formatNumber } = useI18n()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeRoom, setActiveRoom] = useState(null)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const load = useCallback(() => { setLoading(true); api.get('/rooms').then(response => setRooms(response.data.rooms || [])).catch(() => setError(t('rooms.genericError'))).finally(() => setLoading(false)) }, [t])
  useEffect(() => { load() }, [load])
  useEffect(() => { const matchId = searchParams.get('matchId'); if (!matchId || !rooms.length) return; const room = rooms.find(item => item.matchId === matchId); if (room) setActiveRoom(room); setSearchParams({}, { replace:true }) }, [rooms, searchParams, setSearchParams])
  if (activeRoom) return <RoomChat room={activeRoom} onBack={() => { setActiveRoom(null); load() }}/>
  return <div className="app-screen app-screen--rooms" style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
    {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={room => { setRooms(previous => [room, ...previous]); setActiveRoom(room) }}/>} 
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}><div><h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:0 }}>{t('rooms.title')}</h1><p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>{t('rooms.subtitle')}</p></div><button onClick={() => setShowCreate(true)} style={{ background:C.primary, border:'none', borderRadius:12, padding:'10px 16px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>{t('rooms.newRoom')}</button></div>
    {error && <div style={{ color:C.danger, fontSize:12, marginBottom:12 }}>{error}</div>} {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>{t('rooms.loading')}</div>}
    {!loading && rooms.length === 0 && <div style={{ textAlign:'center', padding:'60px 20px' }}><div style={{ fontSize:40, marginBottom:16, opacity:.4 }}>◎</div><div style={{ fontSize:18, fontWeight:500, color:C.text, marginBottom:8 }}>{t('rooms.emptyTitle')}</div><p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>{t('rooms.emptyHelp')}</p><button onClick={() => setShowCreate(true)} style={{ background:C.primary, border:'none', borderRadius:50, padding:'12px 28px', color:'#0A141A', fontWeight:600, fontSize:14, cursor:'pointer' }}>{t('rooms.createFirst')}</button></div>}
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{rooms.map(room => <button key={room.id} onClick={() => setActiveRoom(room)} style={{ width:'100%', background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'14px 16px', cursor:'pointer', display:'flex', gap:12, alignItems:'center', textAlign:'left' }}><div style={{ width:44, height:44, borderRadius:12, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:C.primary, flexShrink:0 }}>{ROOM_TYPES.find(type => type.value === room.roomType)?.icon || '◌'}</div><div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{room.title}</div><div style={{ fontSize:12, color:STATUS_COLOR[room.status] || C.muted }}>{t(`rooms.statuses.${room.status}`, room.status)} · {formatNumber(room.members?.length || 0)} {t('rooms.participants')}</div></div><div style={{ display:'flex' }}>{(room.members || []).slice(0,3).map((member,index) => <div key={member.userId} style={{ marginLeft:index ? -8 : 0, zIndex:3-index }}><Avatar profile={member.user?.profile} size={26}/></div>)}</div><span style={{ color:C.muted, fontSize:18 }}>›</span></button>)}</div>
  </div>
}
