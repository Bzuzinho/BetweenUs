import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const colors = {
  bg: '#0E0818', bgCard: '#1A1028', bgInput: '#231535', plum: '#2D1B4E',
  accent: '#C9956B', accentLight: '#E8B89A', rose: '#F2C4B8',
  lavLight: '#B8A9D4', white: '#FAF7F5', muted: '#7A6E88', green: '#3DD68C',
  red: '#E05C7A'
}

const inputStyle = {
  width: '100%', background: colors.bgInput, border: `1.5px solid ${colors.plum}`,
  borderRadius: 12, padding: '12px 16px', color: colors.white, fontSize: 14,
  outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isActive(travel) {
  const now = new Date()
  return new Date(travel.startDate) <= now && new Date(travel.endDate) >= now
}

function isUpcoming(travel) {
  return new Date(travel.startDate) > new Date()
}

export default function TravelPage() {
  const navigate = useNavigate()
  const [travels, setTravels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ city: '', country: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Discovery por cidade
  const [searchCity, setSearchCity] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    api.get('/travel')
      .then(res => setTravels(res.data.travels || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setError('')
    if (!form.city || !form.startDate || !form.endDate) {
      setError('Preenche cidade, data de início e data de fim.')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/travel', form)
      setTravels(prev => [...prev, res.data.travel])
      setShowForm(false)
      setForm({ city: '', country: '', startDate: '', endDate: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar viagem.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/travel/${id}`)
      setTravels(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao apagar viagem.')
    }
  }

  const handleToggleActive = async (travel) => {
    try {
      const res = await api.put(`/travel/${travel.id}`, { active: !travel.active })
      setTravels(prev => prev.map(t => t.id === travel.id ? res.data.travel : t))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro.')
    }
  }

  const handleSearch = async () => {
    if (!searchCity.trim()) return
    setSearching(true)
    setSearchResults(null)
    try {
      const res = await api.get('/travel/discovery', { params: { city: searchCity.trim() } })
      setSearchResults(res.data.results || [])
    } catch (err) {
      alert(err.response?.data?.error || 'Erro na pesquisa.')
    } finally {
      setSearching(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: colors.bgCard, borderBottom: `1px solid ${colors.plum}`,
        padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: colors.lavLight,
            fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ color: colors.white, fontFamily: "'Playfair Display',serif",
            fontSize: 20, fontWeight: 700 }}>✈️ Travel Mode</div>
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            Encontra pessoas na tua próxima cidade
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Explicação */}
        <div style={{ background: `${colors.plum}55`, border: `1px solid ${colors.plum}`,
          borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
          <div style={{ color: colors.accent, fontSize: 13, fontWeight: 600,
            marginBottom: 6 }}>Como funciona</div>
          <div style={{ color: colors.lavLight, fontSize: 13, lineHeight: 1.6 }}>
            Ativa o Travel Mode antes de viajar. Apareces no discovery de pessoas
            nessa cidade durante o teu período de visita. Podes também pesquisar quem
            vai estar na mesma cidade ao mesmo tempo que tu.
          </div>
        </div>

        {/* Minhas viagens */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 14 }}>
            <div style={{ color: colors.white, fontWeight: 600, fontSize: 15 }}>
              As tuas viagens
            </div>
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: colors.accent, border: 'none', borderRadius: 10,
                padding: '8px 14px', color: '#0E0818', fontWeight: 700,
                fontSize: 13, cursor: 'pointer' }}>
              + Adicionar
            </button>
          </div>

          {/* Formulário */}
          {showForm && (
            <div style={{ background: colors.bgCard, border: `1px solid ${colors.plum}`,
              borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ color: colors.white, fontWeight: 600, fontSize: 14,
                marginBottom: 14 }}>Nova viagem</div>

              {error && (
                <div style={{ background: '#E05C7A22', border: '1px solid #E05C7A44',
                  borderRadius: 10, padding: '10px 14px', color: colors.red,
                  fontSize: 13, marginBottom: 12 }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ color: colors.muted, fontSize: 12, display: 'block',
                    marginBottom: 6 }}>Cidade *</label>
                  <input
                    style={inputStyle}
                    placeholder="Lisboa"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.muted, fontSize: 12, display: 'block',
                    marginBottom: 6 }}>País</label>
                  <input
                    style={inputStyle}
                    placeholder="PT"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.muted, fontSize: 12, display: 'block',
                    marginBottom: 6 }}>Data de chegada *</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    min={todayStr}
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.muted, fontSize: 12, display: 'block',
                    marginBottom: 6 }}>Data de partida *</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    min={form.startDate || todayStr}
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowForm(false); setError('') }}
                  style={{ flex: 1, background: 'transparent',
                    border: `1px solid ${colors.plum}`, borderRadius: 12,
                    padding: '12px', color: colors.muted, fontSize: 14,
                    cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={saving}
                  style={{ flex: 2, background: colors.accent, border: 'none',
                    borderRadius: 12, padding: '12px', color: '#0E0818',
                    fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'A guardar...' : 'Criar viagem'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de viagens */}
          {loading && (
            <div style={{ color: colors.muted, fontSize: 13, textAlign: 'center',
              padding: '30px 0' }}>A carregar...</div>
          )}

          {!loading && travels.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
              <div style={{ color: colors.white, fontSize: 15, marginBottom: 6 }}>
                Nenhuma viagem ainda
              </div>
              <div style={{ color: colors.muted, fontSize: 13 }}>
                Adiciona a tua próxima viagem para aparecer no discovery local
              </div>
            </div>
          )}

          {travels.map(travel => {
            const active = isActive(travel)
            const upcoming = isUpcoming(travel)
            const past = !active && !upcoming

            return (
              <div key={travel.id}
                style={{ background: colors.bgCard, border: `1px solid ${
                  active ? colors.green + '66' : colors.plum}`,
                  borderRadius: 16, padding: '16px 18px', marginBottom: 12,
                  opacity: past ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 4 }}>
                      <span style={{ color: colors.white, fontWeight: 600, fontSize: 15 }}>
                        {travel.city}
                        {travel.country && (
                          <span style={{ color: colors.muted, fontWeight: 400,
                            fontSize: 13 }}>, {travel.country}</span>
                        )}
                      </span>
                      {active && (
                        <span style={{ background: colors.green + '22',
                          color: colors.green, borderRadius: 8,
                          padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                          ATIVO
                        </span>
                      )}
                      {upcoming && (
                        <span style={{ background: colors.accent + '22',
                          color: colors.accent, borderRadius: 8,
                          padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                          EM BREVE
                        </span>
                      )}
                      {past && (
                        <span style={{ background: colors.muted + '22',
                          color: colors.muted, borderRadius: 8,
                          padding: '2px 8px', fontSize: 11 }}>
                          PASSADO
                        </span>
                      )}
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13 }}>
                      {formatDate(travel.startDate)} → {formatDate(travel.endDate)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                    {!past && (
                      <button onClick={() => handleToggleActive(travel)}
                        style={{ background: travel.active ? colors.green + '22' : colors.muted + '22',
                          border: 'none', borderRadius: 8, padding: '6px 10px',
                          color: travel.active ? colors.green : colors.muted,
                          fontSize: 12, cursor: 'pointer' }}>
                        {travel.active ? '👁 Visível' : '🙈 Oculto'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(travel.id)}
                      style={{ background: colors.red + '22', border: 'none',
                        borderRadius: 8, padding: '6px 10px', color: colors.red,
                        fontSize: 12, cursor: 'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Discovery por cidade */}
        <div style={{ borderTop: `1px solid ${colors.plum}`, paddingTop: 24 }}>
          <div style={{ color: colors.white, fontWeight: 600, fontSize: 15,
            marginBottom: 6 }}>Pesquisar por cidade</div>
          <div style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>
            Encontra perfis que também viajam para a mesma cidade
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Ex: Porto, Barcelona..."
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={searching}
              style={{ background: colors.accent, border: 'none', borderRadius: 12,
                padding: '0 20px', color: '#0E0818', fontWeight: 700,
                fontSize: 14, cursor: searching ? 'not-allowed' : 'pointer',
                opacity: searching ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {searching ? '...' : 'Pesquisar'}
            </button>
          </div>

          {searchResults !== null && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
              <div style={{ color: colors.muted, fontSize: 13 }}>
                Nenhum perfil com Travel Mode ativo para "{searchCity}"
              </div>
            </div>
          )}

          {searchResults && searchResults.map(result => (
            <div key={result.travelId}
              style={{ background: colors.bgCard, border: `1px solid ${colors.plum}`,
                borderRadius: 16, padding: '14px 16px', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Avatar */}
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg,#3D2060,#1A0A2E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, overflow: 'hidden' }}>
                {result.profile.photos?.[0] ? (
                  <img src={result.profile.photos[0].storagePath} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover',
                      filter: result.profile.photos[0].visibilityLevel === 'BLURRED'
                        ? 'blur(8px)' : 'none' }} />
                ) : (result.profile.type === 'COUPLE' ? '💑' : '🧑')}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: colors.white, fontWeight: 600, fontSize: 14,
                  marginBottom: 2 }}>{result.profile.displayName}</div>
                <div style={{ color: colors.muted, fontSize: 12 }}>
                  {result.city}{result.country && `, ${result.country}`}
                  {' · '}
                  {formatDate(result.startDate)} → {formatDate(result.endDate)}
                </div>
                {result.profile.intentions?.length > 0 && (
                  <div style={{ color: colors.lavLight, fontSize: 11, marginTop: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.profile.intentions.slice(0, 2)
                      .map(i => i.intention?.name).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
