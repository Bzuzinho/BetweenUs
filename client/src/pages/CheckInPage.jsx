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
  width: '100%', background: C.input, border: `1.5px solid ${C.border}`,
  borderRadius: 12, padding: '12px 16px', color: C.text, fontSize: 14,
  outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box'
}

function formatDate(d) {
  return new Date(d).toLocaleString('pt-PT', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

const STATUS_CONFIG = {
  SCHEDULED:   { label: 'Agendado',      color: C.primary, icon: '⏰' },
  CONFIRMED:   { label: 'Confirmado',    color: C.success, icon: '✅' },
  CANCELLED:   { label: 'Cancelado',     color: C.muted,   icon: '❌' },
  ALERT_SENT:  { label: 'Alerta enviado',color: C.danger,  icon: '🚨' },
}

export default function CheckInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const matchId = searchParams.get('match')

  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ locationHint: '', scheduledAt: '', safetyEmail: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    api.get('/safety/checkins/me')
      .then(res => setCheckins(res.data.checkins || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async () => {
    setError('')
    if (!form.scheduledAt) return setError('Hora do encontro obrigatória.')
    if (form.safetyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.safetyEmail)) {
      return setError('Email de contacto inválido.')
    }

    setSaving(true)
    try {
      const res = await api.post('/safety/checkin', { ...form, ...(matchId && { matchId }) })
      setSuccess(res.data.message)
      setShowForm(false)
      setForm({ locationHint: '', scheduledAt: '', safetyEmail: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar check-in.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async (id) => {
    try {
      await api.put(`/safety/checkin/${id}/confirm`)
      setCheckins(prev => prev.map(c => c.id === id ? { ...c, status: 'CONFIRMED' } : c))
      setSuccess('Check-in confirmado! Fica bem. 💚')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao confirmar.')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar este check-in de segurança?')) return
    try {
      await api.put(`/safety/checkin/${id}/cancel`)
      setCheckins(prev => prev.map(c => c.id === id ? { ...c, status: 'CANCELLED' } : c))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar.')
    }
  }

  const minDateTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 40 }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: C.text2, fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ color: C.text, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700 }}>
            🔒 Check-in de Encontro
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            Segurança antes de te encontrares com alguém
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: `${C.border}55`, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
          <div style={{ color: C.primary, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🛡️ Como funciona</div>
          <div style={{ color: C.text2, fontSize: 13, lineHeight: 1.7 }}>
            1. Regista o teu encontro com local e hora.<br/>
            2. Depois do encontro, confirma aqui que estás bem.<br/>
            3. O envio automático de alerta a um contacto ainda não está disponível —
            por agora, combina diretamente com essa pessoa que lhe vais escrever se algo correr mal.
          </div>
        </div>

        {success && (
          <div style={{ background: `${C.success}15`, border: `1px solid ${C.success}44`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 16, color: C.success, fontSize: 13, lineHeight: 1.5 }}>
            {success}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>Os teus check-ins</div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ background: C.primary, border: 'none', borderRadius: 10, padding: '8px 14px',
              color: '#0A141A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + Novo
          </button>
        </div>

        {showForm && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Registar encontro</div>

            {error && (
              <div style={{ background: `${C.danger}22`, border: `1px solid ${C.danger}44`,
                borderRadius: 10, padding: '10px 14px', color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Local do encontro (opcional)</label>
            <input style={{ ...inputStyle, marginBottom: 14 }} placeholder="Ex: Café X, Rua Y, Lisboa"
              value={form.locationHint} onChange={e => setForm(f => ({ ...f, locationHint: e.target.value }))} />

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Data e hora do encontro *</label>
            <input type="datetime-local" style={{ ...inputStyle, marginBottom: 14, colorScheme: 'dark' }}
              min={minDateTime} value={form.scheduledAt}
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              Contacto de confiança (opcional — guardado, mas sem alerta automático por agora)
            </label>
            <input type="email" style={{ ...inputStyle, marginBottom: 6 }} placeholder="amigo@email.com"
              value={form.safetyEmail} onChange={e => setForm(f => ({ ...f, safetyEmail: e.target.value }))} />
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 16, lineHeight: 1.4 }}>
              Fica só guardado para tua referência — ainda não enviamos alertas automáticos.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowForm(false); setError('') }}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: 12, color: C.muted, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving}
                style={{ flex: 2, background: C.primary, border: 'none', borderRadius: 12, padding: 12,
                  color: '#0A141A', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'A registar...' : '🔒 Registar encontro'}
              </button>
            </div>
          </div>
        )}

        {loading && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '30px 0' }}>A carregar...</div>}

        {!loading && checkins.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
            <div style={{ color: C.text, fontSize: 15, marginBottom: 6 }}>Nenhum check-in ativo</div>
            <div style={{ color: C.muted, fontSize: 13 }}>Antes de um encontro, regista-o aqui para maior segurança.</div>
          </div>
        )}

        {checkins.map(c => {
          const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.SCHEDULED
          const isPending = c.status === 'SCHEDULED'

          return (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${
              c.status === 'CONFIRMED' ? C.success + '44' : c.status === 'ALERT_SENT' ? C.danger + '44' : C.border}`,
              borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                <span style={{ color: cfg.color, fontSize: 13, fontWeight: 600 }}>{cfg.label}</span>
              </div>
              {c.locationHint && (
                <div style={{ color: C.text, fontSize: 14, marginBottom: 3 }}>📍 {c.locationHint}</div>
              )}
              <div style={{ color: C.muted, fontSize: 12 }}>Encontro: {formatDate(c.scheduledAt)}</div>
              {c.safetyEmail && (
                <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>🔒 {c.safetyEmail}</div>
              )}

              {isPending && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => handleConfirm(c.id)}
                    style={{ flex: 2, background: C.success, border: 'none', borderRadius: 10, padding: '10px',
                      color: '#0A2010', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✅ Estou bem</button>
                  <button onClick={() => handleCancel(c.id)}
                    style={{ flex: 1, background: 'transparent', border: `1px solid ${C.danger}44`, borderRadius: 10,
                      padding: '10px', color: C.danger, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
