import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: on ? C.primary : C.input,
      border: `1px solid ${on ? C.primary : C.border}`,
      position: 'relative', cursor: 'pointer', flexShrink: 0,
      transition: 'all 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 3, width: 16, height: 16,
        borderRadius: '50%', background: C.text,
        left: on ? 23 : 3, transition: 'left 0.2s',
      }} />
    </div>
  )
}

function Row({ label, desc, value, onChange, arrow = false, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: C.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{desc}</div>}
      </div>
      {arrow ? <span style={{ color: C.muted, fontSize: 18 }}>›</span>
             : <Toggle on={value} onChange={onChange} />}
    </div>
  )
}

export default function PrivacySettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    visibleInDiscovery: true,
    showDistance: true,
    showOnlineStatus: false,
    invisibleMode: false,
    allowPhotoRequests: true,
    notificationMode: 'DISCREET',
  })
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/privacy').then(r => setSettings(s => ({ ...s, ...r.data }))).catch(() => {}),
      api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const isPremium = sub?.plan !== 'FREE' && sub?.status === 'ACTIVE'

  const save = async (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true); setMsg(''); setError('')
    try {
      await api.put('/privacy', next)
      setMsg('Guardado.')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      const e = err.response?.data?.error || 'Erro ao guardar.'
      if (e.includes('Premium')) {
        setError('Modo invisível requer Between Plus.')
        setSettings(s => ({ ...s, invisibleMode: false }))
      } else {
        setError(e)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 32, color: C.muted, textAlign: 'center' }}>A carregar...</div>

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 'calc(20px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, fontStyle: 'italic', margin: 0 }}>
            Privacidade
          </h1>
        </div>

        {msg   && <div style={{ background: 'rgba(61,214,140,0.1)', border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.green }}>{msg}</div>}
        {error && <div style={{ background: 'rgba(224,92,122,0.1)', border: `1px solid ${C.red}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.red }}>{error}</div>}

        {/* Visibility */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, padding: '10px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Visibilidade</div>
          <Row label="Aparecer no discovery" desc="O teu perfil é mostrado a outros utilizadores"
            value={settings.visibleInDiscovery}
            onChange={v => save({ visibleInDiscovery: v })} />
          <Row label="Mostrar distância aproximada" desc="Outras pessoas vêem a distância em km"
            value={settings.showDistance}
            onChange={v => save({ showDistance: v })} />
          <Row label="Mostrar estado online" desc="Mostrar quando estás activo/a"
            value={settings.showOnlineStatus}
            onChange={v => save({ showOnlineStatus: v })} />
          <Row
            label={<span>Modo invisível {!isPremium && <span style={{ fontSize: 10, color: C.primary, marginLeft: 4 }}>✦ Premium</span>}</span>}
            desc="Navega sem aparecer no discovery"
            value={settings.invisibleMode}
            onChange={v => {
              if (!isPremium && v) { setError('Modo invisível requer Between Plus.'); return }
              save({ invisibleMode: v })
            }} />
        </div>

        {/* Photos */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, padding: '10px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Fotos</div>
          <Row label="Aceitar pedidos de fotos privadas" desc="Outros utilizadores podem pedir acesso às tuas fotos"
            value={settings.allowPhotoRequests}
            onChange={v => save({ allowPhotoRequests: v })} />
        </div>

        {/* Notifications */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, padding: '10px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Notificações</div>
          <Row
            label={`Modo: ${settings.notificationMode === 'DISCREET' ? 'Discreto' : 'Normal'}`}
            desc="Discreto: notificações sem nome nem conteúdo"
            value={settings.notificationMode === 'DISCREET'}
            onChange={v => save({ notificationMode: v ? 'DISCREET' : 'NORMAL' })} />
        </div>

        {/* Contacts */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, padding: '10px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Contactos</div>
          <Row label="Bloquear contactos do telemóvel" desc="Oculta-te de pessoas que tens na agenda"
            arrow onClick={() => navigate('/contacts/block')} />
        </div>

        {/* RGPD */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 16px' }}>
          <div style={{ fontSize: 11, color: C.muted, padding: '10px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Dados e conta</div>
          <Row label="Exportar os meus dados" desc="Download RGPD dos teus dados"
            arrow onClick={() => window.open('/api/auth/export', '_blank')} />
          <Row label="Eliminar conta" desc="Remove todos os teus dados permanentemente"
            arrow onClick={() => navigate('/delete-account')} />
        </div>

        {!isPremium && (
          <div onClick={() => navigate('/premium')} style={{ marginTop: 16, background: 'rgba(201,149,107,0.08)', border: `1px solid rgba(201,149,107,0.2)`, borderRadius: 14, padding: 16, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: C.primary, fontWeight: 600, marginBottom: 4 }}>✦ Between Plus</div>
            <div style={{ fontSize: 12, color: C.muted }}>Desbloqueia modo invisível, Travel Mode e controlo avançado de privacidade.</div>
          </div>
        )}
      </div>
    </div>
  )
}
