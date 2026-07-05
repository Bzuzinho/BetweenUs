import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import UserNotificationBell from '../components/UserNotificationBell'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

const inputStyle = {
  width:'100%', background:C.bgInput, border:`1.5px solid ${C.border}`,
  borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14,
  outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12
}

// Página de aceitar convite via URL
export function CoupleInvitePage() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.post(`/couples/join/${token}`)
      .then(res => { setStatus('success'); setMsg(res.data.message) })
      .catch(err => {
        setStatus('error')
        setMsg(err.response?.data?.error || 'Erro ao aceitar convite.')
      })
  }, [token, user])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:360, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:24 }}>
          {status === 'loading' ? '⏳' : status === 'success' ? '💑' : '❌'}
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
          color:C.text, marginBottom:12 }}>
          {status === 'loading' ? 'A processar...'
            : status === 'success' ? 'Casal ativado!'
            : 'Erro no convite'}
        </h2>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.6,
          marginBottom:28 }}>{msg}</p>
        {status !== 'loading' && (
          <button onClick={() => navigate('/explore')}
            style={{ background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:'14px 32px',
              fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
            Ir para a app →
          </button>
        )}
      </div>
    </div>
  )
}

// Página principal de gestão do perfil de casal
export default function CouplePage() {
  const navigate = useNavigate()
  const [couple, setCouple] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('check') // check | create | manage
  const [form, setForm] = useState({ coupleDescription:'', partnerEmail:'' })
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/couples/me')
      .then(res => { setCouple(res.data); setStep('manage') })
      .catch(() => setStep('create'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      const res = await api.post('/couples', form)
      setCouple(res.data.couple)
      setInviteUrl(res.data.inviteUrl)
      setStep('manage')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar perfil de casal.')
    } finally { setSaving(false) }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.primary, fontFamily:"'Playfair Display',serif",
        fontSize:20, fontStyle:'italic' }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background:'none', border:'none',
              color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
            fontWeight:700, color:C.text, flex:1 }}>Perfil de Casal</h1>
          <UserNotificationBell />
        </div>

        {step === 'create' && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:24, padding:24 }}>
            <div style={{ fontSize:48, textAlign:'center', marginBottom:16 }}>💑</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
              color:C.text, marginBottom:8, textAlign:'center' }}>
              Criar perfil de casal
            </h2>
            <p style={{ color:C.muted, fontSize:13, textAlign:'center',
              marginBottom:24, lineHeight:1.5 }}>
              Convida o/a teu/tua parceiro/a para explorarem juntos.
              Ambos têm de aprovar cada match.
            </p>

            {error && (
              <div style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
                padding:'12px 16px', marginBottom:16, color:'#F87171', fontSize:13 }}>
                {error}
              </div>
            )}

            <label style={{ display:'block', color:C.text2,
              fontSize:13, marginBottom:6 }}>
              Descrição do casal (opcional)
            </label>
            <textarea style={{ ...inputStyle, minHeight:80, resize:'none' }}
              placeholder="Quem somos e o que procuramos..."
              value={form.coupleDescription}
              onChange={e => setForm(p => ({ ...p, coupleDescription: e.target.value }))} />

            <label style={{ display:'block', color:C.text2,
              fontSize:13, marginBottom:6 }}>
              Email do/a parceiro/a (opcional)
            </label>
            <input style={inputStyle} type="email"
              placeholder="email@exemplo.com"
              value={form.partnerEmail}
              onChange={e => setForm(p => ({ ...p, partnerEmail: e.target.value }))} />

            <button onClick={handleCreate} disabled={saving}
              style={{ width:'100%',
                background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:14, fontSize:15,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                opacity: saving ? 0.7 : 1, fontFamily:'Inter,sans-serif' }}>
              {saving ? 'A criar...' : 'Criar perfil de casal →'}
            </button>
          </div>
        )}

        {step === 'manage' && (
          <>
            {/* Status */}
            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
              borderRadius:20, padding:20, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💑</div>
              <div style={{ fontSize:14, color:C.text, fontWeight:600,
                marginBottom:4 }}>
                {couple?.coupleStatus === 'ACTIVE'
                  ? '✅ Casal ativo' : '⏳ A aguardar parceiro/a'}
              </div>
              {couple?.coupleDescription && (
                <p style={{ color:C.muted, fontSize:13,
                  lineHeight:1.5, marginTop:8 }}>
                  {couple.coupleDescription}
                </p>
              )}
            </div>

            {/* Invite link */}
            {couple?.coupleStatus !== 'ACTIVE' && (
              <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
                borderRadius:20, padding:20, marginBottom:16 }}>
                <div style={{ fontSize:13, color:C.text2,
                  fontWeight:600, marginBottom:12 }}>🔗 Link de convite</div>
                <div style={{ background:C.bgInput, borderRadius:12,
                  padding:'12px 14px', marginBottom:12,
                  fontSize:12, color:C.muted, wordBreak:'break-all',
                  lineHeight:1.5 }}>
                  {inviteUrl || `${window.location.origin}/couple-invite/[token]`}
                </div>
                <button onClick={copyInvite}
                  style={{ width:'100%', background: copied
                    ? 'rgba(61,214,140,0.15)' : C.bgInput,
                    border:`1px solid ${copied ? C.success : C.border}`,
                    borderRadius:12, padding:12, fontSize:13,
                    color: copied ? C.success : C.text2,
                    cursor:'pointer', transition:'all 0.2s',
                    fontFamily:'Inter,sans-serif' }}>
                  {copied ? '✓ Copiado!' : '📋 Copiar link de convite'}
                </button>
              </div>
            )}

            {/* Double Consent info */}
            {couple?.coupleStatus === 'ACTIVE' && (
              <div style={{ background:'rgba(201,149,107,0.08)',
                border:'1px solid rgba(201,149,107,0.2)',
                borderRadius:20, padding:20, marginBottom:16 }}>
                <div style={{ fontSize:13, color:C.primary,
                  fontWeight:600, marginBottom:8 }}>🤝 Double Consent Match</div>
                <p style={{ color:C.muted, fontSize:13, lineHeight:1.5 }}>
                  Nenhum match avança sem aprovação dos dois.
                  Quando alguém der like no vosso perfil, ambos recebem
                  notificação e têm de aprovar.
                </p>
              </div>
            )}

            <button onClick={() => navigate('/explore')}
              style={{ width:'100%',
                background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
                border:'none', borderRadius:50, padding:14, fontSize:15,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                fontFamily:'Inter,sans-serif' }}>
              Explorar como casal →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
