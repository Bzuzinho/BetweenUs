import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

const PLANS = [
  {
    id: 'PREMIUM',
    name: 'Between Premium',
    price: '€4,99',
    period: '/mês',
    icon: '✦',
    color: C.primary,
    badge: null,
    features: [
      '👁 Modo Invisível — navega sem seres visto',
      '✈️ Travel Mode — explora antes de chegar',
      '❤️ Ver quem deu like em ti',
      '🔒 Bloqueio de contactos',
      '📷 Soft Reveal avançado',
      '🔍 Filtros premium',
      '✅ Verificação de perfil',
    ]
  },
  {
    id: 'COUPLE_PREMIUM',
    name: 'Between Casal',
    price: '€9,99',
    period: '/mês',
    icon: '💑',
    color: C.text2,
    badge: 'Dois perfis, um preço',
    features: [
      '✨ Tudo do Premium para os dois',
      '🤝 Double Consent Match completo',
      '📋 Modo Acordo avançado',
      '🏠 Sala Privada partilhada',
      '💑 Vincular dois perfis como casal',
      '💳 Um pagamento cobre ambos os parceiros',
    ]
  }
]

export default function PremiumPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get('/subscriptions/me')
      .then(r => setSub(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

    if (params.get('success')) setMsg('✅ Subscrição ativada! Bem-vindo/a ao Premium.')
    if (params.get('cancelled')) setMsg('Pagamento cancelado. Podes tentar novamente.')
  }, [])

  const handleCheckout = async (planId) => {
    setCheckingOut(planId)
    try {
      const res = await api.post('/subscriptions/checkout', { plan: planId })
      if (res.data.checkoutUrl) {
        // Stripe checkout — redirect
        window.location.href = res.data.checkoutUrl
      } else {
        // Dev mode — direct upgrade
        const subRes = await api.get('/subscriptions/me')
        setSub(subRes.data)
        setMsg('✅ Premium ativado! (modo de teste)')
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erro ao iniciar pagamento.')
    } finally { setCheckingOut(null) }
  }

  const handlePortal = async () => {
    try {
      const res = await api.post('/subscriptions/portal')
      window.location.href = res.data.url
    } catch (err) {
      setMsg(err.response?.data?.error || 'Portal não disponível.')
    }
  }

  const isPremium = sub?.plan && sub.plan !== 'FREE' && sub.status === 'ACTIVE'

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
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
            fontWeight:700,
            background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            ✦ Between Premium
          </h1>
        </div>

        {/* Feedback */}
        {msg && (
          <div style={{ background: msg.startsWith('✅')
            ? 'rgba(61,214,140,0.1)' : 'rgba(201,149,107,0.1)',
            border: `1px solid ${msg.startsWith('✅') ? C.success : C.primary}`,
            borderRadius:12, padding:'12px 16px', marginBottom:20,
            color: msg.startsWith('✅') ? C.success : C.primary,
            fontSize:13 }}>{msg}</div>
        )}

        {/* Active subscription */}
        {isPremium && (
          <div style={{ background:'rgba(61,214,140,0.08)',
            border:`1px solid ${C.success}`, borderRadius:20,
            padding:20, marginBottom:24, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
              color:C.text, marginBottom:4 }}>
              {sub.plan === 'COUPLE_PREMIUM' ? 'Between Casal' : 'Between Premium'} ativo
            </div>
            {sub.currentPeriodEnd && (
              <div style={{ color:C.muted, fontSize:12, marginBottom:16 }}>
                Renova em {new Date(sub.currentPeriodEnd).toLocaleDateString('pt')}
              </div>
            )}
            <button onClick={handlePortal}
              style={{ background:'none', border:`1px solid ${C.border}`,
                borderRadius:50, padding:'10px 24px', color:C.text2,
                cursor:'pointer', fontSize:13, fontFamily:'Inter,sans-serif' }}>
              Gerir subscrição →
            </button>
          </div>
        )}

        {/* Plans */}
        {!isPremium && PLANS.map(plan => (
          <div key={plan.id} style={{ background:C.bgCard,
            border:`1px solid ${C.border}`, borderRadius:24,
            padding:24, marginBottom:16 }}>

            {/* Badge */}
            {plan.badge && (
              <div style={{ display:'inline-block', background:`rgba(184,169,212,0.15)`,
                border:`1px solid rgba(184,169,212,0.3)`, borderRadius:50,
                padding:'4px 12px', fontSize:11, color:C.text2,
                marginBottom:12, fontWeight:600 }}>
                {plan.badge}
              </div>
            )}

            {/* Plan header */}
            <div style={{ display:'flex', alignItems:'flex-start',
              justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:28, marginBottom:4 }}>{plan.icon}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
                  fontWeight:700, color:C.text }}>{plan.name}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:28, fontWeight:700, color:plan.color }}>
                  {plan.price}
                </div>
                <div style={{ fontSize:12, color:C.muted }}>{plan.period}</div>
              </div>
            </div>

            {/* Features */}
            <div style={{ display:'flex', flexDirection:'column',
              gap:8, marginBottom:20 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ fontSize:13, color:C.text2,
                  display:'flex', alignItems:'flex-start', gap:8 }}>
                  <span style={{ color:C.success, flexShrink:0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={checkingOut === plan.id}
              style={{ width:'100%',
                background: plan.id === 'PREMIUM'
                  ? `linear-gradient(135deg,${C.primary},${C.primaryDim})`
                  : `linear-gradient(135deg,${colors.lavender},${C.text2})`,
                border:'none', borderRadius:50, padding:'15px',
                fontSize:15, fontWeight:700,
                color: plan.id === 'PREMIUM' ? '#1A0A2E' : '#0A141A',
                cursor: checkingOut ? 'not-allowed' : 'pointer',
                opacity: checkingOut === plan.id ? 0.7 : 1,
                fontFamily:'Inter,sans-serif', transition:'all 0.2s' }}>
              {checkingOut === plan.id
                ? 'A processar...'
                : `Subscrever ${plan.name} — ${plan.price}/mês`}
            </button>
          </div>
        ))}

        {/* Security note */}
        <div style={{ textAlign:'center', padding:'0 16px' }}>
          <p style={{ color:C.muted, fontSize:11, lineHeight:1.6 }}>
            🔒 Pagamento seguro via Stripe.<br/>
            Podes cancelar a qualquer momento.<br/>
            O nome "Between Us" não aparece no extrato bancário.
          </p>
        </div>
      </div>
    </div>
  )
}
