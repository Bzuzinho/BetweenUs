import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGE_OPTIONS } from '../i18n/translations'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

const INP = {
  width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12,
  padding:'13px 16px', color:C.text, fontSize:15, marginBottom:12, display:'block', WebkitAppearance:'none', outline:'none',
}

export default function AccountPage() {
  const { user, refreshUser } = useAuth()
  const { language, setLanguage, t, formatDate } = useI18n()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [form, setForm] = useState({ accountName:'', nif:'', preferredLanguage:language })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [sub, setSub] = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(response => {
      setForm({
        accountName:response.data.accountName || '',
        nif:response.data.nif || '',
        preferredLanguage:response.data.preferredLanguage || language,
      })
      if (response.data.preferredLanguage) setLanguage(response.data.preferredLanguage)
      if (response.data.avatarPath) setAvatarPreview(response.data.avatarPath)
    }).catch(() => {})
    api.get('/subscriptions/me').then(response => setSub(response.data)).catch(() => {})
  }, [])

  const handleAvatarChange = event => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleLanguageChange = value => {
    setForm(previous => ({ ...previous, preferredLanguage:value }))
    setLanguage(value)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    setError('')
    try {
      if (avatar) {
        const formData = new FormData()
        formData.append('avatar', avatar)
        await api.post('/auth/avatar', formData, { headers:{ 'Content-Type':'multipart/form-data' } }).catch(() => {})
      }
      await api.put('/auth/account', {
        accountName:form.accountName,
        nif:form.nif,
        preferredLanguage:form.preferredLanguage,
      })
      await refreshUser()
      setMsg(t('account.updated'))
      setAvatar(null)
    } catch (err) {
      setError(err.response?.data?.error || t('account.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const isPremium = sub?.plan !== 'FREE' && sub?.status === 'ACTIVE'
  const emailVerified = !!user?.emailVerifiedAt
  const initials = (user?.accountName || user?.email || '?')[0].toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'calc(20px + env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', minWidth:44, minHeight:44 }}>←</button>
          <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:0 }}>{t('account.title')}</h1>
          <button onClick={handleSave} disabled={saving} style={{ marginLeft:'auto', background:C.primary, border:'none', borderRadius:50, padding:'8px 20px', fontSize:14, fontWeight:500, color:'#0A141A', cursor:'pointer', opacity:saving ? 0.7 : 1 }}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>

        {msg && <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.success, fontSize:14 }}>{msg}</div>}
        {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:12, padding:'11px 14px', marginBottom:14, color:C.danger, fontSize:14 }}>{error}</div>}

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>{t('account.profileImage')}</div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div onClick={() => fileRef.current?.click()} style={{ width:80, height:80, borderRadius:'50%', background:C.elevated, border:`2px dashed ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', flexShrink:0, position:'relative' }}>
              {avatarPreview ? <img src={avatarPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ fontSize:28, fontWeight:600, color:C.primary }}>{initials}</div>}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(10,20,26,0.7)', padding:'4px 0', textAlign:'center', fontSize:10, color:C.text2 }}>{t('account.change')}</div>
            </div>
            <div>
              <div style={{ fontSize:14, color:C.text, marginBottom:4 }}>{t('account.accountPhoto')}</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{t('account.accountPhotoHelp')}</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange}/>
            </div>
          </div>
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>{t('account.accountData')}</div>
          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('common.email')}</label>
          <div style={{ ...INP, color:C.muted, cursor:'not-allowed', display:'flex', alignItems:'center', marginBottom:12 }}>
            {user?.email}
            <span style={{ marginLeft:'auto', fontSize:11, color:emailVerified ? C.success : C.danger }}>{emailVerified ? `✓ ${t('common.verified')}` : `✗ ${t('common.notVerified')}`}</span>
          </div>

          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('account.realName')} <span style={{ color:C.muted }}>({t('account.private')})</span></label>
          <input style={INP} placeholder={t('account.fullName')} value={form.accountName} onChange={event => setForm(previous => ({ ...previous, accountName:event.target.value }))}/>

          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('account.nif')} <span style={{ color:C.muted }}>({t('account.optional')})</span></label>
          <input style={INP} placeholder={t('account.taxpayer')} value={form.nif} onChange={event => setForm(previous => ({ ...previous, nif:event.target.value }))}/>

          <label style={{ fontSize:13, color:C.text2, display:'block', marginBottom:4 }}>{t('account.appLanguage')}</label>
          <select style={INP} value={form.preferredLanguage} onChange={event => handleLanguageChange(event.target.value)}>
            {LANGUAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{t('account.languageHelp')}</div>
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>{t('account.subscription')}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{isPremium ? 'Between Plus' : t('account.freePlan')}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{isPremium && sub?.currentPeriodEnd ? `${t('account.renewsOn')} ${formatDate(sub.currentPeriodEnd)}` : t('account.noSubscription')}</div>
            </div>
            {isPremium ? <span style={{ fontSize:11, background:C.primaryDim, border:'1px solid rgba(184,167,255,0.3)', borderRadius:20, padding:'4px 12px', color:C.primary }}>✦ {t('common.active')}</span> : <button onClick={() => navigate('/premium')} style={{ background:C.primary, border:'none', borderRadius:50, padding:'8px 16px', fontSize:13, fontWeight:500, color:'#0A141A', cursor:'pointer' }}>{t('account.upgrade')}</button>}
          </div>
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:24, marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>{t('account.accountType')}</div>
          <div style={{ fontSize:15, color:C.text }}>{user?.adminRole || t('common.user')}</div>
        </div>

        <div style={{ background:'rgba(248,113,113,0.04)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:20, padding:24 }}>
          <div style={{ fontSize:11, color:C.danger, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>{t('account.dangerZone')}</div>
          <button onClick={() => navigate('/delete-account')} style={{ background:'none', border:'1px solid rgba(248,113,113,0.3)', borderRadius:10, padding:'10px 16px', fontSize:13, color:C.danger, cursor:'pointer' }}>{t('account.deleteAccount')}</button>
        </div>
      </div>
    </div>
  )
}
