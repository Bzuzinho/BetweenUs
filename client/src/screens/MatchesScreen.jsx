import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

// B.6 — Acordo antes do chat
function AgreementModal({ match, onAccept, onDecline }) {
  const name = match.profile?.displayName || 'este perfil'
  const questions = [
    'Esta conversa é apenas exploratória?',
    'Pode haver troca de fotos?',
    'É aceitável falar de encontro presencial?',
    'Ambos aceitam manter discrição total?',
    'Ambos aceitam as regras do perfil de cada um?',
  ]
  const [answers, setAnswers] = useState({})

  const allAnswered = questions.every((_, i) => answers[i] !== undefined)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      backdropFilter:'blur(8px)', zIndex:300, display:'flex',
      alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
        borderRadius:'28px 28px 0 0', width:'100%', maxWidth:420,
        padding:'24px 24px 40px', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ width:40, height:4, background:colors.plum,
          borderRadius:2, margin:'0 auto 20px' }} />
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
          color:colors.white, marginBottom:6 }}>Acordo antes de conversar</h2>
        <p style={{ color:colors.muted, fontSize:13, marginBottom:20, lineHeight:1.5 }}>
          Com <strong style={{color:colors.accent}}>{name}</strong> — responde às perguntas abaixo.
          Este acordo fica fixado no topo da conversa.
        </p>
        {questions.map((q, i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <p style={{ color:colors.lavLight, fontSize:13, marginBottom:8 }}>{q}</p>
            <div style={{ display:'flex', gap:8 }}>
              {['Sim','Talvez','Não'].map(opt => (
                <button key={opt} onClick={() => setAnswers(p => ({ ...p, [i]: opt }))}
                  style={{ flex:1, background: answers[i] === opt
                    ? opt === 'Sim' ? 'rgba(61,214,140,0.2)'
                    : opt === 'Não' ? 'rgba(224,92,122,0.2)'
                    : 'rgba(201,149,107,0.2)'
                    : colors.bgInput,
                    border:`1.5px solid ${answers[i] === opt
                      ? opt === 'Sim' ? colors.green
                      : opt === 'Não' ? '#E05C7A'
                      : colors.accent
                      : colors.plum}`,
                    borderRadius:10, padding:'8px 4px', cursor:'pointer',
                    fontSize:12, color: answers[i] === opt ? colors.white : colors.muted,
                    transition:'all 0.2s' }}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onDecline}
            style={{ flex:1, background:'none', border:`1px solid ${colors.plum}`,
              borderRadius:50, padding:12, color:colors.muted,
              cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Cancelar</button>
          <button onClick={() => onAccept(answers)} disabled={!allAnswered}
            style={{ flex:2, background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
              border:'none', borderRadius:50, padding:12, fontSize:14,
              fontWeight:600, color:'#1A0A2E', cursor:allAnswered ? 'pointer' : 'not-allowed',
              opacity:allAnswered ? 1 : 0.5, fontFamily:'Inter,sans-serif' }}>
            Aceitar e conversar →
          </button>
        </div>
      </div>
    </div>
  )
}

// B.7 — Safe Exit modal
function SafeExitModal({ match, onClose, onAction }) {
  const options = [
    { id:'archive', icon:'📦', label:'Arquivar conversa', desc:'Oculta o match da lista' },
    { id:'mute', icon:'🔕', label:'Silenciar notificações', desc:'Sem alertas deste match' },
    { id:'revoke_photos', icon:'📷', label:'Revogar acesso a fotos', desc:'Remove acesso às tuas fotos privadas' },
    { id:'block', icon:'🚫', label:'Bloquear utilizador', desc:'Não voltam a ver-se' },
    { id:'report', icon:'⚠️', label:'Reportar e sair', desc:'Denuncia e bloqueia' },
    { id:'exit', icon:'🚪', label:'Sair apenas', desc:'Fecha a conversa' },
  ]
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      backdropFilter:'blur(8px)', zIndex:300, display:'flex',
      alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
        borderRadius:'28px 28px 0 0', width:'100%', maxWidth:420,
        padding:'24px 24px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width:40, height:4, background:colors.plum,
          borderRadius:2, margin:'0 auto 20px' }} />
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
          color:colors.white, marginBottom:20 }}>🚪 Saída segura</h2>
        {options.map(opt => (
          <button key={opt.id} onClick={() => onAction(opt.id)}
            style={{ width:'100%', background:colors.bgInput,
              border:`1px solid ${opt.id === 'block' || opt.id === 'report'
                ? 'rgba(224,92,122,0.3)' : colors.plum}`,
              borderRadius:14, padding:'14px 16px', marginBottom:8,
              display:'flex', alignItems:'center', gap:14, cursor:'pointer',
              textAlign:'left', transition:'all 0.2s' }}>
            <span style={{ fontSize:20 }}>{opt.icon}</span>
            <div>
              <div style={{ color: opt.id === 'block' || opt.id === 'report'
                ? '#E05C7A' : colors.white, fontSize:14, fontWeight:600 }}>
                {opt.label}
              </div>
              <div style={{ color:colors.muted, fontSize:11 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// B.8 — Sala Privada completa
function ChatRoom({ match, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showAgreement, setShowAgreement] = useState(false)
  const [showSafeExit, setShowSafeExit] = useState(false)
  const [agreedRules, setAgreedRules] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const endRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get(`/matches/${match.id}/messages`)
      .then(res => {
        const msgs = res.data.messages || []
        setMessages(msgs)
        // B.6: show agreement modal if first time (no messages yet)
        if (msgs.length === 0) setShowAgreement(true)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [match.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleAgreementAccept = async (answers) => {
    const rules = Object.entries(answers).map(([i, v]) => {
      const qs = ['Conversa exploratória','Troca de fotos','Falar de encontro','Discrição total','Respeitar regras']
      return `${qs[Number(i)]}: ${v}`
    })
    setAgreedRules(rules)
    setShowAgreement(false)
    // Save agreed rules in conversation
    try {
      await api.post(`/matches/${match.id}/messages`, {
        body: `📋 Acordo estabelecido: ${rules.join(' · ')}`,
        messageType: 'SYSTEM'
      })
    } catch {}
  }

  const handleSafeExit = async (action) => {
    setShowSafeExit(false)
    try {
      switch(action) {
        case 'block':
          await api.post(`/privacy/block/${match.profile?.id}`)
          onBack()
          break
        case 'report':
          await api.post('/reports', { reportedUserId: match.profile?.userId, reason: 'HARASSMENT', details: 'Safe Exit usado' })
          await api.post(`/privacy/block/${match.profile?.id}`)
          onBack()
          break
        case 'revoke_photos':
          await api.post(`/consent/check`, { matchId: match.id, phase: 'PHOTO_REQUEST' })
          break
        case 'exit':
          onBack()
          break
        default:
          onBack()
      }
    } catch { onBack() }
  }

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
    <>
      {showAgreement && (
        <AgreementModal
          match={match}
          onAccept={handleAgreementAccept}
          onDecline={() => { setShowAgreement(false); onBack() }}
        />
      )}
      {showSafeExit && (
        <SafeExitModal
          match={match}
          onClose={() => setShowSafeExit(false)}
          onAction={handleSafeExit}
        />
      )}

      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)' }}>
        {/* B.8 — Header com contexto de consentimento */}
        <div style={{ background:colors.bgCard, borderBottom:`1px solid ${colors.plum}`,
          padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={onBack}
              style={{ background:'none', border:'none', color:colors.lavLight,
                fontSize:20, cursor:'pointer', padding:0, flexShrink:0 }}>←</button>
            <div style={{ width:38, height:38, borderRadius:12,
              background:'linear-gradient(135deg,#3D2060,#1A0A2E)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              {match.profile?.type === 'COUPLE' ? '💑' : '🧑'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:colors.white, fontWeight:600, fontSize:14 }}>{name}</div>
              <div style={{ color:colors.green, fontSize:11 }}>
                Match ativo · {agreedRules ? '📋 Acordo aceite' : '⏳ Sem acordo ainda'}
              </div>
            </div>
            <button onClick={() => setShowSafeExit(true)}
              style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:10,
                padding:'6px 10px', color:'#E05C7A', cursor:'pointer',
                fontSize:11, fontFamily:'Inter,sans-serif', flexShrink:0 }}>
              🚪 Sair
            </button>
          </div>

          {/* B.8 — Regras fixadas no topo */}
          {agreedRules && (
            <button onClick={() => setShowRules(p => !p)}
              style={{ width:'100%', background:'rgba(201,149,107,0.08)',
                border:'none', borderTop:`1px solid rgba(201,149,107,0.15)`,
                marginTop:10, paddingTop:8, cursor:'pointer',
                textAlign:'left', color:colors.accent, fontSize:11 }}>
              📋 {showRules ? 'Ocultar' : 'Ver'} acordo ({agreedRules.length} pontos)
            </button>
          )}
          {showRules && agreedRules && (
            <div style={{ paddingTop:8 }}>
              {agreedRules.map((r, i) => (
                <div key={i} style={{ fontSize:11, color:colors.muted,
                  padding:'3px 0', borderBottom:`1px solid ${colors.plum}` }}>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:16,
          display:'flex', flexDirection:'column', gap:10 }}>
          {loading && (
            <div style={{ textAlign:'center', color:colors.muted, fontSize:13, padding:40 }}>
              A carregar...
            </div>
          )}
          {!loading && messages.length === 0 && !showAgreement && (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
              <div style={{ color:colors.white, fontSize:16,
                fontFamily:"'Playfair Display',serif", marginBottom:8 }}>É um match!</div>
              <div style={{ color:colors.muted, fontSize:13 }}>
                Aceita o acordo para começar a conversar com {name}
              </div>
            </div>
          )}
          {messages.map(m => {
            const mine = m.senderUserId === user?.id
            const isSystem = m.messageType === 'SYSTEM'
            if (isSystem) return (
              <div key={m.id} style={{ textAlign:'center' }}>
                <span style={{ background:'rgba(201,149,107,0.1)',
                  border:`1px solid rgba(201,149,107,0.2)`, borderRadius:20,
                  padding:'4px 12px', fontSize:11, color:colors.accent }}>
                  {m.body}
                </span>
              </div>
            )
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
                  {new Date(m.createdAt).toLocaleTimeString('pt', { hour:'2-digit', minute:'2-digit' })}
                  {mine && m.readAt && ' · Lida'}
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
            placeholder={agreedRules ? 'Escreve uma mensagem...' : 'Aceita o acordo para conversar...'}
            disabled={!agreedRules && messages.length === 0}
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
            style={{ flex:1, background:colors.bgInput, border:`1.5px solid ${colors.plum}`,
              borderRadius:20, padding:'12px 16px', color:colors.white, fontSize:14,
              resize:'none', outline:'none', minHeight:44, maxHeight:100,
              fontFamily:'Inter,sans-serif', opacity: !agreedRules && messages.length === 0 ? 0.5 : 1 }} />
          <button onClick={send} disabled={sending || !input.trim() || (!agreedRules && messages.length === 0)}
            style={{ background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
              border:'none', borderRadius:'50%', width:44, height:44,
              cursor:'pointer', fontSize:18, display:'flex', alignItems:'center',
              justifyContent:'center', flexShrink:0,
              opacity: sending || !input.trim() ? 0.5 : 1 }}>↑</button>
        </div>
      </div>
    </>
  )
}

// ─── Lista de Matches ─────────────────────────────────────────────────────────
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
        <div style={{ textAlign:'center', color:colors.muted, fontSize:13, padding:60 }}>
          A carregar...
        </div>
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
            <div style={{ fontSize:15, fontWeight:600, color:colors.white, marginBottom:3 }}>
              {m.profile?.displayName}
            </div>
            <div style={{ fontSize:12, color:colors.muted,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {m.lastMessage ? m.lastMessage.body : 'Toca para começar a conversar'}
            </div>
            <div style={{ fontSize:10, color:colors.green, marginTop:3, fontWeight:500 }}>
              Match ✓
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            {m.lastMessage && (
              <div style={{ fontSize:11, color:colors.muted }}>
                {new Date(m.lastMessage.createdAt).toLocaleTimeString('pt', {
                  hour:'2-digit', minute:'2-digit'
                })}
              </div>
            )}
            {m.unread > 0 && (
              <div style={{ background:colors.accent, color:'#1A0A2E',
                borderRadius:10, padding:'2px 7px', fontSize:10, fontWeight:700 }}>
                {m.unread}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
