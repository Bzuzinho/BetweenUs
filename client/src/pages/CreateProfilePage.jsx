import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const C = {
  bg:'#0A141A', card:'#102129', input:'#0F1E26', plum:'#1E3340',
  accent:'#B8A7FF', rose:'#9B8EE0', lavLight:'#AAB6C2',
  white:'#F5F7FA', muted:'#7E8FA3', green:'#4ADE80'
}

const RELATIONSHIP_STATUSES = [
  { value:'SINGLE',          label:'Solteiro/a' },
  { value:'COMMITTED',       label:'Comprometido/a' },
  { value:'MARRIED',         label:'Casado/a' },
  { value:'OPEN',            label:'Relação aberta' },
  { value:'POLYAMOROUS',     label:'Poliamoroso/a' },
  { value:'COUPLE_CURIOUS',  label:'Casal curioso' },
  { value:'COUPLE_LIBERAL',  label:'Casal liberal' },
  { value:'OTHER',           label:'Outro' },
]

const DISCRETION = [
  { value:'MAXIMUM',   label:'Máxima privacidade',    desc:'Perfil oculto, fotos desfocadas' },
  { value:'SELECTIVE', label:'Visibilidade seletiva', desc:'Apareço apenas a perfis compatíveis' },
  { value:'OPEN',      label:'Perfil aberto',         desc:'Visível para todos na plataforma' },
]

const inp = {
  width:'100%', background:C.input, border:`1.5px solid ${C.plum}`,
  borderRadius:14, padding:'13px 16px', color:C.white, fontSize:15,
  fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12,
  WebkitAppearance:'none', outline:'none',
}

