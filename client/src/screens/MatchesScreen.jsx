import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

// ─── Consent Check Modal ──────────────────────────────────────────────────────
// Aparece antes da primeira mensagem — confirma intenções e limites
const CONSENT_QUESTIONS = [
  {
    id: 'intentions',
    question: 'Ambos percebem o que procuram neste match?',
    description: 'As vossas intenções e o que cada um espera deste contacto.'
  },
  {
    id: 'boundaries',
    question: 'Comprometem-se a respeitar os limites um do outro?',
    description: 'Nada avança sem consentimento explícito de ambas as partes.'
  },
  {
    id: 'privacy',
    question: 'Mantêm a privacidade desta conversa?',
    description: 'Fotos, mensagens e informações pessoais ficam entre vós.'
  },
  {
    id: 'safe_exit',
    question: 'Qualquer um pode encerrar a conversa a qualquer momento?',
    description: 'Sem pressão, sem julgamentos. O bloqueio está sempre disponível.'
  }
]

function ConsentCheckModal({ matchName, onAccept, onDecline }) {
  const [checked, setChecked] = useState({})
  const allChecked = CONSENT_QUESTIONS.every(q => checked[q.id])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      backdropFilter:'blur(12px)', zIndex:300, display:'flex',
      alignItems:'flex-end', justifyContent:'center', padding:'0 0 0 0' }}>
      <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
        borderRadius:'28px 28px 0 0', width:'100%', maxWidth:420,
        padding:'24px 24px 40px', maxHeight:'85vh', overflowY:'auto' }}>

        {/* Handle */}
        <div style={{ width:40, height:4, background:colors.plum,
          borderRadius:2, margin:'0 auto 20px' }} />

        <div style={{ fontSize:28, textAlign:'center', marginBottom:8 }}>🤝</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
          fontWeight:700, color:colors.white, textAlign:'center', marginBottom:6 }}>
          Consent Check
        </div>
        <div style={{ color:colors.muted, fontSize:13, textAlign:'center',
          marginBottom:24, lineHeight:1.5 }}>
          Antes de conversar com <strong style={{ color:colors.lavLight }}>{matchName}</strong>,
          confirma estes pontos.
        </div>

        {CONSENT_QUESTIONS.map(q => (
          <div key={q.id}
            onClick={() => setChecked(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
            style={{ background: checked[q.id] ? `${colors.green}11` : colors.bgInput,
              border: `1.5px solid ${checked[q.id] ? colors.green + '55' : colors.plum}`,
              borderRadius:16, padding:'14px 16px', marginBottom:10,
              cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start',
              transition:'all 0.2s' }}>
            <div style={{ width:22, height:22, borderRadius:7, flexShrink:0, marginTop:1,
              border:`2px solid ${checked[q.id] ? colors.green : colors.plum}`,
              background: checked[q.id] ? colors.green : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.2s' }}>
              {checked[q.id] && (
                <span style={{ color:'#0A2010', fontSize:13, fontWeight:700 }}>✓</span>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:colors.white, fontSize:13, fontWeight:500,
                lineHeight:1.4, marginBottom:3 }}>{q.question}</div>
              <div style={{ color:colors.muted, fontSize:11, lineHeight:1.4 }}>
                {q.description}
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop:20, display:'flex', gap:10 }}>
          <button onClick={onDecline}
            style={{ flex:1, background:'none', border:`1px solid ${colors.plum}`,
              borderRadius:50, padding:'13px', color:colors.muted, cursor:'pointer',
              fontSize:14, fontFamily:'Inter,sans-serif' }}>
            Voltar
          </button>
          <button onClick={onAccept} disabled={!allChecked}
            style={{ flex:2,
              background: allChecked
                ? `linear-gradient(135deg,${colors.green},#27A870)`
                : colors.plum,
              border:'none', borderRadius:50, padding:'13px', color: allChecked ? '#0A2010' : colors.muted,
              fontWeight:700, fontSize:14, cursor: allChecked ? 'pointer' : 'not-allowed',
              transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}>
            {allChecked ? 'Confirmar e conversar ✓' : `Confirma todos os pontos (${Object.values(checked).filter(Boolean).length}/${CONSENT_QUESTIONS.length})`}
          </button>
        </div>

        <div style={{ marginTop:14, color:colors.muted, fontSize:11,
          textAlign:'center', lineHeight:1.5 }}>
          Este check-in é guardado localmente e não é enviado ao outro utilizador.
        </div>
      </div>
    </div>
  )
}

function ChatRoom({ match, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const endRef = useRef(null)

  const CONSENT_KEY = `consent_check_${match.id}`

  useEffect(() => {
    api.get(`/matches/${match.id}/messages`)
      .then(res => {
        const msgs = res.data.messages || []
        setMessages(msgs)
        // Show consent check if no messages sent yet
        const myMessages = msgs.filter(m => m.senderUserId === user?.id)
        const alreadyConsented = localStorage.getItem(CONSENT_KEY)
        if (myMessages.length === 0 && !alreadyConsented) {
          setShowConsent(true)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [match.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const res = await api.post(`/matches/${match.id}/messages`, { body: text })
      setMessages(prev => [...prev, res.data])
    } catch { setInput(text) }
    finally { setSending(false) }
  }

  const name = match.profile?.displayName || 'Match'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)' }}>
      {showConsent && (
        <ConsentCheckModal
          matchName={name}
          onAccept={() => {
            localStorage.setItem(CONSENT_KEY, '1')
            setShowConsent(false)
          }}
          onDecline={() => onBack()}
        />
      )}
      {/* Header */}
      <div style={{ background:colors.bgCard, borderBottom:`1px solid ${colors.plum}`,
        padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack}
          style={{ background:'none', border:'none', color:colors.lavLight,
            fontSize:20, cursor:'pointer', padding:0 }}>←</button>
        <div style={{ width:40, height:40, borderRadius:12,
          background:'linear-gradient(135deg,#3D2060,#1A0A2E)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
          {match.profile?.type === 'COUPLE' ? '💑' : '🧑'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:colors.white, fontWeight:600, fontSize:15 }}>{name}</div>
          <div style={{ color:colors.green, fontSize:11 }}>Match ativo ✓</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:16,
        display:'flex', flexDirection:'column', gap:10 }}>
        {loading && (
          <div style={{ textAlign:'center', color:colors.muted,
            fontSize:13, padding:40 }}>A carregar mensagens...</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
            <div style={{ color:colors.white, fontSize:16,
              fontFamily:"'Playfair Display',serif", marginBottom:8 }}>
              É um match!
            </div>
            <div style={{ color:colors.muted, fontSize:13 }}>
              Envia a primeira mensagem a {name}
            </div>
          </div>
        )}
        {messages.map(m => {
          const mine = m.senderUserId === user?.id
          return (
            <div key={m.id} style={{ display:'flex', flexDirection:'column',
              alignItems: mine ? 'flex-end' : 'flex-start', gap:3 }}>
              <div style={{ maxWidth:'75%', borderRadius:18, padding:'10px 14px',
                fontSize:14, lineHeight:1.5,
                background: mine
                  ? `linear-gradient(135deg,${colors.accent},${colors.rose})`
                  : colors.bgCard,
                color: mine ? '#1A0A2E' : colors.white,
                border: mine ? 'none' : `1px solid ${colors.plum}`,
                borderBottomRightRadius: mine ? 4 : 18,
                borderBottomLeftRadius: mine ? 18 : 4 }}>
                {m.body}
              </div>
              <div style={{ fontSize:10, color:colors.muted, padding:'0 4px' }}>
                {new Date(m.createdAt).toLocaleTimeString('pt', {
                  hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ background:colors.bgCard, borderTop:`1px solid ${colors.plum}`,
        padding:'12px 16px 24px', display:'flex', gap:10, alignItems:'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          placeholder="Escreve uma mensagem..."
          rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
          style={{ flex:1, background:colors.bgInput, border:`1.5px solid ${colors.plum}`,
            borderRadius:20, padding:'12px 16px', color:colors.white,
            fontSize:14, resize:'none', outline:'none', minHeight:44, maxHeight:100,
            fontFamily:'Inter,sans-serif', transition:'border-color 0.2s' }} />
        <button onClick={send} disabled={sending || !input.trim()}
          style={{ background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            border:'none', borderRadius:'50%', width:44, height:44,
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
            opacity: sending || !input.trim() ? 0.5 : 1, flexShrink:0 }}>↑</button>
      </div>
    </div>
  )
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  useEffect(() => {
    api.get('/matches')
      .then(res => setMatches(res.data.matches || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (active) return <ChatRoom match={active} onBack={() => setActive(null)} />

  return (
    <div style={{ padding:'60px 16px 0' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
        fontWeight:700, marginBottom:20,
        background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        Os teus Matches
      </div>

      {loading && (
        <div style={{ textAlign:'center', color:colors.muted,
          fontSize:13, padding:60 }}>A carregar...</div>
      )}

      {!loading && matches.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:60, marginBottom:16 }}>💫</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
            color:colors.white, marginBottom:8 }}>Ainda sem matches</div>
          <div style={{ color:colors.muted, fontSize:14, lineHeight:1.6 }}>
            Explora perfis e dá like para criar matches.
          </div>
        </div>
      )}

      {matches.map(m => (
        <div key={m.id} onClick={() => setActive(m)}
          style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:18, padding:16, display:'flex', alignItems:'center',
            gap:14, marginBottom:12, cursor:'pointer', transition:'all 0.2s' }}>
          <div style={{ width:52, height:52, borderRadius:16, flexShrink:0,
            background:'linear-gradient(135deg,#3D2060,#1A0A2E)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, border:`1.5px solid ${colors.plum}` }}>
            {m.profile?.type === 'COUPLE' ? '💑' : '🧑'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:600,
              color:colors.white, marginBottom:3 }}>
              {m.profile?.displayName}
            </div>
            <div style={{ fontSize:12, color:colors.muted,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {m.lastMessage ? m.lastMessage.body : 'Sem mensagens ainda'}
            </div>
            <div style={{ fontSize:10, color:colors.green,
              marginTop:3, fontWeight:500 }}>Match ✓</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column',
            alignItems:'flex-end', gap:4 }}>
            {m.lastMessage && (
              <div style={{ fontSize:11, color:colors.muted }}>
                {new Date(m.lastMessage.createdAt).toLocaleTimeString('pt', {
                  hour:'2-digit', minute:'2-digit' })}
              </div>
            )}
            {m.unread > 0 && (
              <div style={{ background:colors.accent, color:'#1A0A2E',
                borderRadius:10, padding:'2px 7px', fontSize:10,
                fontWeight:700 }}>{m.unread}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
