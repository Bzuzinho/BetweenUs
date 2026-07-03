import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

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

export default function AccountPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [form, setForm] = useState({ accountName:'', nif:'' })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [sub, setSub] = useState(null)

  useEffect(() => {
    // Load account data
    api.get('/auth/me').then(r => {
      setForm({ accountName: r.data.accountName || '', nif: r.data.nif || '' })
      if (r.data.avatarPath) setAvatarPreview(r.data.avatarPath)
    }).catch(() => {})
    api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {})
  }, [])

  const handleAvatarChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true); setMsg(''); setError('')
    try {
      // Upload avatar if changed
      if (avatar) {
        const fd = new FormData()
        fd.append('avatar', avatar)
        await api.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {})
      }
      // Save account data
      await api.put('/auth/account', { accountName: form.accountName, nif: form.nif })
      await refreshUser()
      setMsg('Conta actualizada.')
      setAvatar(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  const isPremium = sub?.plan !== 'FREE' && sub?.status === 'ACTIVE'
  const emailVerified = !!user?.emailVerifiedAt
  const initials = (user?.email || '?')[0].toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'calc(20px + env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', minWidth:44, minHeight:44 }}>←</button>
          <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:0 }}>A minha conta</h1>
          <button onClick={handleSave} disabled={saving} style={{ marginLeft:'auto', background:C.primary, border:'none', borderRadius:50, padding:'8px 20px', fontSize:14, fontWeight:500, color:'#0A141A', cursor:'pointer', opacity:saving?0.7:1 }}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>

        {msg   && <div style={{ background:'rgba(74,222,128,0.08)', border:`1px solid rgba(74,222,128,0.25)`, borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.success, fontSize:14 }}>{msg}</div>}
        {error && <div style={{ background:'rgba(248,113,113,0.08)', border:`1px solid rgba(248,113,113,0.25)`, borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:14 }}>{error}</div>}

        {/* Avatar */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Imagem de perfil</div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div onClick={() => fileRef.current?.click()} style={{ width:80, height:80, borderRadius:'50%', background:C.elevated, border:`2px dashed ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', flexShrink:0, position:'relative' }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              ) : (
                <div style={{ fontSize:28, fontWeight:600, color:C.primary }}>{initials}</div>
              )}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(10,20,26,0.7)', padding:'4px 0', textAlign:'center', fontSize:10, color:C.text2 }}>Alterar</div>
            </div>
            <div>
              <div style={{ fontSize:14, color:C.text, marginBottom:4 }}>Foto de conta</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
                Visível no cabeçalho do admin e nas definições.<br/>
                Diferente das fotos do perfil público.
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange}/>
            </div>
          </div>
        </div>

        {/* Account data */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Dados da conta</div>

          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Email</label>
          <div style={{ ...INP, color:C.muted, cursor:'not-allowed', display:'flex', alignItems:'center', marginBottom:12 }}>
            {user?.email}
            {emailVerified
              ? <span style={{ marginLeft:'auto', fontSize:11, color:C.success }}>✓ verificado</span>
              : <span style={{ marginLeft:'auto', fontSize:11, color:C.danger }}>✗ não verificado</span>
            }
          </div>

          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>Nome real <span style={{ color:C.muted }}>(privado)</span></label>
          <input style={INP} placeholder="O teu nome completo" value={form.accountName} onChange={e => setForm(p=>({...p,accountName:e.target.value}))}/>

          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>NIF <span style={{ color:C.muted }}>(opcional)</span></label>
          <input style={INP} placeholder="Contribuinte" value={form.nif} onChange={e => setForm(p=>({...p,nif:e.target.value}))}/>
        </div>

        {/* Subscription info */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Subscrição</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:C.text }}>
                {isPremium ? 'Between Plus' : 'Plano Gratuito'}
              </div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                {isPremium && sub?.currentPeriodEnd
                  ? `Renova em ${new Date(sub.currentPeriodEnd).toLocaleDateString('pt')}`
                  : 'Sem subscrição activa'}
              </div>
            </div>
            {isPremium
              ? <span style={{ fontSize:11, background:C.primaryDim, border:`1px solid rgba(184,167,255,0.3)`, borderRadius:20, padding:'4px 12px', color:C.primary }}>✦ Activo</span>
              : <button onClick={() => navigate('/premium')} style={{ background:C.primary, border:'none', borderRadius:50, padding:'8px 16px', fontSize:13, fontWeight:500, color:'#0A141A', cursor:'pointer' }}>Upgrade</button>
            }
          </div>
        </div>

        {/* Role info */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Tipo de conta</div>
          <div style={{ fontSize:15, color:C.text }}>
            {user?.adminRole || 'Utilizador'}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ background:'rgba(248,113,113,0.04)', border:`1px solid rgba(248,113,113,0.15)`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:11, color:C.danger, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Zona de perigo</div>
          <button onClick={() => navigate('/delete-account')} style={{ background:'none', border:`1px solid rgba(248,113,113,0.3)`, borderRadius:10, padding:'10px 16px', fontSize:13, color:C.danger, cursor:'pointer' }}>
            Eliminar conta e todos os dados
          </button>
        </div>
      </div>
    </div>
  )
}
