import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

function Toggle({ on, onChange, label, sub, disabled, locked }) {
  return (
    <div style={{ background:colors.bgCard, border:`1px solid ${locked ? 'rgba(201,149,107,0.3)' : colors.plum}`,
      borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center',
      gap:14, marginBottom:8, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:500, color:colors.white }}>
          {locked && <span style={{ color:colors.accent }}>✦ </span>}{label}
        </div>
        {sub && <div style={{ fontSize:11, color:colors.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={() => !disabled && !locked && onChange(!on)}
        style={{ width:44, height:24, borderRadius:12, position:'relative',
          background: on ? colors.accent : colors.plum,
          cursor: disabled || locked ? 'not-allowed' : 'pointer',
          transition:'background 0.3s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, width:18, height:18, background:'white',
          borderRadius:'50%', transition:'transform 0.3s',
          transform: on ? 'translateX(23px)' : 'translateX(3px)' }} />
      </div>
    </div>
  )
}

export default function PrivacySettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const isPremium = user?.subscription?.plan !== 'FREE'

  useEffect(() => {
    api.get('/privacy')
      .then(r => setSettings(r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const update = async (key, val) => {
    const updated = { ...settings, [key]: val }
    setSettings(updated)
    setSaving(true)
    try {
      await api.put('/privacy', updated)
      setMsg('Guardado ✓')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      const e = err.response?.data
      if (e?.code === 'PREMIUM_REQUIRED') {
        navigate('/premium')
      } else {
        setSettings(settings)
      }
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:colors.bg, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:colors.accent, fontFamily:"'Playfair Display',serif",
        fontSize:20, fontStyle:'italic' }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background:'none', border:'none', color:colors.lavLight,
              fontSize:20, cursor:'pointer' }}>←</button>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              fontWeight:700, color:colors.white }}>Privacidade</h1>
            {msg && <span style={{ color:colors.green, fontSize:12 }}>{msg}</span>}
          </div>
        </div>

        {/* C.1 — Modo discreto */}
        <div style={{ fontSize:11, color:colors.muted, textTransform:'uppercase',
          letterSpacing:1, fontWeight:600, marginBottom:10, paddingLeft:4 }}>
          Modo Discreto
        </div>

        <Toggle on={!!settings.invisibleMode} label="Modo Invisível"
          sub={isPremium ? 'Navega sem aparecer no discovery' : 'Requer Premium — não apareces a ninguém'}
          locked={!isPremium} onChange={v => update('invisibleMode', v)} />

        <Toggle on={!!settings.hideExactDistance} label="Ocultar distância exata"
          sub="Mostra «< 5 km» em vez da distância real"
          onChange={v => update('hideExactDistance', v)} />

        <Toggle on={!!settings.hideCity} label="Ocultar cidade"
          sub="O teu perfil não mostra localização"
          onChange={v => update('hideCity', v)} />

        <Toggle on={settings.showOnlineStatus === true} label="Mostrar «online agora»"
          sub="Outros veem quando estás ativo/a"
          onChange={v => update('showOnlineStatus', v)} />

        <Toggle on={settings.showDistance !== false} label="Mostrar distância aproximada"
          sub="Mostra a tua zona de forma geral"
          onChange={v => update('showDistance', v)} />

        {/* Notificações discretas */}
        <div style={{ fontSize:11, color:colors.muted, textTransform:'uppercase',
          letterSpacing:1, fontWeight:600, marginBottom:10, paddingLeft:4, marginTop:20 }}>
          Notificações
        </div>

        <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:'14px 16px', marginBottom:8 }}>
          <div style={{ fontSize:14, fontWeight:500, color:colors.white, marginBottom:10 }}>
            Modo de notificações
          </div>
          {[
            { val:'NORMAL', label:'Normal', desc:'Mostra nome e conteúdo' },
            { val:'DISCREET', label:'Discreto', desc:'Mostra apenas «Nova mensagem»' },
            { val:'SILENT', label:'Silencioso', desc:'Sem notificações' }
          ].map(opt => (
            <div key={opt.val} onClick={() => update('notificationMode', opt.val)}
              style={{ background: settings.notificationMode === opt.val
                ? 'rgba(201,149,107,0.1)' : colors.bgInput,
                border:`1.5px solid ${settings.notificationMode === opt.val
                  ? colors.accent : colors.plum}`,
                borderRadius:10, padding:'10px 12px', marginBottom:6,
                cursor:'pointer', transition:'all 0.2s' }}>
              <div style={{ color: settings.notificationMode === opt.val
                ? colors.accent : colors.white, fontSize:13, fontWeight:600 }}>
                {opt.label}
              </div>
              <div style={{ color:colors.muted, fontSize:11 }}>{opt.desc}</div>
            </div>
          ))}
        </div>

        {/* Fotos */}
        <div style={{ fontSize:11, color:colors.muted, textTransform:'uppercase',
          letterSpacing:1, fontWeight:600, marginBottom:10, paddingLeft:4, marginTop:20 }}>
          Fotos & Pedidos
        </div>

        <Toggle on={settings.allowPhotoRequests !== false} label="Permitir pedidos de foto"
          sub="Outros podem pedir acesso às tuas fotos privadas"
          onChange={v => update('allowPhotoRequests', v)} />

        {/* RGPD */}
        <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
          borderRadius:14, padding:16, marginTop:20 }}>
          <div style={{ fontSize:12, color:colors.muted, lineHeight:1.7 }}>
            <strong style={{ color:colors.lavLight }}>🇪🇺 RGPD</strong><br/>
            As tuas definições de privacidade são armazenadas de forma segura
            e só utilizadas para personalizar a tua experiência.
            Podes alterar ou remover os teus dados a qualquer momento.
          </div>
        </div>

        {!isPremium && (
          <div style={{ marginTop:20, background:'linear-gradient(135deg,#2D1B4E,#1A0A40)',
            border:'1px solid rgba(201,149,107,0.4)', borderRadius:20, padding:20,
            textAlign:'center' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16,
              color:colors.accent, marginBottom:10 }}>✦ Modo Invisível é Premium</div>
            <button onClick={() => navigate('/premium')}
              style={{ background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                border:'none', borderRadius:50, padding:'12px 28px', fontSize:14,
                fontWeight:700, color:'#1A0A2E', cursor:'pointer' }}>
              Ver planos Premium
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
