import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

// ─── Join via token (link de email) ──────────────────────────────────────────
export function CoupleJoinPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) return
    api.post(`/couples/join/${token}`)
      .then(r => { setStatus('success'); setMsg(r.data.message) })
      .catch(e => { setStatus('error'); setMsg(e.response?.data?.error || 'Erro ao aceitar convite.') })
  }, [token])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30,
          fontStyle: 'italic', marginBottom: 24,
          background: `linear-gradient(135deg,${C.primary},${C.primaryDim})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Between Us
        </div>

        {status === 'loading' && (
          <div style={{ color: C.text2, fontSize: 15 }}>A processar convite...</div>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💑</div>
            <div style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Vínculo de casal ativo!
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>{msg}</div>
            <button onClick={() => navigate('/profile')}
              style={{ width: '100%', background: `linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border: 'none', borderRadius: 50, padding: '14px', fontSize: 14,
                fontWeight: 700, color: '#1A0A2E', cursor: 'pointer' }}>
              Ver perfil de casal →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
            <div style={{ color: colors.red, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Convite inválido
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>{msg}</div>
            <button onClick={() => navigate('/')}
              style={{ width: '100%', background: 'none', border: `1px solid ${C.border}`,
                borderRadius: 50, padding: '14px', fontSize: 14, color: C.text2, cursor: 'pointer' }}>
              Ir para início
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Página principal: gerir ou criar vínculo de casal ───────────────────────
export default function CoupleLinkPage() {
  const navigate = useNavigate()
  const [couple, setCouple] = useState(null)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Pesquisa de parceiro
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)

  // Formulário
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [coupleRes, pendingRes] = await Promise.allSettled([
        api.get('/couples/me'),
        api.get('/couples/pending')
      ])
      if (coupleRes.status === 'fulfilled') setCouple(coupleRes.value.data)
      if (pendingRes.status === 'fulfilled') setPending(pendingRes.value.data.pending || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Pesquisa de perfis com debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await api.get(`/couples/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(r.data.profiles || [])
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const handleLink = async () => {
    if (!selectedPartner) return
    setSubmitting(true)
    setError('')
    try {
      const r = await api.post('/couples', {
        partnerProfileId: selectedPartner.id,
        coupleDescription: description || undefined
      })
      setMsg(r.data.message)
      setSelectedPartner(null)
      setSearchQuery('')
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao enviar pedido.')
    } finally { setSubmitting(false) }
  }

  const handleAccept = async (id) => {
    try {
      const r = await api.post(`/couples/${id}/accept`)
      setMsg(r.data.message)
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao aceitar.')
    }
  }

  const handleReject = async (id) => {
    try {
      await api.post(`/couples/${id}/reject`)
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao recusar.')
    }
  }

  const handleDissolve = async () => {
    if (!window.confirm('Tens a certeza que queres dissolver o vínculo de casal?')) return
    try {
      await api.delete('/couples/me')
      setCouple(null)
      setMsg('Vínculo dissolvido.')
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao dissolver.')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.primary, fontFamily: "'Playfair Display',serif",
        fontSize: 20, fontStyle: 'italic' }}>A carregar...</div>
    </div>
  )

  const statusBadge = { ACTIVE: [C.success, 'Ativo'], PENDING_PARTNER: [C.primary, 'Aguarda aceitação'], SEPARATED: [C.muted, 'Separados'] }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '60px 20px 40px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background: 'none', border: 'none', color: C.text2, fontSize: 20, cursor: 'pointer' }}>←</button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700,
            background: `linear-gradient(135deg,${C.primary},${C.primaryDim})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            💑 Perfil de Casal
          </h1>
        </div>

        {/* Feedback */}
        {msg && (
          <div style={{ background: 'rgba(61,214,140,0.1)', border: `1px solid ${C.success}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: C.success, fontSize: 13 }}>
            {msg}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(224,92,122,0.1)', border: `1px solid ${colors.red}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: colors.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Pedidos pendentes para mim aceitar */}
        {pending.length > 0 && (
          <div style={{ background: `rgba(201,149,107,0.08)`, border: `1px solid rgba(201,149,107,0.3)`,
            borderRadius: 20, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 14 }}>
              🔔 Pedidos de vínculo pendentes
            </div>
            {pending.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 18, overflow: 'hidden' }}>
                  {p.profile?.photos?.[0]
                    ? <img src={p.profile.photos[0].storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>
                    {p.profile?.displayName || 'Utilizador'}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11 }}>
                    {p.profile?.city || ''} · quer vincular-se contigo como casal
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleAccept(p.id)}
                    style={{ background: C.success, border: 'none', borderRadius: 50,
                      padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#0A141A', cursor: 'pointer' }}>
                    Aceitar
                  </button>
                  <button onClick={() => handleReject(p.id)}
                    style={{ background: 'none', border: `1px solid ${colors.red}`, borderRadius: 50,
                      padding: '6px 14px', fontSize: 12, color: colors.red, cursor: 'pointer' }}>
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Casal ativo */}
        {couple && couple.coupleStatus !== 'SEPARATED' ? (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 24, padding: 24, marginBottom: 16 }}>

            {/* Status badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `rgba(${couple.coupleStatus === 'ACTIVE' ? '61,214,140' : '201,149,107'},0.1)`,
              border: `1px solid ${statusBadge[couple.coupleStatus]?.[0] || C.muted}`,
              borderRadius: 50, padding: '4px 12px', fontSize: 11,
              color: statusBadge[couple.coupleStatus]?.[0] || C.muted, marginBottom: 16, fontWeight: 600 }}>
              <span>{couple.coupleStatus === 'ACTIVE' ? '●' : '○'}</span>
              {statusBadge[couple.coupleStatus]?.[1] || couple.coupleStatus}
            </div>

            {/* Parceiro info */}
            {couple.partnerInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
                  {couple.partnerInfo.photos?.[0]
                    ? <img src={couple.partnerInfo.photos[0].storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👤'}
                </div>
                <div>
                  <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>
                    {couple.partnerInfo.displayName}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{couple.partnerInfo.city}</div>
                </div>
              </div>
            ) : couple.partnerTwoInviteEmail ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Convite enviado para:</div>
                <div style={{ color: C.text2, fontSize: 14 }}>{couple.partnerTwoInviteEmail}</div>
              </div>
            ) : null}

            {/* Descrição */}
            {couple.coupleDescription && (
              <div style={{ color: C.text2, fontSize: 13, lineHeight: 1.6,
                fontStyle: 'italic', marginBottom: 20 }}>
                "{couple.coupleDescription}"
              </div>
            )}

            {/* Premium info se ativo */}
            {couple.coupleStatus === 'ACTIVE' && (
              <div style={{ background: `rgba(184,169,212,0.08)`, border: `1px solid rgba(184,169,212,0.2)`,
                borderRadius: 14, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                  💳 Para ativar todos os benefícios de casal, subscreve o plano{' '}
                  <span style={{ color: C.primary, fontWeight: 600 }}>Between Casal (€9,99/mês)</span>
                  {' '}— um pagamento cobre ambos os perfis.
                </div>
                <button onClick={() => navigate('/premium')}
                  style={{ marginTop: 10, width: '100%',
                    background: `linear-gradient(135deg,${C.text2},${C.primaryDim})`,
                    border: 'none', borderRadius: 50, padding: '10px', fontSize: 12,
                    fontWeight: 700, color: '#0A141A', cursor: 'pointer' }}>
                  Ver plano Casal →
                </button>
              </div>
            )}

            {/* Dissolve */}
            <button onClick={handleDissolve}
              style={{ width: '100%', background: 'none', border: `1px solid rgba(224,92,122,0.3)`,
                borderRadius: 50, padding: '11px', fontSize: 13, color: colors.red, cursor: 'pointer' }}>
              Dissolver vínculo de casal
            </button>
          </div>
        ) : (
          /* Formulário para criar novo vínculo */
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 24, padding: 24 }}>

            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700,
              color: C.text, marginBottom: 8 }}>
              Vincular perfis como casal
            </div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
              Procura o perfil do teu parceiro/a e envia um pedido de vínculo. A outra pessoa terá de aceitar.
            </div>

            {/* Pesquisa */}
            {!selectedPartner ? (
              <>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Procurar perfil por nome..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', background: C.bgInput,
                      border: `1px solid ${C.border}`, borderRadius: 14,
                      padding: '13px 16px', fontSize: 14, color: C.text,
                      fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {searching && (
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      color: C.muted, fontSize: 12 }}>●</div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div style={{ background: C.bgInput, border: `1px solid ${C.border}`,
                    borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                    {searchResults.map((p, i) => (
                      <button key={p.id} onClick={() => { setSelectedPartner(p); setSearchQuery(''); setSearchResults([]) }}
                        style={{ width: '100%', background: 'none', border: 'none',
                          borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
                          padding: '12px 16px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: 12, textAlign: 'left' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.border,
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, overflow: 'hidden' }}>
                          {p.photos?.[0]
                            ? <img src={p.photos[0].storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '👤'}
                        </div>
                        <div>
                          <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                            {p.displayName}
                          </div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{p.city}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
                    Nenhum perfil encontrado para "{searchQuery}"
                  </div>
                )}

                {/* Alternativa: convidar por email */}
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, margin: '16px 0' }}>
                  — ou —
                </div>
                <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                  O teu parceiro/a ainda não tem perfil? Partilha-lhe o link da plataforma e depois volta aqui para vincular.
                </div>
              </>
            ) : (
              /* Parceiro selecionado */
              <>
                <div style={{ background: `rgba(61,214,140,0.08)`, border: `1px solid rgba(61,214,140,0.25)`,
                  borderRadius: 14, padding: '12px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 24 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.success, fontSize: 13, fontWeight: 700 }}>
                      {selectedPartner.displayName}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{selectedPartner.city}</div>
                  </div>
                  <button onClick={() => setSelectedPartner(null)}
                    style={{ background: 'none', border: 'none', color: C.muted,
                      cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>

                <textarea
                  placeholder="Descrição do casal (opcional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', background: C.bgInput,
                    border: `1px solid ${C.border}`, borderRadius: 14,
                    padding: '13px 16px', fontSize: 13, color: C.text,
                    fontFamily: 'Inter,sans-serif', outline: 'none',
                    resize: 'none', marginBottom: 16, boxSizing: 'border-box' }}
                />

                <button onClick={handleLink} disabled={submitting}
                  style={{ width: '100%',
                    background: `linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                    border: 'none', borderRadius: 50, padding: '15px', fontSize: 15,
                    fontWeight: 700, color: '#1A0A2E', cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'A enviar pedido...' : `💑 Enviar pedido a ${selectedPartner.displayName}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
