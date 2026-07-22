import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import TravelModeSection from '../components/TravelModeSection'
import UserNotificationBell from '../components/UserNotificationBell'
import { useI18n } from '../i18n/I18nContext'
import { useAuth } from '../context/AuthContext'
import { registerPush, unregisterPush, setAppBadge } from '../lib/push'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3', success:'#4ADE80', danger:'#F87171',
}

function Toggle({ on, onChange, label }) {
  return <button type="button" aria-label={label} aria-pressed={on} onClick={() => onChange(!on)} style={{ width:44, height:24, borderRadius:12, background:on?C.primary:C.input, border:`1px solid ${on?C.primary:C.border}`, position:'relative', cursor:'pointer', flexShrink:0, padding:0 }}>
    <span style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:C.text, left:on?23:3, transition:'left .2s' }}/>
  </button>
}

function Row({ label, desc, value, onChange, arrow=false, onClick }) {
  return <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0', borderBottom:`1px solid ${C.border}`, cursor:onClick?'pointer':'default' }}>
    <div style={{ flex:1 }}><div style={{ fontSize:14, color:C.text }}>{label}</div>{desc && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{desc}</div>}</div>
    {arrow ? <span style={{ color:C.muted, fontSize:18 }}>›</span> : <Toggle on={value} onChange={onChange} label={typeof label === 'string' ? label : undefined}/>} 
  </div>
}

