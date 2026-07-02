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

const inputStyle = {
  width: '100%', background: C.bgInput, border: `1.5px solid ${C.border}`,
  borderRadius: 12, padding: '12px 16px', color: C.text, fontSize: 14,
  outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box'
}

function formatDate(d) {
  return new Date(d).toLocaleString('pt-PT', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Agendado', color: C.primary, icon: '⏰' },
  CONFIRMED: { label: 'Confirmado', color: C.success, icon: '✅' },
  CANCELLED: { label: 'Cancelado', color: C.muted, icon: '❌' },
  ALERT_SENT: { label: 'Alerta enviado', color: colors.red, icon: '🚨' }
}

export default function CheckInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const matchId = searchParams.get('match')

  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    location: '',
    scheduledAt: '',
    checkInAfterHours: 3,
    safetyEmail: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/checkin/me')
      .then(res => setCheckins(res.data.checkins || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setError('')
    if (!form.scheduledAt) return setError('Hora do encontro obrigatória.')
    if (!form.safetyEmail) return setError('Email de segurança obrigatório.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.safetyEmail)) {
      return setError('Email de segurança inválido.')
    }

    setSaving(true)
    try {
      const res = await api.post('/checkin/start', {
        ...form,
        ...(matchId && { matchId })
      })
      setSuccess(res.data.message)
      setShowForm(false)
      setForm({ location: '', scheduledAt: '', checkInAfterHours: 3, safetyEmail: '' })
      // Recarregar lista
      const updated = await api.get('/checkin/me')
      setCheckins(updated.data.checkins || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar check-in.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async (id) => {
    try {
      await api.post(`/checkin/${id}/confirm`)
      setCheckins(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'CONFIRMED' } : c
      ))
      setSuccess('Check-in confirmado! Fica bem. 💚')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao confirmar.')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar este check-in de segurança?')) return
    try {
      await api.post(`/checkin/${id}/cancel`)
      setCheckins(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'CANCELLED' } : c
      ))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar.')
    }
  }

  const minDateTime = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString().slice(0, 16)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`,
        padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: C.text2,
            fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ color: C.text, fontFamily: "'Playfair Display',serif",
            fontSize: 20, fontWeight: 700 }}>🔒 Check-in de Encontro</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            Segurança antes de te encontrares com alguém
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Como funciona */}
        <div style={{ background: `${C.border}55`, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
          <div style={{ color: C.primary, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            🛡️ Como funciona
          </div>
          <div style={{ color: C.text2, fontSize: 13, lineHeight: 1.7 }}>
            1. Regista o teu encontro com local e hora.<br/>
            2. Define um contacto de segurança.<br/>
            3. Após o tempo definido, a app pede-te para confirmar que estás bem.<br/>
            4. Se não confirmares, o contacto de segurança recebe um alerta.
          </div>
        </div>

        {/* Sucesso */}
        {success && (
          <div style={{ background: `${C.success}15`, border: `1px solid ${C.success}44`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 16,
            color: C.success, fontSize: 13, lineHeight: 1.5 }}>
            {success}
          </div>
        )}

        {/* Botão novo check-in */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>
            Os teus check-ins
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ background: C.primary, border: 'none', borderRadius: 10,
              padding: '8px 14px', color: '#0A141A', fontWeight: 700,
              fontSize: 13, cursor: 'pointer' }}>
            + Novo
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
              Registar encontro
            </div>

            {error && (
              <div style={{ background: '#E05C7A22', border: '1px solid #E05C7A44',
                borderRadius: 10, padding: '10px 14px', color: colors.red,
                fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              Local do encontro (opcional)
            </label>
            <input style={{ ...inputStyle, marginBottom: 14 }}
              placeholder="Ex: Café X, Rua Y, Lisboa"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              Data e hora do encontro *
            </label>
            <input type="datetime-local"
              style={{ ...inputStyle, marginBottom: 14, colorScheme: 'dark' }}
              min={minDateTime}
              value={form.scheduledAt}
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
            />

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              Pedir check-in após quantas horas?
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[1, 2, 3, 5].map(h => (
                <button key={h} onClick={() => setForm(f => ({ ...f, checkInAfterHours: h }))}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10,
                    border: `1.5px solid ${form.checkInAfterHours === h ? C.primary : C.border}`,
                    background: form.checkInAfterHours === h ? `${C.primary}22` : 'transparent',
                    color: form.checkInAfterHours === h ? C.primary : C.muted,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {h}h
                </button>
              ))}
            </div>

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              Email de contacto de segurança *
            </label>
            <input type="email"
              style={{ ...inputStyle, marginBottom: 6 }}
              placeholder="amigo@email.com"
              value={form.safetyEmail}
              onChange={e => setForm(f => ({ ...f, safetyEmail: e.target.value }))}
            />
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 16, lineHeight: 1.4 }}>
              Esta pessoa recebe um alerta se não fizeres check-in a tempo.
              Não recebe detalhes sobre a tua atividade na app.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowForm(false); setError('') }}
                style={{ flex: 1, background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: 12, color: C.muted, fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={saving}
                style={{ flex: 2, background: C.primary, border: 'none',
                  borderRadius: 12, padding: 12, color: '#0A141A', fontWeight: 700,
                  fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1 }}>
                {saving ? 'A registar...' : '🔒 Registar encontro'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de check-ins */}
        {loading && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
            A carregar...
          </div>
        )}

        {!loading && checkins.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
            <div style={{ color: C.text, fontSize: 15, marginBottom: 6 }}>
              Nenhum check-in ativo
            </div>
            <div style={{ color: C.muted, fontSize: 13 }}>
              Antes de um encontro, regista-o aqui para maior segurança.
            </div>
          </div>
        )}

        {checkins.map(c => {
          const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.SCHEDULED
          const isPending = c.status === 'SCHEDULED'
          const checkInPassed = c.checkInAt && new Date(c.checkInAt) < new Date()

          return (
            <div key={c.id}
              style={{ background: C.bgCard, border: `1px solid ${
                c.status === 'CONFIRMED' ? C.success + '44' :
                c.status === 'ALERT_SENT' ? colors.red + '44' : C.border}`,
                borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                    <span style={{ color: cfg.color, fontSize: 13, fontWeight: 600 }}>
                      {cfg.label}
                    </span>
                  </div>
                  {c.location && (
                    <div style={{ color: C.text, fontSize: 14, marginBottom: 3 }}>
                      📍 {c.location}
                    </div>
                  )}
                  <div style={{ color: C.muted, fontSize: 12 }}>
                    Encontro: {formatDate(c.scheduledAt)}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12 }}>
                    Check-in: {formatDate(c.checkInAt)}
                    {checkInPassed && isPending && (
                      <span style={{ color: colors.red, marginLeft: 6 }}>⚠️ Passou</span>
                    )}
                  </div>
                  {c.safetyEmail && (
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                      🔒 {c.safetyEmail}
                    </div>
                  )}
                </div>
              </div>

              {isPending && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleConfirm(c.id)}
                    style={{ flex: 2, background: C.success, border: 'none',
                      borderRadius: 10, padding: '10px', color: '#0A2010',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    ✅ Estou bem
                  </button>
                  <button onClick={() => handleCancel(c.id)}
                    style={{ flex: 1, background: 'transparent',
                      border: `1px solid ${colors.red}44`, borderRadius: 10,
                      padding: '10px', color: colors.red, fontSize: 13, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
