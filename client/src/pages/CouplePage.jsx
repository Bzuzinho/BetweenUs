import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import UserNotificationBell from '../components/UserNotificationBell'
import { setPendingInviteRedirect } from '../lib/pendingInviteRedirect'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

const inputStyle = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
  borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14,
  outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12
}

const sectionStyle = {
  background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:20, padding:20, marginBottom:16
}

const sectionTitle = {
  fontSize:14, color:C.text, fontWeight:600, marginBottom:4,
  display:'flex', alignItems:'center', gap:8
}

// Página de aceitar convite via URL
export function CoupleInvitePage() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) {
      // BETA.3 fix — used to discard the token here and just dump the
      // visitor at /login with no way back. See lib/pendingInviteRedirect.js.
      setPendingInviteRedirect(`/couple-invite/${token}`)
      navigate('/login')
      return
    }
    api.post(`/couples/join/${token}`)
      .then(res => { setStatus('success'); setMsg(res.data.message) })
      .catch(err => {
        setStatus('error')
        setMsg(err.response?.data?.error || 'Erro ao aceitar convite.')
      })
  }, [token, user])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:360, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:24 }}>
          {status === 'loading' ? '⏳' : status === 'success' ? '💑' : '❌'}
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
          color:C.text, marginBottom:12 }}>
          {status === 'loading' ? 'A processar...'
            : status === 'success' ? 'Casal ativado!'
            : 'Erro no convite'}
        </h2>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.6,
          marginBottom:28 }}>{msg}</p>
        {status !== 'loading' && (
          <button onClick={() => navigate('/explore')}
            style={{ background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:'14px 32px',
              fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
            Ir para a app →
          </button>
        )}
      </div>
    </div>
  )
}

const PREF_LABEL = { YES:'Sim', MAYBE:'Talvez', NO:'Não' }
const PREF_COLOR = { YES:C.success, MAYBE:C.warning, NO:C.danger }

