import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import LocationAutocomplete from '../components/LocationAutocomplete'
import { useI18n } from '../i18n/I18nContext'
import { catalogLabel, intentionLabel } from '../i18n/catalogTranslations'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const INPUT = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12,
  padding:'13px 16px', color:C.text, fontSize:15, marginBottom:12, display:'block',
  WebkitAppearance:'none', outline:'none', boxSizing:'border-box',
}

const RELATIONSHIP_VALUES = ['SINGLE','COMMITTED','MARRIED','OPEN','POLYAMOROUS','COUPLE_CURIOUS','COUPLE_LIBERAL','OTHER']
const DISCRETION_VALUES = ['MAXIMUM','SELECTIVE','OPEN']
const LOCATION_VISIBILITY_VALUES = ['REFERENCE_LOCALITY','CUSTOM_LOCALITY','REGION_ONLY']

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { t, formatNumber } = useI18n()
  const [form, setForm] = useState(null)
  const [intentionSlugs, setIntentionSlugs] = useState([])
  const [catalogIntentions, setCatalogIntentions] = useState([])
  const [catalogBoundaries, setCatalogBoundaries] = useState([])
  const [catalogGenders, setCatalogGenders] = useState([])
  const [catalogOrientations, setCatalogOrientations] = useState([])
  const [boundaryPrefs, setBoundaryPrefs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [completeness, setCompleteness] = useState(null)

  useEffect(() => {
    api.get('/catalog/intentions').then(response => setCatalogIntentions(response.data.intentions || [])).catch(() => {})
    api.get('/catalog/boundaries').then(response => setCatalogBoundaries(response.data.boundaries || [])).catch(() => {})
    api.get('/catalog/genders').then(response => setCatalogGenders(response.data.genders || [])).catch(() => {})
    api.get('/catalog/orientations').then(response => setCatalogOrientations(response.data.orientations || [])).catch(() => {})
    api.get('/profiles/me').then(response => {
      const profile = response.data
      setForm({
        displayName:profile.displayName || '', bio:profile.bio || '', gender:profile.gender || '',
        orientation:profile.orientation || '', relationshipStatus:profile.relationshipStatus || 'SINGLE',
        discretionLevel:profile.discretionLevel || 'SELECTIVE', countryCode:profile.homeLocationCountryCode || 'PT',
        homeLocationId:profile.homeLocationId || null, homeLocationLabel:profile.homeLocationLabel || null,
        customLocality:profile.customLocality || '', locationVisibility:profile.locationVisibility || 'REFERENCE_LOCALITY',
      })
      setIntentionSlugs((profile.intentions || []).map(item => item.intention?.slug || item.slug).filter(Boolean))
      const boundaries = {}
      ;(profile.boundaries || []).forEach(item => { boundaries[item.boundaryId] = item.preference })
      setBoundaryPrefs(boundaries)
      setCompleteness(profile.completeness || null)
    }).catch(() => navigate('/create-profile')).finally(() => setLoading(false))
  }, [navigate])

  const set = (key, value) => setForm(previous => ({ ...previous, [key]:value }))
  const toggleIntention = slug => setIntentionSlugs(previous => previous.includes(slug) ? previous.filter(item => item !== slug) : [...previous, slug])
  const setBoundaryPref = (boundaryId, preference) => setBoundaryPrefs(previous => ({ ...previous, [boundaryId]:preference }))

  const save = async () => {
    if (!form.displayName.trim()) return setError(t('editProfile.displayNameRequired'))
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { countryCode, ...payload } = form
      await api.put('/profiles/me', {
        ...payload,
        intentions:intentionSlugs.map(slug => ({ slug, preference:'YES' })),
      })
      const boundaries = Object.entries(boundaryPrefs)
      if (boundaries.length) {
        await api.put('/profiles/me/boundaries', {
          boundaries:boundaries.map(([boundaryId, preference]) => ({ boundaryId, preference })),
        })
      }
      setMessage(t('editProfile.updated'))
      setTimeout(() => navigate('/profile'), 1200)
    } catch (requestError) {
      const serverError = requestError.response?.data?.error
      const errorCode = requestError.response?.data?.code
      setError(errorCode === 'LOCATION_CHANGE_COOLDOWN' && serverError ? serverError : t('editProfile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding:32, color:C.muted, textAlign:'center' }}>{t('editProfile.loading')}</div>
  if (!form) return null

  const missingLabels = completeness?.missing?.map(code => t(`editProfile.missingFields.${code}`, code)).join(', ')

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'calc(20px + env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))' }}>
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button aria-label={t('profileForm.back')} onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:4, minWidth:44, minHeight:44 }}>←</button>
        <h1 style={{ flex:1, fontSize:20, fontWeight:500, color:C.text, margin:0 }}>{t('editProfile.title')}</h1>
        <button onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:50, padding:'8px 18px', fontSize:14, fontWeight:500, color:'#0A141A', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>{saving?t('editProfile.saving'):t('editProfile.save')}</button>
      </div>

      {message && <div style={{ background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.25)', borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.success, fontSize:14 }}>{message}</div>}
      {error && <div style={{ background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.25)', borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:14 }}>{error}</div>}

      {completeness && !completeness.complete && <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:6 }}>{t('editProfile.completeness')} {formatNumber(completeness.score)}% {t('editProfile.complete')}</div>
        <div style={{ height:6, borderRadius:3, background:C.input, overflow:'hidden', marginBottom:8 }}><div style={{ height:'100%', width:`${completeness.score}%`, background:C.primary, borderRadius:3 }}/></div>
        <div style={{ fontSize:12, color:C.muted }}>{t('editProfile.missing')}: {missingLabels}</div>
      </div>}

      <section style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>{t('editProfile.basicData')}</div>
        <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('editProfile.displayName')}</label>
        <input style={INPUT} placeholder={t('editProfile.displayNamePlaceholder')} value={form.displayName} onChange={event => set('displayName', event.target.value)}/>
        <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('editProfile.bio')}</label>
        <textarea style={{ ...INPUT, minHeight:80, resize:'none' }} placeholder={t('editProfile.bioPlaceholder')} value={form.bio} onChange={event => set('bio', event.target.value)}/>
        <LocationAutocomplete countryCode={form.countryCode} onCountryChange={code => set('countryCode', code)} locationId={form.homeLocationId} locationLabel={form.homeLocationLabel} onSelectLocation={location => setForm(previous => ({ ...previous, homeLocationId:location?.id || null, homeLocationLabel:location?.label || null, countryCode:location?.countryCode || previous.countryCode }))} customLocality={form.customLocality} onCustomLocalityChange={value => set('customLocality', value)} label={t('editProfile.homeLocation')}/>
        <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('editProfile.locationDisplay')}</label>
        <select style={INPUT} value={form.locationVisibility} onChange={event => set('locationVisibility', event.target.value)}>{LOCATION_VISIBILITY_VALUES.map(value => <option key={value} value={value}>{t(`editProfile.locationOptions.${value}`)}</option>)}</select>
        <div style={{ fontSize:11, color:C.muted, marginTop:-6, marginBottom:12 }}>{t('editProfile.locationHelp')}</div>
        <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('editProfile.gender')}</label>
        <select style={INPUT} value={form.gender} onChange={event => set('gender', event.target.value)}><option value="">{t('editProfile.preferNotSay')}</option>{catalogGenders.map(item => <option key={item.id} value={item.slug}>{catalogLabel(t, 'genders', item.slug, item.label)}</option>)}</select>
        <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('editProfile.orientation')}</label>
        <select style={INPUT} value={form.orientation} onChange={event => set('orientation', event.target.value)}><option value="">{t('editProfile.preferNotSay')}</option>{catalogOrientations.map(item => <option key={item.id} value={item.slug}>{catalogLabel(t, 'orientations', item.slug, item.label)}</option>)}</select>
        <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('editProfile.relationship')}</label>
        <select style={INPUT} value={form.relationshipStatus} onChange={event => set('relationshipStatus', event.target.value)}>{RELATIONSHIP_VALUES.map(value => <option key={value} value={value}>{t(`profileForm.relationships.${value}`)}</option>)}</select>
      </section>

      <section style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>{t('editProfile.intentions')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>{catalogIntentions.map(item => { const selected=intentionSlugs.includes(item.slug); return <button key={item.id} type="button" onClick={() => toggleIntention(item.slug)} style={{ background:selected?C.primaryDim:C.elevated, border:`1.5px solid ${selected?C.primary:C.border}`, borderRadius:12, padding:'11px 10px', cursor:'pointer', color:selected?C.primary:C.text2, minHeight:44 }}>{intentionLabel(t, item)}</button> })}</div>
      </section>

      <section style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{t('editProfile.limits')}</div>
        <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>{t('editProfile.limitsHelp')}</p>
        {Object.entries(catalogBoundaries.reduce((groups, boundary) => { (groups[boundary.category] ||= []).push(boundary); return groups }, {})).map(([category, items]) => <div key={category} style={{ marginBottom:14 }}><div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:6 }}>{catalogLabel(t, 'boundaryCategories', category, category.replace(/_/g,' '))}</div>{items.map(boundary => <div key={boundary.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'8px 0', borderBottom:`1px solid ${C.border}` }}><span style={{ fontSize:13, color:C.text }}>{catalogLabel(t, 'boundaries', boundary.slug, boundary.name)}</span><div style={{ display:'flex', gap:6 }}>{['NO','MAYBE','YES'].map(preference => { const active=boundaryPrefs[boundary.id]===preference; const key=preference==='YES'?'yes':preference==='MAYBE'?'maybe':'no'; return <button key={preference} type="button" onClick={() => setBoundaryPref(boundary.id, preference)} style={{ background:active?C.primaryDim:'transparent', border:`1px solid ${active?C.primary:C.border}`, borderRadius:8, padding:'4px 10px', fontSize:11, color:active?C.primary:C.muted }}>{t(`editProfile.${key}`)}</button> })}</div></div>)}</div>)}
      </section>

      <section style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>{t('editProfile.discretion')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{DISCRETION_VALUES.map(value => { const selected=form.discretionLevel===value; return <button key={value} type="button" onClick={() => set('discretionLevel', value)} style={{ background:selected?C.primaryDim:C.elevated, border:`1.5px solid ${selected?C.primary:C.border}`, borderRadius:14, padding:'13px 16px', cursor:'pointer', textAlign:'left' }}><div style={{ fontWeight:500, fontSize:14, color:selected?C.primary:C.text, marginBottom:2 }}>{t(`profileForm.discretion.${value}.label`)}</div><div style={{ fontSize:12, color:C.muted }}>{t(`profileForm.discretion.${value}.desc`)}</div></button> })}</div>
      </section>

      <button onClick={save} disabled={saving} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:500, color:'#0A141A', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1, minHeight:50 }}>{saving?t('editProfile.saving'):t('editProfile.saveChanges')}</button>
    </div>
  </div>
}
