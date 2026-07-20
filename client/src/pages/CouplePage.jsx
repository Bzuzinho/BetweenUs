import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import UserNotificationBell from '../components/UserNotificationBell'
import TravelModeSection from '../components/TravelModeSection'
import { AgreementSection, PendingMatchesSection } from '../components/CoupleConsentSections'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', input:'#0F1E26', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA',
  text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80', danger:'#F87171',
}

const inputStyle = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
  borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14,
  outline:'none', boxSizing:'border-box', marginBottom:12,
}
const sectionStyle = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }
const sectionTitle = { fontSize:14, color:C.text, fontWeight:600, marginBottom:4, display:'flex', alignItems:'center', gap:8 }

export default function CouplePage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [couple, setCouple] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('check')
  const [form, setForm] = useState({ coupleDescription:'', partnerEmail:'' })
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [catalogIntentions, setCatalogIntentions] = useState([])
  const [sharedIntentions, setSharedIntentions] = useState([])
  const [savingIntentions, setSavingIntentions] = useState(false)
  const [intentionsSaved, setIntentionsSaved] = useState(false)

  useEffect(() => {
    api.get('/couples/me')
      .then(response => { setCouple(response.data); setStep('manage') })
      .catch(() => setStep('create'))
      .finally(() => setLoading(false))

    Promise.all([
      api.get('/catalog/intentions').then(response => setCatalogIntentions(response.data.intentions || [])).catch(() => {}),
      api.get('/profiles/me').then(response => setSharedIntentions((response.data.intentions || []).map(item => item.intention?.slug).filter(Boolean))).catch(() => {}),
    ])
  }, [])

  const toggleIntention = slug => setSharedIntentions(previous => previous.includes(slug) ? previous.filter(item => item !== slug) : [...previous, slug])

  const saveIntentions = async () => {
    setSavingIntentions(true)
    setError('')
    try {
      await api.put('/profiles/me', { intentions:sharedIntentions.map(slug => ({ slug, preference:'YES' })) })
      setIntentionsSaved(true)
      setTimeout(() => setIntentionsSaved(false), 2000)
    } catch {
      setError(t('couple.saveError'))
    } finally { setSavingIntentions(false) }
  }

  const createCouple = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await api.post('/couples', form)
      setCouple(response.data.couple)
      setInviteUrl(response.data.inviteUrl || '')
      setStep('manage')
    } catch {
      setError(t('couple.createError'))
    } finally { setSaving(false) }
  }

  const copyInvite = async () => {
    setError('')
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('couple.copyError'))
    }
  }

  if (loading) return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:C.primary, fontSize:20 }}>{t('couple.loading')}</div></div>

  const active = couple?.coupleStatus === 'ACTIVE'

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button aria-label={t('profileForm.back')} onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer', minWidth:44, minHeight:44 }}>←</button>
        <h1 style={{ fontSize:24, fontWeight:700, color:C.text, flex:1 }}>{t('couple.title')}</h1>
        <UserNotificationBell />
      </div>

      {error && <div style={{ background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.25)', borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:13 }}>{error}</div>}

      {step === 'create' && <div style={sectionStyle}>
        <div style={{ fontSize:48, textAlign:'center', marginBottom:16 }}>💑</div>
        <h2 style={{ fontSize:20, color:C.text, marginBottom:8, textAlign:'center' }}>{t('couple.createTitle')}</h2>
        <p style={{ color:C.muted, fontSize:13, textAlign:'center', marginBottom:24, lineHeight:1.5 }}>{t('couple.createHelp')}</p>
        <label style={{ display:'block', color:C.text2, fontSize:13, marginBottom:6 }}>{t('couple.description')}</label>
        <textarea style={{ ...inputStyle, minHeight:80, resize:'none' }} placeholder={t('couple.descriptionPlaceholder')} value={form.coupleDescription} onChange={event => setForm(previous => ({ ...previous, coupleDescription:event.target.value }))} />
        <label style={{ display:'block', color:C.text2, fontSize:13, marginBottom:6 }}>{t('couple.partnerEmail')}</label>
        <input style={inputStyle} type="email" placeholder="email@example.com" value={form.partnerEmail} onChange={event => setForm(previous => ({ ...previous, partnerEmail:event.target.value }))} />
        <button onClick={createCouple} disabled={saving} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer', opacity:saving ? .7 : 1 }}>{saving ? t('couple.creating') : t('couple.create')}</button>
      </div>}

      {step === 'manage' && <>
        <div style={{ ...sectionStyle, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💑</div>
          <div style={{ fontSize:14, color:C.text, fontWeight:600, marginBottom:4 }}>{active ? `✅ ${t('couple.active')}` : `⏳ ${t('couple.waitingPartner')}`}</div>
          {couple?.coupleDescription && <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginTop:8 }}>{couple.coupleDescription}</p>}
        </div>

        {!active && <div style={sectionStyle}>
          <div style={sectionTitle}>🔗 {t('couple.inviteLink')}</div>
          <div style={{ background:C.input, borderRadius:12, padding:'12px 14px', margin:'8px 0 12px', fontSize:12, color:C.muted, wordBreak:'break-all', lineHeight:1.5 }}>{inviteUrl || `${window.location.origin}/couple-invite/[token]`}</div>
          <button onClick={copyInvite} disabled={!inviteUrl} style={{ width:'100%', background:copied ? 'rgba(74,222,128,.12)' : C.input, border:`1px solid ${copied ? C.success : C.border}`, borderRadius:12, padding:12, fontSize:13, color:copied ? C.success : C.text2, cursor:inviteUrl ? 'pointer' : 'not-allowed', opacity:inviteUrl ? 1 : .6 }}>{copied ? `✓ ${t('couple.copied')}` : `📋 ${t('couple.copyInvite')}`}</button>
        </div>}

        {active && <>
          <div style={{ ...sectionStyle, background:'rgba(184,167,255,.08)', border:'1px solid rgba(184,167,255,.2)' }}>
            <div style={{ ...sectionTitle, color:C.primary }}>🤝 {t('couple.doubleConsent')}</div>
            <p style={{ color:C.muted, fontSize:13, lineHeight:1.5 }}>{t('couple.doubleConsentHelp')}</p>
          </div>

          <PendingMatchesSection />

          <div style={sectionStyle}>
            <div style={sectionTitle}>🎯 {t('couple.lookingFor')}</div>
            <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>{t('couple.sharedHelp')}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>{catalogIntentions.map(item => {
              const selected = sharedIntentions.includes(item.slug)
              return <button key={item.id} type="button" onClick={() => toggleIntention(item.slug)} style={{ background:selected ? C.primaryDim : C.input, border:`1px solid ${selected ? C.primary : C.border}`, borderRadius:20, padding:'7px 14px', fontSize:12, color:selected ? C.primary : C.text2, cursor:'pointer' }}>{item.name}</button>
            })}</div>
            <button onClick={saveIntentions} disabled={savingIntentions} style={{ width:'100%', background:intentionsSaved ? 'rgba(74,222,128,.12)' : C.primary, border:intentionsSaved ? `1px solid ${C.success}` : 'none', borderRadius:50, padding:12, fontSize:14, fontWeight:600, color:intentionsSaved ? C.success : '#1A0A2E', cursor:'pointer', opacity:savingIntentions ? .7 : 1 }}>{savingIntentions ? t('couple.saving') : intentionsSaved ? `✓ ${t('couple.saved')}` : t('couple.save')}</button>
          </div>

          <AgreementSection />
          <TravelModeSection helperText={t('couple.travelHelp')} />
        </>}

        <button onClick={() => navigate('/explore')} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>{t('couple.explore')}</button>
      </>}
    </div>
  </div>
}
