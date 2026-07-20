import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80',
}

const PLAN_META = {
  PREMIUM: { price:'€4,99', icon:'✦', color:C.primary },
  COUPLE_PREMIUM: { price:'€9,99', icon:'💑', color:C.text2 },
}

export default function PremiumPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, formatDate } = useI18n()
  const [sub, setSub] = useState(null)
  const [planInfo, setPlanInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)
  const [msg, setMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {}),
      api.get('/subscriptions/plans').then(r => setPlanInfo(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))

    if (params.get('success')) { setMsg(t('premium.success')); setSuccessMsg(true) }
    if (params.get('cancelled')) { setMsg(t('premium.cancelled')); setSuccessMsg(false) }
  }, [params, t])

  const isEligible = planId => planInfo?.eligibility ? !!planInfo.eligibility[planId]?.allowed : true
  const ineligibleReason = planId => planInfo?.eligibility?.[planId]?.reason || null
  const visiblePlanIds = Object.keys(PLAN_META).filter(isEligible)
  const coupleContextButNotActive = planInfo?.activeContext?.type === 'INDIVIDUAL' && ineligibleReason('COUPLE_PREMIUM') === 'COUPLE_PROFILE_REQUIRED'

  const handleCheckout = async planId => {
    setCheckingOut(planId)
    setMsg('')
    try {
      const res = await api.post('/subscriptions/checkout', { plan:planId })
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl
      } else {
        const subRes = await api.get('/subscriptions/me')
        setSub(subRes.data)
        setMsg(t('premium.testActivated'))
        setSuccessMsg(true)
      }
    } catch {
      setMsg(t('premium.checkoutError'))
      setSuccessMsg(false)
    } finally {
      setCheckingOut(null)
    }
  }

  const handlePortal = async () => {
    try {
      const res = await api.post('/subscriptions/portal')
      window.location.href = res.data.url
    } catch {
      setMsg(t('premium.portalError'))
      setSuccessMsg(false)
    }
  }

  const isPremium = sub?.plan && sub.plan !== 'FREE' && sub.status === 'ACTIVE'
  const planName = id => t(`premium.plans.${id}.name`, id)

  if (loading) return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', color:C.primary }}>{t('premium.loading')}</div>

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:22, fontWeight:700, color:C.primary, margin:0 }}>✦ {t('premium.title')}</h1>
        </div>

        {msg && <div style={{ background:successMsg?'rgba(74,222,128,.1)':'rgba(184,167,255,.1)', border:`1px solid ${successMsg?C.success:C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:20, color:successMsg?C.success:C.primary, fontSize:13 }}>{msg}</div>}

        {isPremium && <div style={{ background:'rgba(74,222,128,.08)', border:`1px solid ${C.success}`, borderRadius:20, padding:20, marginBottom:24, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:20, color:C.text, marginBottom:4 }}>{planName(sub.plan)} {t('premium.active')}</div>
          {sub.currentPeriodEnd && <div style={{ color:C.muted, fontSize:12, marginBottom:16 }}>{t('premium.renews')} {formatDate(sub.currentPeriodEnd)}</div>}
          <button onClick={handlePortal} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:'10px 24px', color:C.text2, cursor:'pointer', fontSize:13 }}>{t('premium.manage')} →</button>
        </div>}

        {!isPremium && visiblePlanIds.map(planId => {
          const meta = PLAN_META[planId]
          const features = t(`premium.plans.${planId}.features`, [])
          const badge = t(`premium.plans.${planId}.badge`, null)
          return <div key={planId} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:24, marginBottom:16 }}>
            {badge && <div style={{ display:'inline-block', background:'rgba(184,167,255,.15)', border:'1px solid rgba(184,167,255,.3)', borderRadius:50, padding:'4px 12px', fontSize:11, color:C.text2, marginBottom:12, fontWeight:600 }}>{badge}</div>}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div><div style={{ fontSize:28 }}>{meta.icon}</div><div style={{ fontSize:20, fontWeight:700, color:C.text }}>{planName(planId)}</div></div>
              <div style={{ textAlign:'right' }}><div style={{ fontSize:28, fontWeight:700, color:meta.color }}>{meta.price}</div><div style={{ fontSize:12, color:C.muted }}>{t('premium.month')}</div></div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {features.map((feature, index) => <div key={index} style={{ fontSize:13, color:C.text2, display:'flex', gap:8 }}><span style={{ color:C.success }}>✓</span>{feature}</div>)}
            </div>
            <button onClick={() => handleCheckout(planId)} disabled={checkingOut===planId} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:15, fontSize:15, fontWeight:700, color:'#0A141A', opacity:checkingOut===planId?.7:1 }}>
              {checkingOut===planId ? t('premium.processing') : `${t('premium.subscribe')} ${planName(planId)} — ${meta.price}${t('premium.month')}`}
            </button>
          </div>
        })}

        {!isPremium && coupleContextButNotActive && <div style={{ color:C.muted, fontSize:12, lineHeight:1.6, textAlign:'center', marginBottom:18 }}>{t('premium.coupleRequired')}</div>}

        <div style={{ textAlign:'center', padding:'0 16px', color:C.muted, fontSize:11, lineHeight:1.7 }}>
          🔒 {t('premium.secure')}<br/>{t('premium.cancelAnytime')}<br/>{t('premium.discreetBilling')}
        </div>
      </div>
    </div>
  )
}
