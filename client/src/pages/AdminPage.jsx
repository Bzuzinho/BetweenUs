import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const colors = {
  bg: '#0E0818', bgCard: '#1A1028', bgInput: '#231535', plum: '#2D1B4E',
  accent: '#C9956B', rose: '#F2C4B8', lavLight: '#B8A9D4',
  white: '#FAF7F5', muted: '#7A6E88', green: '#3DD68C', red: '#E05C7A'
}

const inputStyle = {
  width: '100%', background: colors.bgInput, border: `1.5px solid ${colors.plum}`,
  borderRadius: 10, padding: '10px 14px', color: colors.white, fontSize: 13,
  outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box'
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: colors.bgCard, border: `1px solid ${colors.plum}`,
      borderRadius: 14, padding: '14px 16px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26,
        fontWeight: 700, color: color || colors.accent }}>{value ?? '—'}</div>
      <div style={{ color: colors.muted, fontSize: 11, marginTop: 3,
        textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('beta') // beta | stats
  const [invites, setInvites] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form para criar convites
  const [form, setForm] = useState({ count: 1, email: '', maxUses: 1, expiresInDays: '', note: '' })
  const [creating, setCreating] = useState(false)
  const [newCodes, setNewCodes] = useState([])
  const [copied, setCopied] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, statRes] = await Promise.all([
        api.get('/beta/invites'),
        api.get('/beta/stats')
      ])
      setInvites(invRes.data.invites || [])
      setStats(statRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Sem permissão de admin.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setNewCodes([])
    try {
      const res = await api.post('/beta/invites', {
        count: Number(form.count),
        email: form.email || undefined,
        maxUses: Number(form.maxUses),
        expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined,
        note: form.note || undefined
      })
      setNewCodes(res.data.codes || [])
      setInvites(prev => [...res.data.created, ...prev])
      setForm({ count: 1, email: '', maxUses: 1, expiresInDays: '', note: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar convites.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (invite) => {
    try {
      await api.put(`/beta/invites/${invite.id}`, { active: !invite.active })
      setInvites(prev => prev.map(i =>
        i.id === invite.id ? { ...i, active: !i.active } : i
      ))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Apagar este convite?')) return
    try {
      await api.delete(`/beta/invites/${id}`)
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao apagar.')
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(newCodes.join('\n'))
    setCopied('all')
    setTimeout(() => setCopied(''), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: colors.accent, fontFamily: "'Playfair Display',serif",
        fontSize: 18, fontStyle: 'italic' }}>A carregar painel admin...</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ color: colors.red, fontSize: 16, marginBottom: 8 }}>{error}</div>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: `1px solid ${colors.plum}`,
            borderRadius: 10, padding: '10px 20px', color: colors.muted,
            cursor: 'pointer' }}>← Voltar</button>
      </div>
    </div>
  )

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
            fontSize: 20, fontWeight: 700 }}>⚙️ Painel Admin</div>
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Between Us</div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <StatCard label="Utilizadores" value={stats.users?.total} />
            <StatCard label="Convites" value={stats.invites?.total} />
            <StatCard label="Usados" value={stats.invites?.used} color={colors.green} />
            <StatCard label="Ativos" value={stats.invites?.active} color={colors.accent} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, margin: '0 16px 16px',
        background: colors.bgCard, border: `1px solid ${colors.plum}`,
        borderRadius: 12, overflow: 'hidden' }}>
        {[{ key: 'beta', label: '🎟 Convites Beta' }, { key: 'create', label: '+ Criar' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
              background: tab === t.key ? colors.plum : 'transparent',
              color: tab === t.key ? colors.white : colors.muted,
              fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: tab === t.key ? 600 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Criar convites */}
        {tab === 'create' && (
          <div style={{ background: colors.bgCard, border: `1px solid ${colors.plum}`,
            borderRadius: 16, padding: 20 }}>
            <div style={{ color: colors.white, fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
              Criar códigos de convite
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: colors.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                  Quantidade
                </label>
                <input type="number" min="1" max="50"
                  style={inputStyle} value={form.count}
                  onChange={e => setForm(f => ({ ...f, count: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: colors.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                  Usos por código
                </label>
                <input type="number" min="1"
                  style={inputStyle} value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: colors.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                  Expira em (dias)
                </label>
                <input type="number" min="1" placeholder="Nunca"
                  style={inputStyle} value={form.expiresInDays}
                  onChange={e => setForm(f => ({ ...f, expiresInDays: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ color: colors.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                Reservar para email (opcional)
              </label>
              <input type="email" placeholder="email@exemplo.com"
                style={inputStyle} value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: colors.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                Nota interna (opcional)
              </label>
              <input placeholder="Ex: Influencer X, parceiro Y..."
                style={inputStyle} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>

            <button onClick={handleCreate} disabled={creating}
              style={{ width: '100%', background: colors.accent, border: 'none',
                borderRadius: 12, padding: '13px', color: '#0E0818', fontWeight: 700,
                fontSize: 14, cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.7 : 1 }}>
              {creating ? 'A criar...' : `Criar ${form.count} código${form.count > 1 ? 's' : ''}`}
            </button>

            {/* Códigos gerados */}
            {newCodes.length > 0 && (
              <div style={{ marginTop: 16, background: `${colors.green}11`,
                border: `1px solid ${colors.green}44`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ color: colors.green, fontWeight: 600, fontSize: 13 }}>
                    ✅ {newCodes.length} código{newCodes.length > 1 ? 's' : ''} criado{newCodes.length > 1 ? 's' : ''}
                  </div>
                  {newCodes.length > 1 && (
                    <button onClick={copyAll}
                      style={{ background: 'none', border: `1px solid ${colors.green}55`,
                        borderRadius: 8, padding: '4px 10px', color: colors.green,
                        fontSize: 12, cursor: 'pointer' }}>
                      {copied === 'all' ? '✓ Copiado!' : 'Copiar todos'}
                    </button>
                  )}
                </div>
                {newCodes.map(code => (
                  <div key={code}
                    onClick={() => copyCode(code)}
                    style={{ background: colors.bgInput, borderRadius: 8,
                      padding: '8px 12px', marginBottom: 6, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      border: `1px solid ${copied === code ? colors.green : colors.plum}` }}>
                    <span style={{ color: colors.white, fontFamily: 'monospace',
                      fontSize: 14, letterSpacing: 1 }}>{code}</span>
                    <span style={{ color: copied === code ? colors.green : colors.muted,
                      fontSize: 11 }}>{copied === code ? '✓' : 'copiar'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de convites */}
        {tab === 'beta' && (
          <>
            <div style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
              {invites.length} convite{invites.length !== 1 ? 's' : ''} no total
            </div>

            {invites.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎟️</div>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  Nenhum convite criado ainda. Vai ao separador "+ Criar".
                </div>
              </div>
            )}

            {invites.map(invite => (
              <div key={invite.id}
                style={{ background: colors.bgCard, border: `1px solid ${
                  invite.active && invite.useCount < invite.maxUses ? colors.plum : colors.muted + '44'}`,
                  borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                  opacity: !invite.active ? 0.6 : 1 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 6 }}>
                  <div onClick={() => copyCode(invite.code)} style={{ cursor: 'pointer' }}>
                    <span style={{ color: colors.white, fontFamily: 'monospace',
                      fontSize: 15, fontWeight: 600, letterSpacing: 1 }}>
                      {invite.code}
                    </span>
                    {copied === invite.code && (
                      <span style={{ color: colors.green, fontSize: 11, marginLeft: 8 }}>✓</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleToggle(invite)}
                      style={{ background: 'none', border: `1px solid ${colors.plum}`,
                        borderRadius: 8, padding: '4px 8px', fontSize: 11,
                        color: invite.active ? colors.green : colors.muted, cursor: 'pointer' }}>
                      {invite.active ? '● Ativo' : '○ Inativo'}
                    </button>
                    <button onClick={() => handleDelete(invite.id)}
                      style={{ background: 'none', border: `1px solid ${colors.red}33`,
                        borderRadius: 8, padding: '4px 8px', fontSize: 11,
                        color: colors.red, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: colors.muted, fontSize: 11 }}>
                    {invite.useCount}/{invite.maxUses} usos
                  </span>
                  {invite.email && (
                    <span style={{ color: colors.lavLight, fontSize: 11 }}>
                      📧 {invite.email}
                    </span>
                  )}
                  {invite.usedByEmail && (
                    <span style={{ color: colors.green, fontSize: 11 }}>
                      ✓ {invite.usedByEmail}
                    </span>
                  )}
                  {invite.expiresAt && (
                    <span style={{ color: colors.accent, fontSize: 11 }}>
                      ⏰ {new Date(invite.expiresAt).toLocaleDateString('pt-PT')}
                    </span>
                  )}
                  {invite.note && (
                    <span style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic' }}>
                      "{invite.note}"
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
