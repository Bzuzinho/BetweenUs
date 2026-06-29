import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

const RELATIONSHIP_STATUSES = [
  { value:'SINGLE', label:'Solteiro/a' },
  { value:'COMMITTED', label:'Comprometido/a' },
  { value:'MARRIED', label:'Casado/a' },
  { value:'OPEN', label:'Relação aberta' },
  { value:'POLYAMOROUS', label:'Poliamoroso/a' },
  { value:'COUPLE_CURIOUS', label:'Casal curioso' },
  { value:'COUPLE_LIBERAL', label:'Casal liberal' },
  { value:'OTHER', label:'Outro' },
]

const INTENTIONS = [
  { slug:'casual_encounter', label:'Encontro casual' },
  { slug:'recurring_connection', label:'Ligação recorrente' },
  { slug:'trio_experience', label:'Experiência a três' },
  { slug:'swing', label:'Swing' },
  { slug:'polyamory', label:'Poliamor' },
  { slug:'online_only', label:'Apenas online' },
  { slug:'friends_with_benefits', label:'Amizade colorida' },
  { slug:'fetish_exploration', label:'Explorar fetiches' },
  { slug:'seek_couple', label:'Procurar casal' },
  { slug:'seek_third', label:'Procurar terceira pessoa' },
]

const DISCRETION = [
  { value:'MAXIMUM', label:'Máxima privacidade', desc:'Perfil oculto, fotos desfocadas' },
  { value:'SELECTIVE', label:'Visibilidade seletiva', desc:'Apareço apenas a perfis compatíveis' },
  { value:'OPEN', label:'Perfil aberto', desc:'Visível para todos na plataforma' },
]