// 6.9 — "Modo Acordo" real: cada membro responde na sua própria sessão
// (nunca em nome do parceiro — o backend resolve sempre profileMemberId a
// partir do utilizador autenticado). Esta secção nunca mostra a resposta
// individual do parceiro, só o resultado partilhado/conservador e se há
// alinhamento ou conflito nessa pergunta.
function AgreementSection() {
  const [catalog, setCatalog] = useState({ boundaries: [], questions: [] })
  const [summary, setSummary] = useState(null)
  const [myAnswers, setMyAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingRef, setSavingRef] = useState(null)

  const refKey = (ref) => ref.boundaryId ? `b:${ref.boundaryId}` : `q:${ref.agreementQuestionId}`

  const load = useCallback(() => {
    Promise.all([
      api.get('/agreements/questions'),
      api.get('/agreements/me'),
      api.get('/agreements/me/my-answers'),
    ]).then(([q, s, mine]) => {
      setCatalog(q.data)
      setSummary(s.data)
      const map = {}
      ;(mine.data.answers || []).forEach(a => {
        map[a.boundaryId ? `b:${a.boundaryId}` : `q:${a.agreementQuestionId}`] = a.preference
      })
      setMyAnswers(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const answer = async (ref, preference) => {
    const key = refKey(ref)
    setSavingRef(key)
    setMyAnswers(prev => ({ ...prev, [key]: preference }))
    try {
      await api.put('/agreements/me/answer', { ...ref, preference })
      const [s, mine] = await Promise.all([api.get('/agreements/me'), api.get('/agreements/me/my-answers')])
      setSummary(s.data)
      const map = {}
      ;(mine.data.answers || []).forEach(a => {
        map[a.boundaryId ? `b:${a.boundaryId}` : `q:${a.agreementQuestionId}`] = a.preference
      })
      setMyAnswers(map)
    } catch {} finally { setSavingRef(null) }
  }

  const lock = async () => {
    try { await api.post('/agreements/me/lock'); load() } catch {}
  }
  const newRound = async () => {
    if (!window.confirm('Iniciar uma nova ronda? As respostas anteriores ficam guardadas na versão atual.')) return
    try { await api.post('/agreements/me/new-round'); load() } catch {}
  }

  if (loading) return null

  // Summary results don't echo back refs, only labels — build a lookup
  // by label to attach each item's shared result.
  const resultByLabel = {}
  ;(summary?.results || []).forEach(r => { resultByLabel[r.label] = r })

  const items = [
    ...catalog.boundaries.map(b => ({ ...b, kind: 'boundary' })),
    ...catalog.questions.map(q => ({ ...q, kind: 'question' })),
  ]
  const byCategory = items.reduce((acc, item) => {
    const cat = item.category || 'OUTRO'
    ;(acc[cat] = acc[cat] || []).push(item)
    return acc
  }, {})

  const locked = summary?.status === 'LOCKED'

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>📜 Modo Acordo</div>
      <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        Cada membro responde na sua própria conta. Nunca vês a resposta individual
        do teu parceiro/a — só o resultado partilhado (o mais conservador dos dois).
      </p>

      {summary && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          <span style={{ background:C.input, border:`1px solid ${C.border}`,
            borderRadius:20, padding:'5px 12px', fontSize:11, color:C.text2 }}>
            Estado: {
              summary.status === 'ALIGNED' ? '✅ Alinhados' :
              summary.status === 'CONFLICT' ? '⚠️ Em conflito' :
              summary.status === 'WAITING_MEMBERS' ? '⏳ A aguardar respostas' :
              summary.status === 'LOCKED' ? '🔒 Bloqueado' : '📝 Rascunho'
            }
          </span>
          {summary.conflictCount > 0 && (
            <span style={{ background:'rgba(248,113,113,0.1)', border:`1px solid ${C.danger}`,
              borderRadius:20, padding:'5px 12px', fontSize:11, color:C.danger }}>
              {summary.conflictCount} ponto(s) por alinhar
            </span>
          )}
          {summary.missingCount > 0 && (
            <span style={{ background:C.input, border:`1px solid ${C.border}`,
              borderRadius:20, padding:'5px 12px', fontSize:11, color:C.muted }}>
              {summary.missingCount} por responder
            </span>
          )}
        </div>
      )}

      {locked && (
        <div style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:12,
          padding:'10px 14px', marginBottom:14, fontSize:12, color:C.muted }}>
          Esta ronda está bloqueada. Inicia uma nova ronda para alterar respostas.
        </div>
      )}

      {Object.entries(byCategory).map(([category, catItems]) => (
        <div key={category} style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase',
            letterSpacing:'0.04em', marginBottom:8 }}>{category.replace(/_/g, ' ')}</div>
          {catItems.map(item => {
            const key = refKey(item.ref)
            const mine = myAnswers[key]
            const result = resultByLabel[item.label]
            return (
              <div key={key} style={{ padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:8, gap:8 }}>
                  <span style={{ fontSize:13, color:C.text, flex:1 }}>{item.label}</span>
                  {result && result.sharedPreference && (
                    <span style={{ fontSize:10, fontWeight:600,
                      color: result.aligned ? C.success : C.warning }}>
                      {result.aligned ? '✓ alinhado' : '~ conservador aplicado'}: {PREF_LABEL[result.sharedPreference]}
                    </span>
                  )}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {['YES','MAYBE','NO'].map(pref => (
                    <button key={pref} disabled={locked || savingRef === key}
                      onClick={() => answer(item.ref, pref)} style={{
                        flex:1, background: mine === pref ? `${PREF_COLOR[pref]}22` : 'transparent',
                        border:`1px solid ${mine === pref ? PREF_COLOR[pref] : C.border}`,
                        borderRadius:8, padding:'6px 10px', fontSize:11,
                        color: mine === pref ? PREF_COLOR[pref] : C.muted,
                        cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1,
                      }}>{PREF_LABEL[pref]}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ display:'flex', gap:10, marginTop:12 }}>
        {!locked ? (
          <button onClick={lock} style={{ flex:1, background:C.input, border:`1px solid ${C.border}`,
            borderRadius:50, padding:12, fontSize:13, color:C.text2, cursor:'pointer' }}>
            🔒 Bloquear ronda
          </button>
        ) : (
          <button onClick={newRound} style={{ flex:1,
            background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
            border:'none', borderRadius:50, padding:12, fontSize:13,
            fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
            ↻ Nova ronda
          </button>
        )}
      </div>
    </div>
  )
}

// 6.6 — matches em PENDING_COUPLE_APPROVAL: "Interesse enviado → Parceiro A
// confirmou → Parceiro B confirmou → Sala Privada desbloqueada". Só mostra
// o progresso do PRÓPRIO casal (quem já aprovou do meu lado) + um booleano
// agregado do outro lado — nunca identidades da outra parte.
function PendingMatchesSection() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    api.get('/couples/matches/pending')
      .then(r => setPending(r.data.pending || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (matchId) => {
    setBusyId(matchId)
    try { await api.post(`/couples/matches/${matchId}/approve`); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro ao aprovar.') }
    finally { setBusyId(null) }
  }
  const reject = async (matchId) => {
    if (!window.confirm('Rejeitar este match? Esta ação não pode ser desfeita.')) return
    setBusyId(matchId)
    try { await api.post(`/couples/matches/${matchId}/reject`); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro ao rejeitar.') }
    finally { setBusyId(null) }
  }

  if (loading || pending.length === 0) return null

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>💫 Matches à espera de aprovação</div>
      <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        Nenhum match avança sem aprovação dos dois membros.
      </p>
      {pending.map(p => (
        <div key={p.matchId} style={{ background:C.input, border:`1px solid ${C.border}`,
          borderRadius:16, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:14, color:C.text, fontWeight:600, marginBottom:8 }}>
            {p.profile?.type === 'COUPLE' ? '💑' : '🧑'} {p.profile?.displayName}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {p.myApprovals.map(m => (
              <span key={m.userId} style={{
                fontSize:11, padding:'4px 10px', borderRadius:20,
                background: m.approved ? 'rgba(74,222,128,0.1)' : C.surface,
                border:`1px solid ${m.approved ? C.success : C.border}`,
                color: m.approved ? C.success : C.muted,
              }}>
                {m.isCreator ? 'Parceiro A' : 'Parceiro B'} {m.approved ? '✓ confirmou' : '· por confirmar'}
              </span>
            ))}
            <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20,
              background: p.otherSideConfirmed ? 'rgba(74,222,128,0.1)' : C.surface,
              border:`1px solid ${p.otherSideConfirmed ? C.success : C.border}`,
              color: p.otherSideConfirmed ? C.success : C.muted }}>
              Outra parte {p.otherSideConfirmed ? '✓ confirmou' : '· a aguardar'}
            </span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => reject(p.matchId)} disabled={busyId === p.matchId}
              style={{ flex:1, background:'transparent', border:`1px solid ${C.danger}`,
                borderRadius:50, padding:10, fontSize:12, color:C.danger, cursor:'pointer' }}>
              Rejeitar
            </button>
            <button onClick={() => approve(p.matchId)} disabled={busyId === p.matchId}
              style={{ flex:2, background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:10, fontSize:12,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
              {p.mySideConfirmed ? '✓ Já confirmaste' : 'Confirmar interesse'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// 6.7 — Travel Mode do casal: propor requer aprovação de todos os membros
// ativos antes de ficar SCHEDULED/ativo.
function TravelSection() {
  const [travels, setTravels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ city:'', country:'', startDate:'', endDate:'' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.get('/travel/me').then(r => setTravels(r.data.travelModes || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const current = travels.find(t => t.status === 'WAITING_MEMBER_APPROVAL' || t.status === 'SCHEDULED')

  const propose = async () => {
    if (!form.city || !form.startDate || !form.endDate) return
    setBusy(true)
    try {
      await api.post('/travel', form)
      setForm({ city:'', country:'', startDate:'', endDate:'' })
      setShowForm(false)
      load()
    } catch (err) { alert(err.response?.data?.error || 'Erro.') }
    finally { setBusy(false) }
  }
  const approve = async (id) => {
    setBusy(true)
    try { await api.post(`/travel/${id}/approve`); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro.') }
    finally { setBusy(false) }
  }
  const cancel = async (id) => {
    setBusy(true)
    try { await api.delete(`/travel/${id}`); load() }
    finally { setBusy(false) }
  }

  if (loading) return null

  return (
    <div style={sectionStyle}>
      <div style={sectionTitle}>✈️ Travel Mode</div>
      <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        Ativar viagem em casal requer aprovação de todos os membros.
      </p>

      {current && (
        <div style={{ background:C.input, border:`1px solid ${C.border}`,
          borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:4 }}>
            {current.city}{current.country ? `, ${current.country}` : ''}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>
            {new Date(current.startDate).toLocaleDateString('pt-PT')} — {new Date(current.endDate).toLocaleDateString('pt-PT')}
            {' · '}
            {current.status === 'SCHEDULED' ? '✅ Ativo' : '⏳ A aguardar aprovação'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {current.status === 'WAITING_MEMBER_APPROVAL' && (
              <button onClick={() => approve(current.id)} disabled={busy}
                style={{ flex:1, background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                  border:'none', borderRadius:50, padding:10, fontSize:12,
                  fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
                Aprovar
              </button>
            )}
            <button onClick={() => cancel(current.id)} disabled={busy}
              style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:50, padding:10, fontSize:12, color:C.muted, cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!current && !showForm && (
        <button onClick={() => setShowForm(true)} style={{ width:'100%', background:C.input,
          border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13,
          color:C.text2, cursor:'pointer' }}>
          + Propor viagem
        </button>
      )}

      {showForm && (
        <div>
          <input style={inputStyle} placeholder="Cidade" value={form.city}
            onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
          <input style={inputStyle} placeholder="País (opcional)" value={form.country}
            onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
          <input style={inputStyle} type="date" value={form.startDate}
            onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          <input style={inputStyle} type="date" value={form.endDate}
            onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, background:'transparent',
              border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13,
              color:C.muted, cursor:'pointer' }}>Cancelar</button>
            <button onClick={propose} disabled={busy} style={{ flex:2,
              background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:12, fontSize:13,
              fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>Propor</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Página principal de gestão do perfil de casal
export default function CouplePage() {
  const navigate = useNavigate()
  const [couple, setCouple] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('check') // check | create | manage
  const [form, setForm] = useState({ coupleDescription:'', partnerEmail:'' })
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [catalogIntentions, setCatalogIntentions] = useState([])
  const [sharedIntentions, setSharedIntentions] = useState([]) // slugs
  const [savingIntentions, setSavingIntentions] = useState(false)
  const [intentionsSaved, setIntentionsSaved] = useState(false)

  useEffect(() => {
    api.get('/couples/me')
      .then(res => { setCouple(res.data); setStep('manage') })
      .catch(() => setStep('create'))
      .finally(() => setLoading(false))

    Promise.all([
      api.get('/catalog/intentions').then(r => setCatalogIntentions(r.data.intentions || [])).catch(() => {}),
      api.get('/profiles/me').then(r => {
        setSharedIntentions((r.data.intentions || []).map(i => i.intention?.slug).filter(Boolean))
      }).catch(() => {}),
    ])
  }, [])

  const toggleSharedIntention = slug => {
    setSharedIntentions(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  const saveIntentions = async () => {
    setSavingIntentions(true)
    try {
      await api.put('/profiles/me', { intentions: sharedIntentions.map(slug => ({ slug, preference: 'YES' })) })
      setIntentionsSaved(true)
      setTimeout(() => setIntentionsSaved(false), 2000)
    } catch {
      // silencioso — o botão simplesmente não confirma
    } finally { setSavingIntentions(false) }
  }

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      const res = await api.post('/couples', form)
      setCouple(res.data.couple)
      setInviteUrl(res.data.inviteUrl)
      setStep('manage')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar perfil de casal.')
    } finally { setSaving(false) }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.primary, fontFamily:"'Playfair Display',serif",
        fontSize:20, fontStyle:'italic' }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background:'none', border:'none',
              color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
            fontWeight:700, color:C.text, flex:1 }}>Perfil de Casal</h1>
          <UserNotificationBell />
        </div>

        {step === 'create' && (
          <div style={sectionStyle}>
            <div style={{ fontSize:48, textAlign:'center', marginBottom:16 }}>💑</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
              color:C.text, marginBottom:8, textAlign:'center' }}>
              Criar perfil de casal
            </h2>
            <p style={{ color:C.muted, fontSize:13, textAlign:'center',
              marginBottom:24, lineHeight:1.5 }}>
              Convida o/a teu/tua parceiro/a para explorarem juntos.
              Ambos têm de aprovar cada match.
            </p>

            {error && (
              <div style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
                padding:'12px 16px', marginBottom:16, color:'#F87171', fontSize:13 }}>
                {error}
              </div>
            )}

            <label style={{ display:'block', color:C.text2,
              fontSize:13, marginBottom:6 }}>
              Descrição do casal (opcional)
            </label>
            <textarea style={{ ...inputStyle, minHeight:80, resize:'none' }}
              placeholder="Quem somos e o que procuramos..."
              value={form.coupleDescription}
              onChange={e => setForm(p => ({ ...p, coupleDescription: e.target.value }))} />

            <label style={{ display:'block', color:C.text2,
              fontSize:13, marginBottom:6 }}>
              Email do/a parceiro/a (opcional)
            </label>
            <input style={inputStyle} type="email"
              placeholder="email@exemplo.com"
              value={form.partnerEmail}
              onChange={e => setForm(p => ({ ...p, partnerEmail: e.target.value }))} />

            <button onClick={handleCreate} disabled={saving}
              style={{ width:'100%',
                background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:14, fontSize:15,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                opacity: saving ? 0.7 : 1, fontFamily:'Inter,sans-serif' }}>
              {saving ? 'A criar...' : 'Criar perfil de casal →'}
            </button>
          </div>
        )}

        {step === 'manage' && (
          <>
            {/* Secção: Estado do casal */}
            <div style={{ ...sectionStyle, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💑</div>
              <div style={{ fontSize:14, color:C.text, fontWeight:600,
                marginBottom:4 }}>
                {couple?.coupleStatus === 'ACTIVE'
                  ? '✅ Casal ativo' : '⏳ A aguardar parceiro/a'}
              </div>
              {couple?.coupleDescription && (
                <p style={{ color:C.muted, fontSize:13,
                  lineHeight:1.5, marginTop:8 }}>
                  {couple.coupleDescription}
                </p>
              )}
            </div>

            {/* Secção: Convite */}
            {couple?.coupleStatus !== 'ACTIVE' && (
              <div style={sectionStyle}>
                <div style={sectionTitle}>🔗 Link de convite</div>
                <div style={{ background:C.input, borderRadius:12,
                  padding:'12px 14px', marginBottom:12, marginTop:8,
                  fontSize:12, color:C.muted, wordBreak:'break-all',
                  lineHeight:1.5 }}>
                  {inviteUrl || `${window.location.origin}/couple-invite/[token]`}
                </div>
                <button onClick={copyInvite}
                  style={{ width:'100%', background: copied
                    ? 'rgba(61,214,140,0.15)' : C.input,
                    border:`1px solid ${copied ? C.success : C.border}`,
                    borderRadius:12, padding:12, fontSize:13,
                    color: copied ? C.success : C.text2,
                    cursor:'pointer', transition:'all 0.2s',
                    fontFamily:'Inter,sans-serif' }}>
                  {copied ? '✓ Copiado!' : '📋 Copiar link de convite'}
                </button>
              </div>
            )}

            {/* Secção: Double Consent info */}
            {couple?.coupleStatus === 'ACTIVE' && (
              <div style={{ ...sectionStyle, background:'rgba(201,149,107,0.08)',
                border:'1px solid rgba(201,149,107,0.2)' }}>
                <div style={{ ...sectionTitle, color:C.primary }}>🤝 Double Consent Match</div>
                <p style={{ color:C.muted, fontSize:13, lineHeight:1.5 }}>
                  Nenhum match avança sem aprovação dos dois.
                  Quando alguém der like no vosso perfil, ambos recebem
                  notificação e têm de aprovar.
                </p>
              </div>
            )}

            {/* Secção: Matches pendentes de aprovação (6.6) */}
            {couple?.coupleStatus === 'ACTIVE' && <PendingMatchesSection />}

            {/* Secção: O que procuramos (intenções partilhadas) */}
            {couple?.coupleStatus === 'ACTIVE' && (
              <div style={sectionStyle}>
                <div style={sectionTitle}>🎯 O que procuramos</div>
                <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
                  Partilhado — qualquer um dos dois pode editar.
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                  {catalogIntentions.map(i => {
                    const selected = sharedIntentions.includes(i.slug)
                    return (
                      <button key={i.id} onClick={() => toggleSharedIntention(i.slug)} style={{
                        background: selected ? C.primaryDim : C.input,
                        border: `1px solid ${selected ? C.primary : C.border}`,
                        borderRadius: 20, padding: '7px 14px', fontSize: 12,
                        color: selected ? C.primary : C.text2, cursor: 'pointer',
                      }}>
                        {i.name}
                      </button>
                    )
                  })}
                </div>
                <button onClick={saveIntentions} disabled={savingIntentions} style={{
                  width: '100%',
                  background: intentionsSaved ? 'rgba(61,214,140,0.15)' : `linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                  border: intentionsSaved ? `1px solid ${C.success}` : 'none',
                  borderRadius: 50, padding: 12, fontSize: 14, fontWeight: 600,
                  color: intentionsSaved ? C.success : '#1A0A2E', cursor: 'pointer',
                }}>
                  {savingIntentions ? 'A guardar...' : intentionsSaved ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            )}

            {/* Secção: Modo Acordo (6.1-6.4) */}
            {couple?.coupleStatus === 'ACTIVE' && <AgreementSection />}

            {/* Secção: Travel Mode (6.7) */}
            {couple?.coupleStatus === 'ACTIVE' && <TravelSection />}

            <button onClick={() => navigate('/explore')}
              style={{ width:'100%',
                background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:14, fontSize:15,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                fontFamily:'Inter,sans-serif' }}>
              Explorar como casal →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