export default function PrivacySettingsPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { refreshUser } = useAuth()
  const [settings, setSettings] = useState({ visibleInDiscovery:true, showDistance:true, showOnlineStatus:true, invisibleMode:false, allowPhotoRequests:true, notificationMode:'DISCREET' })
  const [pushPreferences, setPushPreferences] = useState({
    pushNotificationsEnabled:true,
    appIconBadgeEnabled:true,
    roomMessageNotificationsEnabled:true,
    roomMessagePushEnabled:true,
  })
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/privacy').then(r => setSettings(s => ({ ...s, ...r.data }))).catch(() => {}),
      api.get('/subscriptions/me').then(r => setSub(r.data)).catch(() => {}),
      api.get('/push/preferences').then(r => setPushPreferences(p => ({ ...p, ...r.data }))).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const isPremium = sub?.plan !== 'FREE' && sub?.status === 'ACTIVE'

  const save = async patch => {
    const previous = settings
    const next = { ...settings, ...patch }
    setSettings(next); setMsg(''); setError('')
    try {
      await api.put('/privacy', next)
      setMsg(t('privacySettings.saved'))
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setSettings(previous)
      const premiumError = err.response?.data?.error?.includes('Premium')
      setError(premiumError ? t('privacySettings.premiumRequired') : t('privacySettings.saveError'))
    }
  }

  const savePushPreference = async patch => {
    const previous = pushPreferences
    const next = { ...pushPreferences, ...patch }
    setPushPreferences(next); setMsg(''); setError('')
    try {
      await api.put('/push/preferences', patch)
      if (patch.pushNotificationsEnabled === true) {
        const registered = await registerPush(api, { requestPermission:true })
        if (!registered) throw new Error('PUSH_PERMISSION_NOT_GRANTED')
      }
      if (patch.pushNotificationsEnabled === false) await unregisterPush(api)
      if (patch.appIconBadgeEnabled === false) await setAppBadge(0)
      await refreshUser()
      setMsg(t('privacySettings.saved'))
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setPushPreferences(previous)
      await api.put('/push/preferences', previous).catch(() => {})
      setError(err.message === 'PUSH_PERMISSION_NOT_GRANTED' ? t('privacySettings.pushPermissionError') : t('privacySettings.saveError'))
    }
  }

  if (loading) return <div style={{ padding:32, color:C.muted, textAlign:'center' }}>{t('common.loading')}</div>

  const section = (title, children) => <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'4px 16px', marginBottom:14 }}><div style={{ fontSize:11, color:C.muted, padding:'10px 0 4px', letterSpacing:'.06em', textTransform:'uppercase' }}>{title}</div>{children}</div>

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'calc(20px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom))' }}>
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, minHeight:40 }}><button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:C.muted, fontSize:22 }}>←</button><h1 style={{ fontSize:20, color:C.text, margin:0, flex:1 }}>{t('privacySettings.title')}</h1><UserNotificationBell appBadgeEnabled={pushPreferences.appIconBadgeEnabled}/></div>
      {msg && <div style={{ background:'rgba(74,222,128,.1)', border:`1px solid ${C.success}`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:C.success }}>{msg}</div>}
      {error && <div style={{ background:'rgba(248,113,113,.1)', border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:C.danger }}>{error}</div>}

      {section(t('privacySettings.visibility'), <>
        <Row label={t('privacySettings.discovery')} desc={t('privacySettings.discoveryHelp')} value={settings.visibleInDiscovery} onChange={v => save({ visibleInDiscovery:v })}/>
        <Row label={t('privacySettings.distance')} desc={t('privacySettings.distanceHelp')} value={settings.showDistance} onChange={v => save({ showDistance:v })}/>
        <Row label={t('privacySettings.online')} desc={t('privacySettings.onlineHelp')} value={settings.showOnlineStatus} onChange={v => save({ showOnlineStatus:v })}/>
        <Row label={<span>{t('privacySettings.invisible')} {!isPremium && <small style={{ color:C.primary }}>✦ {t('privacySettings.premium')}</small>}</span>} desc={t('privacySettings.invisibleHelp')} value={settings.invisibleMode} onChange={v => !isPremium && v ? setError(t('privacySettings.premiumRequired')) : save({ invisibleMode:v })}/>
      </>)}

      {section(t('privacySettings.photos'), <Row label={t('privacySettings.photoRequests')} desc={t('privacySettings.photoRequestsHelp')} value={settings.allowPhotoRequests} onChange={v => save({ allowPhotoRequests:v })}/>)}
      {section(t('privacySettings.notifications'), <>
        <Row label={t('privacySettings.push')} desc={t('privacySettings.pushHelp')} value={pushPreferences.pushNotificationsEnabled} onChange={v => savePushPreference({ pushNotificationsEnabled:v })}/>
        <Row label={t('privacySettings.chatBell')} desc={t('privacySettings.chatBellHelp')} value={pushPreferences.roomMessageNotificationsEnabled} onChange={v => savePushPreference({ roomMessageNotificationsEnabled:v })}/>
        <Row label={t('privacySettings.chatPush')} desc={t('privacySettings.chatPushHelp')} value={pushPreferences.roomMessagePushEnabled} onChange={v => savePushPreference({ roomMessagePushEnabled:v })}/>
        <Row label={t('privacySettings.appBadge')} desc={t('privacySettings.appBadgeHelp')} value={pushPreferences.appIconBadgeEnabled} onChange={v => savePushPreference({ appIconBadgeEnabled:v })}/>
        <Row label={`${t('privacySettings.mode')}: ${settings.notificationMode==='DISCREET'?t('privacySettings.discreet'):t('privacySettings.normal')}`} desc={t('privacySettings.notificationHelp')} value={settings.notificationMode==='DISCREET'} onChange={v => save({ notificationMode:v?'DISCREET':'NORMAL' })}/>
      </>)}
      <TravelModeSection helperText={t('privacySettings.travelHelp')}/>
      {section(t('privacySettings.contacts'), <Row label={t('privacySettings.blockContacts')} desc={t('privacySettings.blockContactsHelp')} arrow onClick={() => navigate('/contacts/block')}/>)}
      {section(t('privacySettings.dataAccount'), <>
        <Row label={t('privacySettings.exportData')} desc={t('privacySettings.exportDataHelp')} arrow onClick={() => window.open('/api/auth/export', '_blank')}/>
        <Row label={t('privacySettings.deleteAccount')} desc={t('privacySettings.deleteAccountHelp')} arrow onClick={() => { setMsg(''); setError(t('privacySettings.deleteUnavailable')); window.scrollTo({ top:0, behavior:'smooth' }) }}/>
      </>)}

      {!isPremium && <button onClick={() => navigate('/premium')} style={{ width:'100%', marginTop:2, background:'rgba(184,167,255,.08)', border:'1px solid rgba(184,167,255,.25)', borderRadius:14, padding:16, cursor:'pointer', textAlign:'center' }}><div style={{ fontSize:14, color:C.primary, fontWeight:600, marginBottom:4 }}>✦ Between Plus</div><div style={{ fontSize:12, color:C.muted }}>{t('privacySettings.plusHelp')}</div></button>}
    </div>
  </div>
}
