import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import LocationAutocomplete from '../components/LocationAutocomplete'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', card:'#102129', input:'#0F1E26', plum:'#1E3340',
  accent:'#B8A7FF', rose:'#9B8EE0', lavLight:'#AAB6C2', white:'#F5F7FA', muted:'#7E8FA3'
}

const RELATIONSHIP_VALUES = ['SINGLE','COMMITTED','MARRIED','OPEN','POLYAMOROUS','COUPLE_CURIOUS','COUPLE_LIBERAL','OTHER']
const DISCRETION_VALUES = ['MAXIMUM','SELECTIVE','OPEN']

const inputStyle = {
  width:'100%', background:C.input, border:`1.5px solid ${C.plum}`, borderRadius:14,
  padding:'13px 16px', color:C.white, fontSize:15, fontFamily:'Inter,sans-serif',
  boxSizing:'border-box', marginBottom:12, WebkitAppearance:'none', outline:'none'
}

export default function CreateProfilePage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { t } = useI18n()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    displayName:'', bio:'', gender:'', orientation:'', relationshipStatus:'SINGLE',
    discretionLevel:'SELECTIVE', countryCode:'PT', homeLocationId:null,
    homeLocationLabel:null, customLocality:'', intentions:[]
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [catalogIntentions, setCatalogIntentions] = useState([])
  const [catalogBoundaries, setCatalogBoundaries] = useState([])
  const [catalogGenders, setCatalogGenders] = useState([])
  const [catalogOrientations, setCatalogOrientations] = useState([])
  const [boundaryPrefs, setBoundaryPrefs] = useState({})
  const [draftLoaded, setDraftLoaded] = useState(false)

  useEffect(() => {
    api.get('/catalog/intentions').then(r => setCatalogIntentions(r.data.intentions || [])).catch(() => {})
    api.get('/catalog/boundaries').then(r => setCatalogBoundaries(r.data.boundaries || [])).catch(() => {})
    api.get('/catalog/genders').then(r => setCatalogGenders(r.data.genders || [])).catch(() => {})
    api.get('/catalog/orientations').then(r => setCatalogOrientations(r.data.orientations || [])).catch(() => {})
    api.get('/profiles/onboarding/progress').then(r => {
      const progress = r.data.progress
      if (progress?.data) {
        if (progress.data.form) setForm(previous => ({ ...previous, ...progress.data.form }))
        if (progress.data.boundaryPrefs) setBoundaryPrefs(progress.data.boundaryPrefs)
        if (progress.step) setStep(progress.step)
      }
    }).catch(() => {}).finally(() => setDraftLoaded(true))
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    api.put('/profiles/onboarding/progress', { step, data:{ form, boundaryPrefs } }).catch(() => {})
  }, [step, draftLoaded])

  const set = (key, value) => setForm(previous => ({ ...previous, [key]:value }))
  const setBoundaryPref = (boundaryId, preference) => setBoundaryPrefs(previous => ({ ...previous, [boundaryId]:preference }))
  const toggleIntention = slug => setForm(previous => ({
    ...previous,
    intentions: previous.intentions.includes(slug)
      ? previous.intentions.filter(item => item !== slug)
      : [...previous.intentions, slug]
  }))

  const submit = async () => {
    if (!form.displayName.trim()) return setError(t('profileForm.displayNameRequired'))
    if (!form.intentions.length) return setError(t('profileForm.intentionRequired'))
    setLoading(true)
    setError('')
    try {
      await api.post('/profiles', {
        displayName:form.displayName.trim(), bio:form.bio.trim() || undefined,
        gender:form.gender || undefined, orientation:form.orientation || undefined,
        relationshipStatus:form.relationshipStatus,
        homeLocationId:form.homeLocationId || undefined,
        customLocality:form.customLocality.trim() || undefined,
        discretionLevel:form.discretionLevel,
        intentions:form.intentions.map(slug => ({ slug, preference:'YES' }))
      })
      const boundaries = Object.entries(boundaryPrefs)
      if (boundaries.length) {
        await api.put('/profiles/me/boundaries', {
          boundaries:boundaries.map(([boundaryId, preference]) => ({ boundaryId, preference }))
        }).catch(() => {})
      }
      await refreshUser()
      navigate('/explore', { replace:true })
    } catch {
      setError(t('profileForm.createError'))
    } finally {
      setLoading(false)
    }
  }

  const primary = { background:`linear-gradient(135deg,${C.accent},${C.rose})`, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:700, color:'#1A0A2E', cursor:'pointer', minHeight:50 }
  const secondary = { background:'none', border:`1px solid ${C.plum}`, borderRadius:50, padding:14, color:C.muted, cursor:'pointer', minHeight:50 }

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'calc(48px + env(safe-area-inset-top)) 20px calc(40px + env(safe-area-inset-bottom))' }}>
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontStyle:'italic', color:C.accent, margin:'0 0 6px' }}>{t('profileForm.title')}</h1>
        <p style={{ color:C.muted, fontSize:13 }}>{t('profileForm.step')} {step} {t('profileForm.of')} 4</p>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:24 }}>{[1,2,3,4].map(value => <div key={value} style={{ flex:1, height:3, borderRadius:2, background:step>=value?C.accent:C.plum }}/>)}</div>
      {error && <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.3)', borderRadius:12, padding:'12px 16px', marginBottom:16, color:'#F87171', fontSize:14 }}>{error}</div>}
      <div style={{ background:C.card, border:`1px solid ${C.plum}`, borderRadius:24, padding:24 }}>
        {step===1 && <>
          <h2 style={{ color:C.white, fontSize:20, marginTop:0 }}>{t('profileForm.who')}</h2>
          <input style={inputStyle} placeholder={t('profileForm.displayName')} value={form.displayName} onChange={event => set('displayName', event.target.value)}/>
          <textarea style={{ ...inputStyle, minHeight:80, resize:'none' }} placeholder={t('profileForm.bio')} value={form.bio} onChange={event => set('bio', event.target.value)}/>
          <select style={inputStyle} value={form.relationshipStatus} onChange={event => set('relationshipStatus', event.target.value)}>{RELATIONSHIP_VALUES.map(value => <option key={value} value={value}>{t(`profileForm.relationships.${value}`)}</option>)}</select>
          <select style={inputStyle} value={form.gender} onChange={event => set('gender', event.target.value)}><option value="">{t('profileForm.gender')}</option>{catalogGenders.map(item => <option key={item.id} value={item.slug}>{item.label}</option>)}</select>
          <select style={inputStyle} value={form.orientation} onChange={event => set('orientation', event.target.value)}><option value="">{t('profileForm.orientation')}</option>{catalogOrientations.map(item => <option key={item.id} value={item.slug}>{item.label}</option>)}</select>
          <LocationAutocomplete countryCode={form.countryCode} onCountryChange={code => set('countryCode', code)} locationId={form.homeLocationId} locationLabel={form.homeLocationLabel} onSelectLocation={location => setForm(previous => ({ ...previous, homeLocationId:location?.id || null, homeLocationLabel:location?.label || null, countryCode:location?.countryCode || previous.countryCode }))} customLocality={form.customLocality} onCustomLocalityChange={value => set('customLocality', value)} label={t('profileForm.homeLocation')} required={false}/>
          <button style={{ ...primary, width:'100%' }} onClick={() => { if (!form.displayName.trim()) return setError(t('profileForm.displayNameRequired')); setError(''); setStep(2) }}>{t('profileForm.continue')}</button>
        </>}

        {step===2 && <>
          <h2 style={{ color:C.white, fontSize:20, margin:'0 0 6px' }}>{t('profileForm.lookingFor')}</h2>
          <p style={{ color:C.muted, fontSize:13, marginBottom:18 }}>{t('profileForm.multiSelect')}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>{catalogIntentions.map(item => { const selected=form.intentions.includes(item.slug); return <button key={item.id} type="button" onClick={() => toggleIntention(item.slug)} style={{ background:selected?C.accent:C.input, border:`1px solid ${selected?C.accent:C.plum}`, borderRadius:14, padding:12, color:selected?'#0A141A':C.lavLight }}>{item.name}</button> })}</div>
          <div style={{ display:'flex', gap:10 }}><button style={{ ...secondary, flex:1 }} onClick={() => { setError(''); setStep(1) }}>{t('profileForm.back')}</button><button style={{ ...primary, flex:2 }} onClick={() => { if (!form.intentions.length) return setError(t('profileForm.intentionRequired')); setError(''); setStep(3) }}>{t('profileForm.continue')}</button></div>
        </>}

        {step===3 && <>
          <h2 style={{ color:C.white, fontSize:20, margin:'0 0 6px' }}>{t('profileForm.discretionTitle')}</h2>
          <p style={{ color:C.muted, fontSize:13, marginBottom:18 }}>{t('profileForm.discretionHelp')}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>{DISCRETION_VALUES.map(value => { const selected=form.discretionLevel===value; return <button key={value} type="button" onClick={() => set('discretionLevel', value)} style={{ background:selected?C.accent:C.input, border:`1px solid ${selected?C.accent:C.plum}`, borderRadius:14, padding:'14px 16px', textAlign:'left', color:selected?'#0A141A':C.white }}><div style={{ fontWeight:600 }}>{t(`profileForm.discretion.${value}.label`)}</div><div style={{ fontSize:13, opacity:.8 }}>{t(`profileForm.discretion.${value}.desc`)}</div></button> })}</div>
          <div style={{ display:'flex', gap:10 }}><button style={{ ...secondary, flex:1 }} onClick={() => setStep(2)}>{t('profileForm.back')}</button><button style={{ ...primary, flex:2 }} onClick={() => setStep(4)}>{t('profileForm.continue')}</button></div>
        </>}

        {step===4 && <>
          <h2 style={{ color:C.white, fontSize:20, margin:'0 0 6px' }}>{t('profileForm.limitsTitle')}</h2>
          <p style={{ color:C.muted, fontSize:13, marginBottom:18, lineHeight:1.5 }}>{t('profileForm.limitsHelp')}</p>
          <div style={{ marginBottom:24, maxHeight:360, overflowY:'auto' }}>{Object.entries(catalogBoundaries.reduce((groups, boundary) => { (groups[boundary.category] ||= []).push(boundary); return groups }, {})).map(([category, items]) => <div key={category} style={{ marginBottom:14 }}><div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:6 }}>{category.replace(/_/g, ' ')}</div>{items.map(boundary => <div key={boundary.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'8px 0', borderBottom:`1px solid ${C.plum}` }}><span style={{ fontSize:13, color:C.white }}>{boundary.name}</span><div style={{ display:'flex', gap:5 }}>{['NO','MAYBE','YES'].map(preference => <button key={preference} type="button" onClick={() => setBoundaryPref(boundary.id, preference)} style={{ background:boundaryPrefs[boundary.id]===preference?C.accent:'transparent', border:`1px solid ${C.plum}`, borderRadius:8, padding:'4px 8px', color:boundaryPrefs[boundary.id]===preference?'#0A141A':C.muted }}>{t(`profileForm.${preference==='YES'?'yes':preference==='MAYBE'?'maybe':'no'}`)}</button>)}</div></div>)}</div>)}</div>
          <div style={{ display:'flex', gap:10 }}><button style={{ ...secondary, flex:1 }} onClick={() => setStep(3)}>{t('profileForm.back')}</button><button style={{ ...primary, flex:2, opacity:loading ? 0.7 : 1, cursor:loading ? 'not-allowed' : 'pointer' }} onClick={submit} disabled={loading}>{loading?t('profileForm.creating'):t('profileForm.create')}</button></div>
        </>}
      </div>
    </div>
  </div>
}