export default function CreateProfilePage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    displayName: '', bio: '', gender: '', orientation: '',
    relationshipStatus: 'SINGLE', city: '', country: 'Portugal',
    discretionLevel: 'SELECTIVE',
    intentions: []  // array of slugs (strings) — converted to objects before sending
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [catalogIntentions, setCatalogIntentions] = useState([])
  const [catalogBoundaries, setCatalogBoundaries] = useState([])
  const [catalogGenders, setCatalogGenders] = useState([])
  const [boundaryPrefs, setBoundaryPrefs] = useState({}) // boundaryId -> YES|MAYBE|NO

  useEffect(() => {
    api.get('/catalog/intentions').then(r => setCatalogIntentions(r.data.intentions || [])).catch(() => {})
    api.get('/catalog/boundaries').then(r => setCatalogBoundaries(r.data.boundaries || [])).catch(() => {})
    api.get('/catalog/genders').then(r => setCatalogGenders(r.data.genders || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setBoundaryPref = (boundaryId, pref) => setBoundaryPrefs(p => ({ ...p, [boundaryId]: pref }))

  const toggleIntention = (slug) => setForm(p => ({
    ...p,
    intentions: p.intentions.includes(slug)
      ? p.intentions.filter(i => i !== slug)
      : [...p.intentions, slug]
  }))

  const handleSubmit = async () => {
    if (!form.displayName.trim()) return setError('O nome visível é obrigatório.')
    if (form.intentions.length === 0) return setError('Seleciona pelo menos uma intenção.')

    setLoading(true)
    setError('')

    try {
      // Convert slug strings → objects that the backend expects
      const payload = {
        displayName:        form.displayName.trim(),
        bio:                form.bio.trim() || undefined,
        gender:             form.gender || undefined,
        orientation:        form.orientation || undefined,
        relationshipStatus: form.relationshipStatus,
        city:               form.city.trim() || undefined,
        country:            form.country || undefined,
        discretionLevel:    form.discretionLevel,
        intentions:         form.intentions.map(slug => ({ slug, preference: 'YES' })),
      }

      await api.post('/profiles', payload)

      // Sprint 2.5.8: Limits Map — optional, non-blocking. A profile without
      // boundaries filled in is still a valid profile (matches current backend
      // behaviour), so a failure here must never stop onboarding from finishing.
      const boundaryEntries = Object.entries(boundaryPrefs)
      if (boundaryEntries.length > 0) {
        await api.put('/profiles/me/boundaries', {
          boundaries: boundaryEntries.map(([boundaryId, preference]) => ({ boundaryId, preference }))
        }).catch(() => {})
      }

      await refreshUser()
      navigate('/explore', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar perfil. Tenta novamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const btnPrimary = {
    background: `linear-gradient(135deg,${C.accent},${C.rose})`,
    border: 'none', borderRadius: 50, padding: '14px', fontSize: 15,
    fontWeight: 700, color: '#1A0A2E', cursor: 'pointer',
    fontFamily: 'Inter,sans-serif', minHeight: 50,
  }
  const btnSecondary = {
    background: 'none', border: `1px solid ${C.plum}`, borderRadius: 50,
    padding: '14px', color: C.muted, cursor: 'pointer',
    fontFamily: 'Inter,sans-serif', minHeight: 50,
  }

  return (
    <div style={{
      minHeight: '100vh', minHeight: '-webkit-fill-available',
      background: C.bg,
      padding: 'calc(48px + env(safe-area-inset-top)) 20px calc(40px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Playfair Display',serif", fontSize: 26, fontStyle: 'italic',
            background: `linear-gradient(135deg,${C.accent},${C.rose})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 6px',
          }}>
            Criar o teu perfil
          </h1>
          <p style={{ color: C.muted, fontSize: 13 }}>Passo {step} de 4</p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2, transition: 'all 0.3s',
              background: step >= i
                ? `linear-gradient(90deg,${C.accent},${C.rose})`
                : C.plum,
            }} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(224,92,122,0.1)', border: '1px solid rgba(224,92,122,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            color: '#F87171', fontSize: 14, lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.plum}`, borderRadius: 24, padding: 24 }}>

          {/* ── Step 1: Who are you ── */}
          {step === 1 && (
            <>
              <h2 style={{ color: C.white, fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 20, marginTop: 0 }}>
                Quem és?
              </h2>

              <input style={inp} placeholder="Nome visível ou pseudónimo *"
                value={form.displayName}
                onChange={e => set('displayName', e.target.value)} />

              <textarea style={{ ...inp, minHeight: 80, resize: 'none' }}
                placeholder="Bio curta (opcional)"
                value={form.bio}
                onChange={e => set('bio', e.target.value)} />

              <select style={{ ...inp, cursor: 'pointer' }}
                value={form.relationshipStatus}
                onChange={e => set('relationshipStatus', e.target.value)}>
                {RELATIONSHIP_STATUSES.map(s => (
                  <option key={s.value} value={s.value}
                    style={{ background: C.card }}>{s.label}</option>
                ))}
              </select>

              <select style={{ ...inp, cursor: 'pointer' }}
                value={form.gender}
                onChange={e => set('gender', e.target.value)}>
                <option value="" style={{ background: C.card }}>Género (opcional)</option>
                {catalogGenders.map(g => (
                  <option key={g.id} value={g.slug} style={{ background: C.card }}>{g.label}</option>
                ))}
              </select>

              <input style={inp} placeholder="Cidade (opcional)"
                value={form.city}
                onChange={e => set('city', e.target.value)} />

              <button
                style={{ ...btnPrimary, width: '100%' }}
                onClick={() => {
                  if (!form.displayName.trim()) return setError('Nome visível obrigatório.')
                  setError('')
                  setStep(2)
                }}>
                Continuar →
              </button>
            </>
          )}

          {/* ── Step 2: Intentions ── */}
          {step === 2 && (
            <>
              <h2 style={{ color: C.white, fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 6, marginTop: 0 }}>
                O que procuras?
              </h2>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
                Podes selecionar mais do que um.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                {catalogIntentions.map(i => {
                  const selected = form.intentions.includes(i.slug)
                  return (
                    <div key={i.id} onClick={() => toggleIntention(i.slug)} style={{
                      background: selected ? 'rgba(201,149,107,0.15)' : C.input,
                      border: `1.5px solid ${selected ? C.accent : C.plum}`,
                      borderRadius: 14, padding: '13px 10px',
                      cursor: 'pointer', textAlign: 'center',
                      fontSize: 13, lineHeight: 1.3, transition: 'all 0.15s',
                      color: selected ? C.accent : C.lavLight,
                      minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i.name}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...btnSecondary, flex: 1 }} onClick={() => { setError(''); setStep(1) }}>
                  ← Voltar
                </button>
                <button
                  style={{ ...btnPrimary, flex: 2 }}
                  onClick={() => {
                    if (!form.intentions.length) return setError('Seleciona pelo menos uma intenção.')
                    setError('')
                    setStep(3)
                  }}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Discretion ── */}
          {step === 3 && (
            <>
              <h2 style={{ color: C.white, fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 6, marginTop: 0 }}>
                Nível de discrição
              </h2>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
                Controla quem pode ver o teu perfil.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {DISCRETION.map(d => {
                  const selected = form.discretionLevel === d.value
                  return (
                    <div key={d.value} onClick={() => set('discretionLevel', d.value)} style={{
                      background: selected ? 'rgba(201,149,107,0.12)' : C.input,
                      border: `1.5px solid ${selected ? C.accent : C.plum}`,
                      borderRadius: 14, padding: '14px 16px',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <div style={{ color: selected ? C.accent : C.white, fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                        {d.label}
                      </div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{d.desc}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...btnSecondary, flex: 1 }} onClick={() => { setError(''); setStep(2) }}>
                  ← Voltar
                </button>
                <button style={{ ...btnPrimary, flex: 2 }} onClick={() => setStep(4)}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Limits Map (Mapa de Limites) — optional ── */}
          {step === 4 && (
            <>
              <h2 style={{ color: C.white, fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 6, marginTop: 0 }}>
                Mapa de Limites
              </h2>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
                Opcional — podes definir ou ajustar isto mais tarde no teu perfil.
                Sim / Talvez / Não para cada tópico.
              </p>

              <div style={{ marginBottom: 24, maxHeight: 360, overflowY: 'auto' }}>
                {Object.entries(
                  catalogBoundaries.reduce((acc, b) => { (acc[b.category] = acc[b.category] || []).push(b); return acc }, {})
                ).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                      {category.replace(/_/g, ' ')}
                    </div>
                    {items.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.plum}` }}>
                        <span style={{ fontSize: 13, color: C.white }}>{b.name}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['NO', 'MAYBE', 'YES'].map(pref => {
                            const active = boundaryPrefs[b.id] === pref
                            const label = pref === 'YES' ? 'Sim' : pref === 'MAYBE' ? 'Talvez' : 'Não'
                            return (
                              <button key={pref} onClick={() => setBoundaryPref(b.id, pref)} style={{
                                background: active ? 'rgba(184,167,255,0.15)' : 'transparent',
                                border: `1px solid ${active ? C.accent : C.plum}`,
                                borderRadius: 8, padding: '4px 10px', fontSize: 11,
                                color: active ? C.accent : C.muted, cursor: 'pointer',
                              }}>{label}</button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...btnSecondary, flex: 1 }} onClick={() => { setError(''); setStep(3) }}>
                  ← Voltar
                </button>
                <button
                  style={{ ...btnPrimary, flex: 2, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                  onClick={handleSubmit}
                  disabled={loading}>
                  {loading ? 'A criar...' : 'Criar perfil ✓'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
