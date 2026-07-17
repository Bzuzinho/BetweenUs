import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
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
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
        borderRadius:'28px 28px 0 0', width:'100%', maxWidth:420,
        padding:'24px 24px 40px', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ width:40, height:4, background:C.border,
          borderRadius:2, margin:'0 auto 20px' }} />
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
          color:C.text, marginBottom:6 }}>Acordo antes de conversar</h2>
        <p style={{ color:C.muted, fontSize:13, marginBottom:20, lineHeight:1.5 }}>
          Com <strong style={{color:C.primary}}>{name}</strong> — responde às perguntas abaixo.
          Este acordo fica fixado no topo da conversa.
        </p>
        {questions.map((q, i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <p style={{ color:C.text2, fontSize:13, marginBottom:8 }}>{q}</p>
            <div style={{ display:'flex', gap:8 }}>
              {['Sim','Talvez','Não'].map(opt => (
                <button key={opt} onClick={() => setAnswers(p => ({ ...p, [i]: opt }))}
                  style={{ flex:1, background: answers[i] === opt
                    ? opt === 'Sim' ? 'rgba(61,214,140,0.2)'
                    : opt === 'Não' ? 'rgba(224,92,122,0.2)'
                    : 'rgba(201,149,107,0.2)'
                    : C.bgInput,
                    border:`1.5px solid ${answers[i] === opt
                      ? opt === 'Sim' ? C.success
                      : opt === 'Não' ? '#F87171'
                      : C.primary
                      : C.border}`,
                    borderRadius:10, padding:'8px 4px', cursor:'pointer',
                    fontSize:12, color: answers[i] === opt ? C.text : C.muted,
                    transition:'all 0.2s' }}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onDecline}
            style={{ flex:1, background:'none', border:`1px solid ${C.border}`,
              borderRadius:50, padding:12, color:C.muted,
              cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Cancelar</button>
          <button onClick={() => onAccept(answers)} disabled={!allAnswered}
            style={{ flex:2, background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
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
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
        borderRadius:'28px 28px 0 0', width:'100%', maxWidth:420,
        padding:'24px 24px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width:40, height:4, background:C.border,
          borderRadius:2, margin:'0 auto 20px' }} />
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
          color:C.text, marginBottom:20 }}>🚪 Saída segura</h2>
        {options.map(opt => (
          <button key={opt.id} onClick={() => onAction(opt.id)}
            style={{ width:'100%', background:C.bgInput,
              border:`1px solid ${opt.id === 'block' || opt.id === 'report'
                ? 'rgba(224,92,122,0.3)' : C.border}`,
              borderRadius:14, padding:'14px 16px', marginBottom:8,
              display:'flex', alignItems:'center', gap:14, cursor:'pointer',
              textAlign:'left', transition:'all 0.2s' }}>
            <span style={{ fontSize:20 }}>{opt.icon}</span>
            <div>
              <div style={{ color: opt.id === 'block' || opt.id === 'report'
                ? '#F87171' : C.text, fontSize:14, fontWeight:600 }}>
                {opt.label}
              </div>
              <div style={{ color:C.muted, fontSize:11 }}>{opt.desc}</div>
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
        case 'revoke_photos': {
          // 8.5 — was misleadingly just creating a brand new PHOTO_REQUEST
          // check (which asks the OTHER side, doesn't revoke anything of
          // yours). Now: find the most recent check (PHOTO_REQUEST or
          // FACE_REVEAL) on this match where I've already said yes, and
          // actually revoke that answer. If there's nothing to revoke yet,
          // fall back to opening a PHOTO_REQUEST check instead.
          const { data } = await api.get(`/consent/match/${match.id}`)
          const mine = (data.checks || [])
            .filter(c => ['PHOTO_REQUEST', 'FACE_REVEAL'].includes(c.phase))
            .flatMap(c => (c.responses || []).filter(r => r.userId === user?.id && r.status === 'ACCEPTED').map(r => ({ checkId: c.id })))
          if (mine.length > 0) {
            await api.post(`/consent/check/${mine[0].checkId}/revoke`)
          } else {
            await api.post(`/consent/check`, { matchId: match.id, phase: 'PHOTO_REQUEST' })
          }
          break
        }
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
        <div style={{ background:C.bgCard, borderBottom:`1px solid ${C.border}`,
          padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={onBack}
              style={{ background:'none', border:'none', color:C.text2,
                fontSize:20, cursor:'pointer', padding:0, flexShrink:0 }}>←</button>
            <div style={{ width:38, height:38, borderRadius:12,
              background:'linear-gradient(135deg,#3D2060,#1A0A2E)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              {match.profile?.type === 'COUPLE' ? '💑' : '🧑'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:C.text, fontWeight:600, fontSize:14 }}>{name}</div>
              <div style={{ color:C.success, fontSize:11 }}>
                Match ativo · {agreedRules ? '📋 Acordo aceite' : '⏳ Sem acordo ainda'}
              </div>
            </div>
            <button onClick={() => setShowSafeExit(true)}
              style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:10,
                padding:'6px 10px', color:'#F87171', cursor:'pointer',
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
                textAlign:'left', color:C.primary, fontSize:11 }}>
              📋 {showRules ? 'Ocultar' : 'Ver'} acordo ({agreedRules.length} pontos)
            </button>
          )}
          {showRules && agreedRules && (
            <div style={{ paddingTop:8 }}>
              {agreedRules.map((r, i) => (
                <div key={i} style={{ fontSize:11, color:C.muted,
                  padding:'3px 0', borderBottom:`1px solid ${C.border}` }}>
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
            <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:40 }}>
              A carregar...
            </div>
          )}
          {!loading && messages.length === 0 && !showAgreement && (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
              <div style={{ color:C.text, fontSize:16,
                fontFamily:"'Playfair Display',serif", marginBottom:8 }}>É um match!</div>
              <div style={{ color:C.muted, fontSize:13 }}>
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
                  padding:'4px 12px', fontSize:11, color:C.primary }}>
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
                    ? `linear-gradient(135deg,${C.primary},${C.primaryDim})`
                    : C.bgCard,
                  color: mine ? '#1A0A2E' : C.text,
                  border: mine ? 'none' : `1px solid ${C.border}`,
                  borderBottomRightRadius: mine ? 4 : 18,
                  borderBottomLeftRadius: mine ? 18 : 4 }}>
                  {m.body}
                </div>
                <div style={{ fontSize:10, color:C.muted, padding:'0 4px' }}>
                  {new Date(m.createdAt).toLocaleTimeString('pt', { hour:'2-digit', minute:'2-digit' })}
                  {mine && m.readAt && ' · Lida'}
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ background:C.bgCard, borderTop:`1px solid ${C.border}`,
          padding:'12px 16px 24px', display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={agreedRules ? 'Escreve uma mensagem...' : 'Aceita o acordo para conversar...'}
            disabled={!agreedRules && messages.length === 0}
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
            style={{ flex:1, background:C.bgInput, border:`1.5px solid ${C.border}`,
              borderRadius:20, padding:'12px 16px', color:C.text, fontSize:14,
              resize:'none', outline:'none', minHeight:44, maxHeight:100,
              fontFamily:'Inter,sans-serif', opacity: !agreedRules && messages.length === 0 ? 0.5 : 1 }} />
          <button onClick={send} disabled={sending || !input.trim() || (!agreedRules && messages.length === 0)}
            style={{ background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
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
// BETA.2 (FASE D) — REQUESTS / WAITING FOR EVERYONE section.
// Reuses GET /api/couples/matches/pending as-is (already fully generic —
// resolveMyProfileId + getRequiredApproverUserIds + getActiveMembers, no
// couple-only logic despite living under /couples — see routes/couples.ts's
// comment). Before this, that data only ever reached CouplePage.jsx, so an
// individual or group profile's own pending N-party matches were invisible
// anywhere in the app.
function PendingMatchesSection({ pending, onApprove }) {
  if (!pending || pending.length === 0) return null
  const needsMe = pending.filter(p => !p.mySideConfirmed)
  const waitingOnOthers = pending.filter(p => p.mySideConfirmed && !p.otherSideConfirmed)
  if (needsMe.length === 0 && waitingOnOthers.length === 0) return null

  return (
    <div style={{ marginBottom:24 }}>
      {needsMe.length > 0 && (
        <>
          <div style={{ fontSize:11, color:C.warning, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8, fontWeight:600 }}>
            Pedidos — precisam da tua confirmação
          </div>
          {needsMe.map(p => (
            <div key={p.matchId} style={{ background:C.surface, border:`1px solid ${C.warning}`, borderRadius:14, padding:14, marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>{p.profile?.displayName}</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
                {p.myApprovals?.length > 1
                  ? `${p.myApprovals.filter(a => a.approved).length}/${p.myApprovals.length} do teu lado já confirmaram`
                  : 'Confirma o teu interesse para avançar.'}
              </div>
              <button onClick={() => onApprove(p.matchId)} style={{ background:C.primary, border:'none', borderRadius:10, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                Confirmar interesse
              </button>
            </div>
          ))}
        </>
      )}
      {waitingOnOthers.length > 0 && (
        <>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', margin:'14px 0 8px', fontWeight:600 }}>
            À espera de todos
          </div>
          {waitingOnOthers.map(p => (
            <div key={p.matchId} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:10, opacity:0.85 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{p.profile?.displayName}</div>
              <div style={{ fontSize:12, color:C.muted }}>Já confirmaste — a aguardar confirmação do outro lado.</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// BETA.4 — "Pedidos de ligação" (single-consent model, confirmed with o
// dono do produto): ligar → a outra pessoa é notificada de imediato e
// pode aceitar/rejeitar, sem duplo-match cego estilo swipe. Antes desta
// secção, este aviso só existia no sino de notificações — se fosse
// dispensado ali, o pedido "desaparecia" sem deixar rasto em Matches.
// Tem de ficar sempre visível e gratuita para todos os planos: é o fluxo
// principal, não uma funcionalidade premium (decisão de produto BETA.4).
// BETA.4 + secção 4/5 da revisão de monetização — a lista mantém-se sempre
// grátis, mas o DETALHE mostrado depende do plano de quem está a ver:
// `full` só vem preenchido pelo backend (GET /matches/pending-requests)
// quando o utilizador tem a entitlement VIEW_FULL_INCOMING_CONNECTION_PROFILE
// (Premium/Couple Premium). Sem isso, `preview` é a única coisa disponível
// — nunca inventar aqui um nome ou foto que o backend não mandou.
function IncomingRequestCard({ r, onAccept, onReject, busyId, onUpsell }) {
  const id = r.profile.id
  const name = r.full?.displayName
  const p = r.preview || {}
  const typeIcon = p.type === 'COUPLE' ? '💑' : p.type === 'GROUP' ? '👥' : '🧑'
  const photoUrl = p.photo?.url || r.full?.photos?.find(ph => ph.isPrimary)?.storagePath

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.primary}`, borderRadius:14, padding:14, marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:14, flexShrink:0, overflow:'hidden',
          background:'linear-gradient(135deg,#3D2060,#1A0A2E)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, border:`1.5px solid ${C.border}` }}>
          {photoUrl ? <img src={photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : typeIcon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:2 }}>
            {name || (p.ageRange ? `${p.ageRange} anos` : 'Alguém compatível')}{p.city ? ` · ${p.city}` : ''}
          </div>
          <div style={{ fontSize:12, color:C.muted }}>
            Quer ligar-se a ti{typeof p.score === 'number' ? ` · ${p.score}% compatível` : ''}
            {p.verified ? ' · ✓ verificado' : ''}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button disabled={busyId === id} onClick={() => onReject(id)}
            style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10,
              padding:'8px 12px', color:C.muted, fontSize:12, cursor:'pointer',
              opacity: busyId === id ? 0.5 : 1 }}>Rejeitar</button>
          <button disabled={busyId === id} onClick={() => onAccept(id)}
            style={{ background:C.primary, border:'none', borderRadius:10,
              padding:'8px 12px', color:'#0A141A', fontWeight:600, fontSize:12, cursor:'pointer',
              opacity: busyId === id ? 0.5 : 1 }}>Aceitar</button>
        </div>
      </div>
      {!r.canViewFullProfile && (
        <button onClick={onUpsell} style={{ marginTop:10, width:'100%', background:'none',
          border:`1px dashed ${C.border}`, borderRadius:10, padding:'6px 10px',
          color:C.primary, fontSize:11, cursor:'pointer' }}>
          ✦ Ver perfil completo com Between Premium
        </button>
      )}
    </div>
  )
}

function IncomingRequestsSection({ requests, onAccept, onReject, busyId, onUpsell }) {
  if (!requests || requests.length === 0) return null
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, color:C.primary, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8, fontWeight:600 }}>
        Pedidos de ligação — {requests.length} à espera da tua resposta
      </div>
      {requests.map(r => (
        <IncomingRequestCard key={r.profile.id} r={r} onAccept={onAccept} onReject={onReject} busyId={busyId} onUpsell={onUpsell} />
      ))}
    </div>
  )
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState([])
  const [pending, setPending] = useState([])
  const [requests, setRequests] = useState([])
  const [requestBusyId, setRequestBusyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const navigate = useNavigate()

  const loadPending = () => {
    api.get('/couples/matches/pending').then(res => setPending(res.data.pending || [])).catch(() => setPending([]))
  }

  const loadRequests = () => {
    api.get('/matches/pending-requests').then(res => setRequests(res.data.pending || [])).catch(() => setRequests([]))
  }

  useEffect(() => {
    api.get('/matches')
      .then(res => setMatches(res.data.matches || []))
      .catch(console.error)
      .finally(() => setLoading(false))
    loadPending()
    loadRequests()
  }, [])

  const handleApprove = async (matchId) => {
    try { await api.post(`/couples/matches/${matchId}/approve`); loadPending() } catch {}
  }

  const handleAcceptRequest = async (fromProfileId) => {
    setRequestBusyId(fromProfileId)
    try {
      await api.post(`/matches/accept/${fromProfileId}`)
      setRequests(prev => prev.filter(r => r.profile.id !== fromProfileId))
      api.get('/matches').then(res => setMatches(res.data.matches || [])).catch(() => {})
    } catch {} finally { setRequestBusyId(null) }
  }

  const handleRejectRequest = async (fromProfileId) => {
    setRequestBusyId(fromProfileId)
    try {
      await api.post(`/matches/reject/${fromProfileId}`)
      setRequests(prev => prev.filter(r => r.profile.id !== fromProfileId))
    } catch {} finally { setRequestBusyId(null) }
  }

  // BETA.2 (FASE D) — match→room navigation. Every match reaching ACTIVE
  // now gets a Private Room created automatically (domainEvents.ts's
  // MATCH_ACTIVATED handler -> PrivateRoomService.createFromMatch, 7.9) —
  // so an ACTIVE match's real conversation now lives in Salas Privadas,
  // not the legacy inline ChatRoom below. Falls back to the legacy chat
  // only if no room exists yet for this match (defensive — shouldn't
  // normally happen for a match created after Sprint 7).
  const openMatch = async (m) => {
    try {
      const res = await api.get('/rooms')
      const room = (res.data.rooms || []).find(r => r.matchId === m.id)
      if (room) { navigate(`/rooms?matchId=${m.id}`); return }
    } catch {}
    setActive(m)
  }

  if (active) return <ChatRoom match={active} onBack={() => setActive(null)} />

  return (
    <div style={{ padding:'60px 16px 0' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
        fontWeight:700, marginBottom:20,
        background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        Os teus Matches
      </div>

      <IncomingRequestsSection requests={requests} onAccept={handleAcceptRequest} onReject={handleRejectRequest} busyId={requestBusyId} onUpsell={() => navigate('/premium')} />

      <PendingMatchesSection pending={pending} onApprove={handleApprove} />

      {loading && (
        <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:60 }}>
          A carregar...
        </div>
      )}

      {!loading && matches.length === 0 && pending.length === 0 && requests.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:60, marginBottom:16 }}>💫</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
            color:C.text, marginBottom:8 }}>Ainda sem matches</div>
          <div style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>
            Explora perfis e dá like para criar matches.
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8, fontWeight:600 }}>
          Ligações ativas
        </div>
      )}
      {matches.map(m => (
        <div key={m.id} onClick={() => openMatch(m)}
          style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:18, padding:16, display:'flex', alignItems:'center',
            gap:14, marginBottom:12, cursor:'pointer', transition:'all 0.2s' }}>
          <div style={{ width:52, height:52, borderRadius:16, flexShrink:0,
            background:'linear-gradient(135deg,#3D2060,#1A0A2E)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, border:`1.5px solid ${C.border}` }}>
            {m.profile?.type === 'COUPLE' ? '💑' : '🧑'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:3 }}>
              {m.profile?.displayName}
            </div>
            <div style={{ fontSize:12, color:C.muted,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {m.lastMessage ? m.lastMessage.body : 'Toca para começar a conversar'}
            </div>
            <div style={{ fontSize:10, color:C.success, marginTop:3, fontWeight:500 }}>
              Match ✓
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            {m.lastMessage && (
              <div style={{ fontSize:11, color:C.muted }}>
                {new Date(m.lastMessage.createdAt).toLocaleTimeString('pt', {
                  hour:'2-digit', minute:'2-digit'
                })}
              </div>
            )}
            {m.unread > 0 && (
              <div style={{ background:C.primary, color:'#1A0A2E',
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
