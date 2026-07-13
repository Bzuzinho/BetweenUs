import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { setPendingInviteRedirect } from '../lib/pendingInviteRedirect'

const C = {
  bg:'#0A141A', bgCard:'#102129', bgInput:'#0F1E26',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80',
}

// Página de aceitar convite via URL
export function GroupInvitePage() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) {
      // BETA.3 fix — same as CoupleInvitePage, see lib/pendingInviteRedirect.js.
      setPendingInviteRedirect(`/group-invite/${token}`)
      navigate('/login')
      return
    }
    api.post(`/groups/join/${token}`)
      .then(res => { setStatus('success'); setMsg(res.data.message) })
      .catch(err => { setStatus('error'); setMsg(err.response?.data?.error || 'Erro ao aceitar convite.') })
  }, [token, user])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:360, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:24 }}>
          {status === 'loading' ? '⏳' : status === 'success' ? '👥' : '❌'}
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.text, marginBottom:12 }}>
          {status === 'loading' ? 'A processar...' : status === 'success' ? 'Bem-vindo/a ao grupo!' : 'Erro no convite'}
        </h2>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:28 }}>{msg}</p>
        {status !== 'loading' && (
          <button onClick={() => navigate('/explore')} style={{
            background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
            border:'none', borderRadius:50, padding:'14px 32px', fontSize:15,
            fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
            Ir para a app →
          </button>
        )}
      </div>
    </div>
  )
}

export default function GroupPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('check')
  const [sharedDescription, setSharedDescription] = useState('')
  const [inviteEmails, setInviteEmails] = useState([''])
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [invites, setInvites] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/groups/me')
      .then(res => { setProfile(res.data.profile); setMembers(res.data.members || []); setStep('manage') })
      .catch(() => setStep('create'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const updateInviteField = (i, value) => {
    setInviteEmails(prev => prev.map((v, idx) => idx === i ? value : v))
  }
  const addInviteField = () => setInviteEmails(prev => [...prev, ''])

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      const res = await api.post('/groups', {
        sharedDescription,
        inviteEmails: inviteEmails.map(e => e.trim()).filter(Boolean)
      })
      setInvites(res.data.invites || [])
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar perfil de grupo.')
    } finally { setSaving(false) }
  }

  const handleAddInvite = async () => {
    if (!newInviteEmail.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/groups/invite', { email: newInviteEmail.trim() })
      setInvites(prev => [...prev, { email: newInviteEmail.trim(), inviteUrl: res.data.inviteUrl }])
      setNewInviteEmail('')
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao convidar.')
    } finally { setSaving(false) }
  }

  const removeMember = async id => {
    await api.delete(`/groups/members/${id}`).catch(() => {})
    load()
  }

  const copy = url => navigator.clipboard.writeText(url)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.primary, fontFamily:"'Playfair Display',serif", fontSize:20, fontStyle:'italic' }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.text }}>Perfil de Grupo</h1>
        </div>

        {step === 'create' && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:24, padding:24 }}>
            <div style={{ fontSize:48, textAlign:'center', marginBottom:16 }}>👥</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, marginBottom:8, textAlign:'center' }}>
              Criar perfil de grupo
            </h2>
            <p style={{ color:C.muted, fontSize:13, textAlign:'center', marginBottom:24, lineHeight:1.5 }}>
              Trio, poliamor ou grupo personalizado. Convida quem quiseres — cada pessoa entra com o seu próprio email.
            </p>

            <textarea placeholder="Descrição partilhada do grupo (opcional)" value={sharedDescription}
              onChange={e => setSharedDescription(e.target.value)}
              style={{ width:'100%', minHeight:80, background:C.bgInput, border:`1.5px solid ${C.border}`,
                borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14, marginBottom:16,
                fontFamily:'Inter,sans-serif', boxSizing:'border-box', resize:'vertical' }} />

            <div style={{ fontSize:12, color:C.text2, fontWeight:600, marginBottom:8 }}>Convidar por email</div>
            {inviteEmails.map((email, i) => (
              <input key={i} type="email" placeholder="email@exemplo.com" value={email}
                onChange={e => updateInviteField(i, e.target.value)}
                style={{ width:'100%', background:C.bgInput, border:`1.5px solid ${C.border}`,
                  borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14, marginBottom:8,
                  fontFamily:'Inter,sans-serif', boxSizing:'border-box' }} />
            ))}
            <button onClick={addInviteField} style={{ background:'none', border:'none', color:C.primary,
              fontSize:13, cursor:'pointer', marginBottom:16, padding:0 }}>+ Adicionar outra pessoa</button>

            {error && <div style={{ color:'#F87171', fontSize:13, marginBottom:12 }}>{error}</div>}

            <button onClick={handleCreate} disabled={saving} style={{ width:'100%',
              background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600,
              color:'#1A0A2E', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
              {saving ? 'A criar...' : 'Criar perfil de grupo'}
            </button>
          </div>
        )}

        {step === 'manage' && (
          <>
            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
              <div style={{ fontSize:14, color:C.text, fontWeight:600, marginBottom:4 }}>
                {members.filter(m => m.status === 'ACCEPTED').length} membro(s) ativo(s)
              </div>
              {profile?.sharedDescription && (
                <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginTop:8 }}>{profile.sharedDescription}</p>
              )}
            </div>

            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:13, color:C.text2, fontWeight:600, marginBottom:12 }}>Membros</div>
              {members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:13, color:C.text }}>
                      {m.user?.email || m.invitedEmail} {m.isCreator && '· criador/a'}
                    </div>
                    <div style={{ fontSize:11, color: m.status === 'ACCEPTED' ? C.success : C.muted }}>
                      {m.status === 'ACCEPTED' ? '✓ Ativo' : 'A aguardar aceitação'}
                    </div>
                  </div>
                  {!m.isCreator && (
                    <button onClick={() => removeMember(m.id)} style={{ background:'none',
                      border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px',
                      color:C.muted, fontSize:11, cursor:'pointer' }}>Remover</button>
                  )}
                </div>
              ))}

              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <input type="email" placeholder="Convidar mais alguém" value={newInviteEmail}
                  onChange={e => setNewInviteEmail(e.target.value)}
                  style={{ flex:1, background:C.bgInput, border:`1.5px solid ${C.border}`,
                    borderRadius:12, padding:'10px 14px', color:C.text, fontSize:13 }} />
                <button onClick={handleAddInvite} disabled={saving} style={{
                  background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12,
                  padding:'0 16px', color:C.primary, fontSize:13, cursor:'pointer' }}>Convidar</button>
              </div>

              {invites.length > 0 && (
                <div style={{ marginTop:14 }}>
                  {invites.map((inv, i) => (
                    <div key={i} onClick={() => copy(inv.inviteUrl)} style={{
                      background:C.bgInput, borderRadius:10, padding:'8px 12px',
                      fontSize:11, color:C.muted, marginBottom:6, cursor:'pointer', wordBreak:'break-all' }}>
                      📋 {inv.email}: {inv.inviteUrl}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => navigate('/explore')} style={{ width:'100%',
              background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600,
              color:'#1A0A2E', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
              Explorar como grupo →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
