import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', bgCard:'#102129', bgInput:'#0F1E26', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA',
  text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80', danger:'#F87171',
}

export function GroupInvitePage() {
  const { token } = useParams()
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.post(`/groups/join/${token}`)
      .then(() => { setStatus('success'); setMessage(t('group.joinSuccess')) })
      .catch(() => { setStatus('error'); setMessage(t('group.joinError')) })
  }, [token, user, navigate, t])

  return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
    <div style={{ maxWidth:360, width:'100%', textAlign:'center' }}>
      <div style={{ fontSize:60, marginBottom:24 }}>{status === 'loading' ? '⏳' : status === 'success' ? '👥' : '❌'}</div>
      <h2 style={{ fontSize:24, color:C.text, marginBottom:12 }}>
        {status === 'loading' ? t('group.processing') : status === 'success' ? t('group.joined') : t('group.inviteErrorTitle')}
      </h2>
      <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:28 }}>{message}</p>
      {status !== 'loading' && <button onClick={() => navigate('/explore')} style={{ background:C.primary, border:'none', borderRadius:50, padding:'14px 32px', fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>{t('group.goApp')}</button>}
    </div>
  </div>
}

export default function GroupPage() {
  const navigate = useNavigate()
  const { t, formatNumber } = useI18n()
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
      .then(response => { setProfile(response.data.profile); setMembers(response.data.members || []); setStep('manage') })
      .catch(() => setStep('create'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const updateInviteField = (index, value) => setInviteEmails(previous => previous.map((item, itemIndex) => itemIndex === index ? value : item))
  const addInviteField = () => setInviteEmails(previous => [...previous, ''])

  const create = async () => {
    setSaving(true); setError('')
    try {
      const response = await api.post('/groups', { sharedDescription, inviteEmails:inviteEmails.map(email => email.trim()).filter(Boolean) })
      setInvites(response.data.invites || [])
      load()
    } catch {
      setError(t('group.createError'))
    } finally { setSaving(false) }
  }

  const invite = async () => {
    if (!newInviteEmail.trim()) return
    setSaving(true); setError('')
    try {
      const response = await api.post('/groups/invite', { email:newInviteEmail.trim() })
      setInvites(previous => [...previous, { email:newInviteEmail.trim(), inviteUrl:response.data.inviteUrl }])
      setNewInviteEmail('')
      load()
    } catch {
      setError(t('group.inviteError'))
    } finally { setSaving(false) }
  }

  const removeMember = async id => {
    setError('')
    try { await api.delete(`/groups/members/${id}`); load() }
    catch { setError(t('group.inviteError')) }
  }

  const copy = async url => {
    try { await navigator.clipboard.writeText(url) }
    catch { setError(t('group.copyError')) }
  }

  if (loading) return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:C.primary, fontSize:20 }}>{t('group.loading')}</div></div>

  const card = { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }
  const input = { width:'100%', background:C.bgInput, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'13px 16px', color:C.text, fontSize:14, boxSizing:'border-box' }

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button aria-label="back" onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:24, fontWeight:700, color:C.text }}>{t('group.title')}</h1>
      </div>

      {error && <div style={{ color:C.danger, fontSize:13, marginBottom:12 }}>{error}</div>}

      {step === 'create' && <div style={{ ...card, borderRadius:24, padding:24 }}>
        <div style={{ fontSize:48, textAlign:'center', marginBottom:16 }}>👥</div>
        <h2 style={{ fontSize:20, color:C.text, marginBottom:8, textAlign:'center' }}>{t('group.createTitle')}</h2>
        <p style={{ color:C.muted, fontSize:13, textAlign:'center', marginBottom:24, lineHeight:1.5 }}>{t('group.createHelp')}</p>
        <textarea placeholder={t('group.description')} value={sharedDescription} onChange={event => setSharedDescription(event.target.value)} style={{ ...input, minHeight:80, marginBottom:16, resize:'vertical' }} />
        <div style={{ fontSize:12, color:C.text2, fontWeight:600, marginBottom:8 }}>{t('group.inviteByEmail')}</div>
        {inviteEmails.map((email, index) => <input key={index} type="email" placeholder="email@example.com" value={email} onChange={event => updateInviteField(index, event.target.value)} style={{ ...input, marginBottom:8 }} />)}
        <button onClick={addInviteField} style={{ background:'none', border:'none', color:C.primary, fontSize:13, cursor:'pointer', marginBottom:16, padding:0 }}>{t('group.addPerson')}</button>
        <button onClick={create} disabled={saving} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer', opacity:saving ? 0.7 : 1 }}>{saving ? t('group.creating') : t('group.create')}</button>
      </div>}

      {step === 'manage' && <>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
          <div style={{ fontSize:14, color:C.text, fontWeight:600, marginBottom:4 }}>{formatNumber(members.filter(member => member.status === 'ACCEPTED').length)} {t('group.activeMembers')}</div>
          {profile?.sharedDescription && <p style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginTop:8 }}>{profile.sharedDescription}</p>}
        </div>

        <div style={card}>
          <div style={{ fontSize:13, color:C.text2, fontWeight:600, marginBottom:12 }}>{t('group.members')}</div>
          {members.map(member => <div key={member.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize:13, color:C.text }}>{member.user?.email || member.invitedEmail} {member.isCreator && `· ${t('group.creator')}`}</div>
              <div style={{ fontSize:11, color:member.status === 'ACCEPTED' ? C.success : C.muted }}>{member.status === 'ACCEPTED' ? `✓ ${t('group.active')}` : t('group.waiting')}</div>
            </div>
            {!member.isCreator && <button onClick={() => removeMember(member.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', color:C.muted, fontSize:11, cursor:'pointer' }}>{t('group.remove')}</button>}
          </div>)}

          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <input type="email" placeholder={t('group.inviteMore')} value={newInviteEmail} onChange={event => setNewInviteEmail(event.target.value)} style={{ ...input, flex:1, padding:'10px 14px' }} />
            <button onClick={invite} disabled={saving} style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'0 16px', color:C.primary, fontSize:13, cursor:'pointer' }}>{t('group.invite')}</button>
          </div>

          {invites.length > 0 && <div style={{ marginTop:14 }}>{invites.map((item, index) => <button key={index} onClick={() => copy(item.inviteUrl)} style={{ width:'100%', textAlign:'left', background:C.bgInput, border:'none', borderRadius:10, padding:'8px 12px', fontSize:11, color:C.muted, marginBottom:6, cursor:'pointer', wordBreak:'break-all' }}>📋 {item.email}: {item.inviteUrl}</button>)}</div>}
        </div>

        <button onClick={() => navigate('/explore')} style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:14, fontSize:15, fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>{t('group.explore')}</button>
      </>}
    </div>
  </div>
}
