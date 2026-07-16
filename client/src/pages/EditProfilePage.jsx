import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import LocationAutocomplete from '../components/LocationAutocomplete'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const INP = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`,
  borderRadius:12, padding:'13px 16px', color:C.text, fontSize:15,
  marginBottom:12, display:'block', WebkitAppearance:'none', outline:'none',
}

const RELATIONSHIP_STATUSES = [
  { value:'SINGLE',         label:'Solteiro/a' },
  { value:'COMMITTED',      label:'Comprometido/a' },
  { value:'MARRIED',        label:'Casado/a' },
  { value:'OPEN',           label:'Relação aberta' },
  { value:'POLYAMOROUS',    label:'Poliamoroso/a' },
  { value:'COUPLE_CURIOUS', label:'Casal curioso' },
  { value:'COUPLE_LIBERAL', label:'Casal liberal' },
  { value:'OTHER',          label:'Outro' },
]

const DISCRETION = [
  { value:'MAXIMUM',   label:'Máxima privacidade',    desc:'Perfil oculto, fotos desfocadas' },
  { value:'SELECTIVE', label:'Visibilidade seletiva', desc:'Apareço apenas a perfis compatíveis' },
  { value:'OPEN',      label:'Perfil aberto',         desc:'Visível para todos na plataforma' },
]

// 4.9 — pure display labels for ProfileCompletenessService's `missing`
// codes. The score/logic itself always comes from the backend; this is
// only translating field codes to PT copy, nothing computed here.
const COMPLETENESS_LABELS = {
  DISPLAY_NAME:     'nome de exibição',
  MEMBERS:          'convidar parceiro/membros',
  GENDER:           'género',
  INTENTIONS:       'o que procuras',
  BOUNDARIES:       'mapa de limites',
  PRIMARY_PHOTO:    'foto de perfil',
  PRIVACY_SETTINGS: 'definições de privacidade',
  BIO:              'biografia',
}

export default function EditProfilePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [intentionSlugs, setIntentionSlugs] = useState([])
  const [catalogIntentions, setCatalogIntentions] = useState([])
  const [catalogBoundaries, setCatalogBoundaries] = useState([])
  const [catalogGenders, setCatalogGenders] = useState([])
  const [catalogOrientations, setCatalogOrientations] = useState([])
  const [boundaryPrefs, setBoundaryPrefs] = useState({}) // boundaryId -> YES|MAYBE|NO
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [completeness, setCompleteness] = useState(null)

  useEffect(() => {
    api.get('/catalog/intentions').then(r => setCatalogIntentions(r.data.intentions || [])).catch(() => {})
    api.get('/catalog/boundaries').then(r => setCatalogBoundaries(r.data.boundaries || [])).catch(() => {})
    api.get('/catalog/genders').then(r => setCatalogGenders(r.data.genders || [])).catch(() => {})
    api.get('/catalog/orientations').then(r => setCatalogOrientations(r.data.orientations || [])).catch(() => {})
    api.get('/profiles/me').then(r => {
      const p = r.data
      setForm({
        displayName:        p.displayName || '',
        bio:                p.bio || '',
        gender:             p.gender || '',
        orientation:        p.orientation || '',
        relationshipStatus: p.relationshipStatus || 'SINGLE',
        discretionLevel:    p.discretionLevel || 'SELECTIVE',
        // Sistema de localidades — homeLocationId/customLocality/
        // locationVisibility são o fluxo novo (catálogo GeoNames);
        // city/country ficam guardados só para o caso raro de um perfil
        // ainda os ter e nunca ter aberto esta página desde então (nunca
        // reenviados por esta página se o utilizador não voltar a mexer
        // na localização). homeLocationCountryCode pré-selecciona o país
        // do catálogo quando o perfil já tem uma localidade de referência;
        // sem isso, assume-se PT (único país importado até agora — ver
        // docs/product/GEONAMES_IMPORT.md) como ponto de partida razoável.
        countryCode:        p.homeLocationCountryCode || 'PT',
        homeLocationId:     p.homeLocationId || null,
        homeLocationLabel:  p.homeLocationLabel || null,
        customLocality:     p.customLocality || '',
        locationVisibility: p.locationVisibility || 'REFERENCE_LOCALITY',
      })
      setIntentionSlugs((p.intentions || []).map(pi => pi.intention?.slug || pi.slug).filter(Boolean))
      const b = {}
      ;(p.boundaries || []).forEach(pb => { b[pb.boundaryId] = pb.preference })
      setBoundaryPrefs(b)
      // 4.9: score/missing come straight from ProfileCompletenessService —
      // never computed or guessed on the frontend.
      setCompleteness(p.completeness || null)
    }).catch(() => navigate('/create-profile'))
    .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleIntention = slug => setIntentionSlugs(prev =>
    prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
  )
  const setBoundaryPref = (boundaryId, pref) => setBoundaryPrefs(p => ({ ...p, [boundaryId]: pref }))

  const handleSave = async () => {
    if (!form.displayName.trim()) return setError('Nome visível obrigatório.')
    setSaving(true); setMsg(''); setError('')
    try {
      const { countryCode, ...rest } = form // countryCode é só estado local do LocationAutocomplete, nunca enviado
      await api.put(`/profiles/me`, {
        ...rest,
        intentions: intentionSlugs.map(slug => ({ slug, preference: 'YES' })),
      })
      const boundaryEntries = Object.entries(boundaryPrefs)
      if (boundaryEntries.length > 0) {
        await api.put('/profiles/me/boundaries', {
          boundaries: boundaryEntries.map(([boundaryId, preference]) => ({ boundaryId, preference }))
        })
      }
      setMsg('Perfil actualizado!')
      setTimeout(() => navigate('/profile'), 1200)
    } catch (err) {
      // Sistema de localidades — se o backend recusar por cooldown
      // (403 LOCATION_CHANGE_COOLDOWN), a mensagem já vem com a data exacta
      // a partir de quando pode voltar a mudar — nunca inventamos essa
      // data aqui, só mostramos o texto que veio do backend.
      setError(err.response?.data?.error || 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding:32, color:C.muted, textAlign:'center' }}>A carregar...</div>
  if (!form)   return null

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'calc(20px + env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:4, minWidth:44, minHeight:44 }}>
            ←
          </button>
          <h1 style={{ flex:1, fontSize:20, fontWeight:500, color:C.text, margin:0 }}>Editar perfil</h1>
          <button onClick={handleSave} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:50, padding:'8px 18px', fontSize:14, fontWeight:500, color:'#0A141A', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>

        {msg   && <div style={{ background:'rgba(74,222,128,0.08)', border:`1px solid rgba(74,222,128,0.25)`, borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.success, fontSize:14 }}>{msg}</div>}
        {error && <div style={{ background:'rgba(248,113,113,0.08)', border:`1px solid rgba(248,113,113,0.25)`, borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:14 }}>{error}</div>}
        {completeness && !completeness.complete && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Perfil {completeness.score}% completo</div>
            </div>
            <div style={{ height:6, borderRadius:3, background:C.input, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${completeness.score}%`, background:C.primary, borderRadius:3 }}/>
            </div>
            <div style={{ fontSize:12, color:C.muted }}>Falta: {completeness.missing.map(f => COMPLETENESS_LABELS[f] || f).join(', ')}</div>
          </div>
        )}

        {/* Dados básicos */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Dados do perfil</div>
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Nome visível *</label>
          <input style={INP} placeholder="Nome ou pseudónimo" value={form.displayName} onChange={e => set('displayName', e.target.value)} />
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Bio</label>
          <textarea style={{ ...INP, minHeight:80, resize:'none' }} placeholder="Breve descrição (opcional)" value={form.bio} onChange={e => set('bio', e.target.value)} />
          {/* Sistema de localidades — a localização HABITUAL é sempre
              escolhida do catálogo GeoNames (nunca texto livre sozinho —
              ver LocationAutocomplete.jsx), nunca uma viagem (isso é o
              Travel Mode, na página de Casal). Alterações estão sujeitas a
              um cooldown fora do onboarding para impedir simular viagens;
              se o backend recusar (403 LOCATION_CHANGE_COOLDOWN), a
              mensagem com a data exacta a partir de quando pode voltar a
              mudar aparece no banner de erro acima — nunca inventamos essa
              data aqui. */}
          <LocationAutocomplete
            countryCode={form.countryCode}
            onCountryChange={code => set('countryCode', code)}
            locationId={form.homeLocationId}
            locationLabel={form.homeLocationLabel}
            onSelectLocation={loc => setForm(p => ({
              ...p,
              homeLocationId: loc?.id || null,
              homeLocationLabel: loc?.label || null,
              countryCode: loc?.countryCode || p.countryCode,
            }))}
            customLocality={form.customLocality}
            onCustomLocalityChange={v => set('customLocality', v)}
            label="Localização habitual"
          />
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Mostrar no perfil como</label>
          <select style={{ ...INP, cursor:'pointer' }} value={form.locationVisibility} onChange={e => set('locationVisibility', e.target.value)}>
            <option value="REFERENCE_LOCALITY" style={{ background:C.surface }}>Nome da localidade (ex: Benedita)</option>
            <option value="CUSTOM_LOCALITY" style={{ background:C.surface }}>Localidade específica, se preenchida (ex: bairro)</option>
            <option value="REGION_ONLY" style={{ background:C.surface }}>Só distrito/região (ex: Distrito de Leiria)</option>
          </select>
          <div style={{ fontSize:11, color:C.muted, marginTop:-6, marginBottom:12 }}>
            Depois de confirmada, só podes voltar a mudar a localização habitual passado algum tempo — para viajar temporariamente, usa o Travel Mode na página de Casal.
          </div>
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Género</label>
          <select style={{ ...INP, cursor:'pointer' }} value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="" style={{ background:C.surface }}>Preferir não dizer / não definido</option>
            {catalogGenders.map(g => <option key={g.id} value={g.slug} style={{ background:C.surface }}>{g.label}</option>)}
          </select>
          {/* 4.4: orientation previously had no input at all in this form either. */}
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Orientação</label>
          <select style={{ ...INP, cursor:'pointer' }} value={form.orientation} onChange={e => set('orientation', e.target.value)}>
            <option value="" style={{ background:C.surface }}>Preferir não dizer / não definido</option>
            {catalogOrientations.map(o => <option key={o.id} value={o.slug} style={{ background:C.surface }}>{o.label}</option>)}
          </select>
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Estado relacional</label>
          <select style={{ ...INP, cursor:'pointer' }} value={form.relationshipStatus} onChange={e => set('relationshipStatus', e.target.value)}>
            {RELATIONSHIP_STATUSES.map(s => <option key={s.value} value={s.value} style={{ background:C.surface }}>{s.label}</option>)}
          </select>
        </div>

        {/* Intenções */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>O que procuras</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {catalogIntentions.map(i => {
              const sel = intentionSlugs.includes(i.slug)
              return (
                <div key={i.id} onClick={() => toggleIntention(i.slug)} style={{
                  background: sel ? C.primaryDim : C.elevated,
                  border:`1.5px solid ${sel ? C.primary : C.border}`,
                  borderRadius:12, padding:'11px 10px',
                  cursor:'pointer', textAlign:'center',
                  fontSize:13, color: sel ? C.primary : C.text2,
                  minHeight:44, display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {i.name}
                </div>
              )
            })}
          </div>
        </div>

        {/* Mapa de Limites (Sprint 2.5.8) */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Mapa de Limites</div>
          <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>Sim / Talvez / Não para cada tópico.</p>
          {Object.entries(
            catalogBoundaries.reduce((acc, b) => { (acc[b.category] = acc[b.category] || []).push(b); return acc }, {})
          ).map(([category, items]) => (
            <div key={category} style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>{category.replace(/_/g,' ')}</div>
              {items.map(b => (
                <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:13, color:C.text }}>{b.name}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {['NO','MAYBE','YES'].map(pref => {
                      const active = boundaryPrefs[b.id] === pref
                      const label = pref === 'YES' ? 'Sim' : pref === 'MAYBE' ? 'Talvez' : 'Não'
                      return (
                        <button key={pref} onClick={() => setBoundaryPref(b.id, pref)} style={{
                          background: active ? C.primaryDim : 'transparent',
                          border:`1px solid ${active ? C.primary : C.border}`,
                          borderRadius:8, padding:'4px 10px', fontSize:11,
                          color: active ? C.primary : C.muted, cursor:'pointer',
                        }}>{label}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Discrição */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:24 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Nível de discrição</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {DISCRETION.map(d => {
              const sel = form.discretionLevel === d.value
              return (
                <div key={d.value} onClick={() => set('discretionLevel', d.value)} style={{
                  background: sel ? C.primaryDim : C.elevated,
                  border:`1.5px solid ${sel ? C.primary : C.border}`,
                  borderRadius:14, padding:'13px 16px', cursor:'pointer',
                }}>
                  <div style={{ fontWeight:500, fontSize:14, color: sel ? C.primary : C.text, marginBottom:2 }}>{d.label}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{d.desc}</div>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:500, color:'#0A141A', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1, minHeight:50 }}>
          {saving ? 'A guardar…' : 'Guardar alterações'}
        </button>
      </div>
    </div>
  )
}