export default function CreateProfilePage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    displayName:'', bio:'', gender:'', orientation:'',
    relationshipStatus:'SINGLE', city:'', country:'Portugal',
    discretionLevel:'SELECTIVE', intentions:[]
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggleIntention = (slug) => setForm(p => ({
    ...p,
    intentions: p.intentions.includes(slug)
      ? p.intentions.filter(i => i !== slug)
      : [...p.intentions, slug]
  }))

  const handleSubmit = async () => {
    if (!form.displayName) return setError('O nome visível é obrigatório.')
    if (form.intentions.length === 0) return setError('Seleciona pelo menos uma intenção.')
    setLoading(true); setError('')
    try {
      await api.post('/profiles', form)
      // Refresh user data so AuthContext knows profile exists
      await refreshUser()
      navigate('/explore', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar perfil.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width:'100%', background:colors.bgInput, border:`1.5px solid ${colors.plum}`,
    borderRadius:14, padding:'13px 16px', color:colors.white, fontSize:14,
    outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12
  }

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontStyle:'italic',
            background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>
            Criar o teu perfil
          </h1>
          <p style={{ color:colors.muted, fontSize:13 }}>Passo {step} de 3</p>
        </div>

        <div style={{ display:'flex', gap:6, marginBottom:28 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, transition:'all 0.3s',
              background: step >= i
                ? `linear-gradient(90deg,${colors.accent},${colors.rose})`
                : colors.plum }} />
          ))}
        </div>

        {error && (
          <div style={{ background:'rgba(224,92,122,0.1)',
            border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
            padding:'12px 16px', marginBottom:16, color:'#E05C7A', fontSize:13 }}>
            {error}
          </div>
        )}

        <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:24, padding:24 }}>

          {step === 1 && (
            <>
              <h2 style={{ color:colors.white, fontFamily:"'Playfair Display',serif",
                fontSize:20, marginBottom:20 }}>Quem és?</h2>
              <input style={inputStyle} placeholder="Nome visível ou pseudónimo *"
                value={form.displayName} onChange={e => set('displayName', e.target.value)} />
              <textarea style={{ ...inputStyle, minHeight:90, resize:'none' }}
                placeholder="Bio curta (opcional)"
                value={form.bio} onChange={e => set('bio', e.target.value)} />
              <select style={{ ...inputStyle, cursor:'pointer' }}
                value={form.relationshipStatus}
                onChange={e => set('relationshipStatus', e.target.value)}>
                {RELATIONSHIP_STATUSES.map(s => (
                  <option key={s.value} value={s.value}
                    style={{ background:colors.bgCard }}>{s.label}</option>
                ))}
              </select>
              <input style={inputStyle} placeholder="Cidade (opcional)"
                value={form.city} onChange={e => set('city', e.target.value)} />
              <button onClick={() => {
                if (!form.displayName) return setError('Nome obrigatório.')
                setError(''); setStep(2)
              }} style={{ width:'100%',
                background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                border:'none', borderRadius:50, padding:14, fontSize:15,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                fontFamily:'Inter,sans-serif' }}>
                Continuar →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ color:colors.white, fontFamily:"'Playfair Display',serif",
                fontSize:20, marginBottom:8 }}>O que procuras?</h2>
              <p style={{ color:colors.muted, fontSize:13, marginBottom:20 }}>
                Podes selecionar mais do que um.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                gap:8, marginBottom:24 }}>
                {INTENTIONS.map(i => (
                  <div key={i.slug} onClick={() => toggleIntention(i.slug)}
                    style={{ background: form.intentions.includes(i.slug)
                      ? 'rgba(201,149,107,0.15)' : colors.bgInput,
                      border:`1.5px solid ${form.intentions.includes(i.slug)
                        ? colors.accent : colors.plum}`,
                      borderRadius:14, padding:'12px 10px', cursor:'pointer',
                      textAlign:'center', fontSize:12, lineHeight:1.3, transition:'all 0.2s',
                      color: form.intentions.includes(i.slug)
                        ? colors.accent : colors.lavLight }}>
                    {i.label}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(1)}
                  style={{ flex:1, background:'none',
                    border:`1px solid ${colors.plum}`, borderRadius:50,
                    padding:14, color:colors.muted, cursor:'pointer',
                    fontFamily:'Inter,sans-serif' }}>← Voltar</button>
                <button onClick={() => {
                  if (!form.intentions.length) return setError('Seleciona pelo menos uma.')
                  setError(''); setStep(3)
                }} style={{ flex:2,
                  background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                  border:'none', borderRadius:50, padding:14, fontSize:15,
                  fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                  fontFamily:'Inter,sans-serif' }}>Continuar →</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ color:colors.white, fontFamily:"'Playfair Display',serif",
                fontSize:20, marginBottom:8 }}>Nível de discrição</h2>
              <p style={{ color:colors.muted, fontSize:13, marginBottom:20 }}>
                Controla quem pode ver o teu perfil.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                {DISCRETION.map(d => (
                  <div key={d.value} onClick={() => set('discretionLevel', d.value)}
                    style={{ background: form.discretionLevel === d.value
                      ? 'rgba(201,149,107,0.12)' : colors.bgInput,
                      border:`1.5px solid ${form.discretionLevel === d.value
                        ? colors.accent : colors.plum}`,
                      borderRadius:14, padding:'14px 16px',
                      cursor:'pointer', transition:'all 0.2s' }}>
                    <div style={{ color: form.discretionLevel === d.value
                      ? colors.accent : colors.white,
                      fontWeight:600, fontSize:14, marginBottom:3 }}>{d.label}</div>
                    <div style={{ color:colors.muted, fontSize:12 }}>{d.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(2)}
                  style={{ flex:1, background:'none',
                    border:`1px solid ${colors.plum}`, borderRadius:50,
                    padding:14, color:colors.muted, cursor:'pointer',
                    fontFamily:'Inter,sans-serif' }}>← Voltar</button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ flex:2,
                    background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                    border:'none', borderRadius:50, padding:14, fontSize:15,
                    fontWeight:600, color:'#1A0A2E', fontFamily:'Inter,sans-serif',
                    cursor:loading ? 'not-allowed' : 'pointer',
                    opacity:loading ? 0.7 : 1 }}>
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
