import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'

const C = {
  surface:'#102129', border:'#1E3340', input:'#0F1E26', primary:'#B8A7FF',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80',
  danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)', warning:'#FBBF24',
}
const smallBtn = { flex:1, border:'none', borderRadius:10, padding:'8px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }
const consentStatusColor = { PENDING:C.warning, ACCEPTED:C.success, DECLINED:C.danger, EXPIRED:C.muted, REVOKED:C.danger }
const phases = ['CHAT','PHOTO_REQUEST','FACE_REVEAL','VIDEO_CALL','MEETING_PROPOSAL']
const reportReasons = ['HARASSMENT','OFFENSIVE_CONTENT','NON_CONSENSUAL_IMAGE','THREAT','FAKE_PROFILE','OTHER']

function Sheet({ onClose, title, children }) {
  return <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:250, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'20px 20px calc(28px + env(safe-area-inset-bottom))', maxHeight:'82vh', overflowY:'auto' }} onClick={event => event.stopPropagation()}>
      <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 16px' }}/>
      <h3 style={{ color:C.text, fontSize:17, fontWeight:500, margin:'0 0 14px' }}>{title}</h3>
      {children}
    </div>
  </div>
}

export function RoomRulesModal({ roomId, onClose, onChanged }) {
  const { t, formatNumber } = useI18n()
  const [consent, setConsent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/rooms/${roomId}/rules`)
      .then(response => setConsent(response.data.consent))
      .catch(() => setError(t('rooms.genericError')))
      .finally(() => setLoading(false))
  }, [roomId, t])

  useEffect(() => { load() }, [load])

  const update = async action => {
    setBusy(true); setError('')
    try {
      await api.post(`/rooms/${roomId}/rules/${action}`)
      await load()
      onChanged?.()
    } catch { setError(t('rooms.genericError')) }
    finally { setBusy(false) }
  }

  return <Sheet onClose={onClose} title={`📌 ${t('rooms.rulesTitle')}`}>
    <p style={{ color:C.muted, fontSize:12, lineHeight:1.6, marginBottom:16 }}>{t('rooms.rulesHelp')}</p>
    {error && <div style={{ color:C.danger, fontSize:12, marginBottom:12 }}>{error}</div>}
    {loading && <div style={{ color:C.muted, fontSize:13 }}>{t('rooms.loading')}</div>}
    {!loading && !consent && <div style={{ color:C.muted, fontSize:13 }}>{t('rooms.noRules')}</div>}
    {consent && <>
      <div style={{ fontSize:12, color:C.text2, marginBottom:10 }}>
        {t('rooms.version')} {formatNumber(consent.version)} · {consent.status === 'ACTIVE' ? `✅ ${t('rooms.active')}` : `⏳ ${t('rooms.waitingAcceptance')}`} · {formatNumber(consent.approvedCount)}/{formatNumber(consent.requiredCount)} {t('rooms.acceptedCount')}
      </div>
      {(consent.rules || []).map(rule => <div key={rule.id} style={{ padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>{rule.ruleType}</div>
        <div style={{ fontSize:13, color:C.text }}>{rule.label}</div>
      </div>)}
      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        {consent.status !== 'ACTIVE'
          ? <button onClick={() => update('accept')} disabled={busy} style={{ flex:1, background:C.primary, border:'none', borderRadius:50, padding:12, color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', opacity:busy ? .6 : 1 }}>{t('rooms.acceptRules')}</button>
          : <button onClick={() => update('revoke')} disabled={busy} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:50, padding:12, color:C.muted, fontSize:13, cursor:'pointer', opacity:busy ? .6 : 1 }}>{t('rooms.revokeRules')}</button>}
      </div>
    </>}
  </Sheet>
}

export function RoomSafeExitModal({ room, onClose, onLeft }) {
  const { t } = useI18n()
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [confirmReport, setConfirmReport] = useState(false)
  const [reportReason, setReportReason] = useState('HARASSMENT')
  const [targetUserId, setTargetUserId] = useState(room.members?.find(member => member.userId)?.userId || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const otherMembers = room.members || []

  const run = async operation => {
    setBusy(true); setError('')
    try { await operation() }
    catch { setError(t('rooms.genericError')) }
    finally { setBusy(false) }
  }

  const leaveRoom = () => run(async () => { await api.delete(`/rooms/${room.id}/leave`); onLeft() })
  const deleteLocalHistory = () => {
    try { localStorage.removeItem(`room-cache-${room.id}`) } catch {}
    setMessage(t('rooms.localDeleted'))
  }
  const hideProfile = () => run(async () => { await api.put('/privacy', { visibleInDiscovery:false }); setMessage(t('rooms.profileHidden')) })
  const blockUser = () => run(async () => {
    if (!targetUserId) return
    const member = otherMembers.find(item => item.userId === targetUserId)
    const profileId = member?.user?.profile?.id
    if (!profileId) throw new Error('missing profile')
    await api.post(`/privacy/block/${profileId}`)
    setMessage(t('rooms.blocked'))
    setConfirmBlock(false)
  })
  const reportUser = () => run(async () => {
    if (!targetUserId) return
    await api.post('/reports', { reportedUserId:targetUserId, reason:reportReason, details:`Private Room ${room.id}` })
    setMessage(t('rooms.reported'))
    setConfirmReport(false)
  })

  const buttonStyle = { width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:8, textAlign:'left', color:C.text, fontSize:14, cursor:'pointer' }

  return <Sheet onClose={onClose} title={`🚪 ${t('rooms.safeExit')}`}>
    {message && <div style={{ background:'rgba(74,222,128,.1)', border:'1px solid rgba(74,222,128,.25)', borderRadius:10, padding:'10px 14px', marginBottom:14, color:C.success, fontSize:13 }}>{message}</div>}
    {error && <div style={{ background:C.dangerDim, border:'1px solid rgba(248,113,113,.25)', borderRadius:10, padding:'10px 14px', marginBottom:14, color:C.danger, fontSize:13 }}>{error}</div>}
    <button onClick={leaveRoom} disabled={busy} style={buttonStyle}>🚪 {t('rooms.leave')}</button>
    <button onClick={deleteLocalHistory} style={buttonStyle}>🗑 {t('rooms.deleteLocal')}</button>
    <button onClick={hideProfile} disabled={busy} style={buttonStyle}>🙈 {t('rooms.hideProfile')}</button>
    <button onClick={() => window.open('/safety', '_self')} style={buttonStyle}>💚 {t('rooms.safetyHelp')}</button>

    {otherMembers.length > 0 && <select value={targetUserId} onChange={event => setTargetUserId(event.target.value)} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', color:C.text, fontSize:13, marginBottom:8 }}>
      {otherMembers.map(member => <option key={member.userId} value={member.userId}>{member.user?.profile?.displayName || member.userId}</option>)}
    </select>}

    {!confirmBlock
      ? <button onClick={() => setConfirmBlock(true)} style={{ ...buttonStyle, background:C.dangerDim, border:'1px solid rgba(248,113,113,.3)', color:C.danger }}>🚫 {t('rooms.block')}</button>
      : <div style={{ background:C.dangerDim, border:'1px solid rgba(248,113,113,.3)', borderRadius:14, padding:14, marginBottom:8 }}>
          <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{t('rooms.blockConfirm')}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirmBlock(false)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.muted, fontSize:12, cursor:'pointer' }}>{t('rooms.cancel')}</button>
            <button onClick={blockUser} disabled={busy} style={{ flex:1, background:C.danger, border:'none', borderRadius:10, padding:10, color:'#1A0A0A', fontWeight:600, fontSize:12, cursor:'pointer' }}>{t('rooms.confirmBlock')}</button>
          </div>
        </div>}

    {!confirmReport
      ? <button onClick={() => setConfirmReport(true)} style={{ ...buttonStyle, background:C.dangerDim, border:'1px solid rgba(248,113,113,.3)', color:C.danger }}>⚠️ {t('rooms.report')}</button>
      : <div style={{ background:C.dangerDim, border:'1px solid rgba(248,113,113,.3)', borderRadius:14, padding:14 }}>
          <select value={reportReason} onChange={event => setReportReason(event.target.value)} style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 12px', color:C.text, fontSize:13, marginBottom:10 }}>
            {reportReasons.map(reason => <option key={reason} value={reason}>{t(`rooms.reportReasons.${reason}`)}</option>)}
          </select>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirmReport(false)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:10, color:C.muted, fontSize:12, cursor:'pointer' }}>{t('rooms.cancel')}</button>
            <button onClick={reportUser} disabled={busy} style={{ flex:1, background:C.danger, border:'none', borderRadius:10, padding:10, color:'#1A0A0A', fontWeight:600, fontSize:12, cursor:'pointer' }}>{t('rooms.sendReport')}</button>
          </div>
        </div>}
  </Sheet>
}

export function RoomConsentCheckModal({ room, onClose }) {
  const { user } = useAuth()
  const { t, formatNumber } = useI18n()
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState('CHAT')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!room.matchId) { setLoading(false); return }
    setLoading(true)
    api.get(`/consent/match/${room.matchId}`)
      .then(response => setChecks(response.data.checks || []))
      .catch(() => setError(t('rooms.genericError')))
      .finally(() => setLoading(false))
  }, [room.matchId, t])

  useEffect(() => { load() }, [load])

  const create = async () => {
    setCreating(true); setError('')
    try { await api.post('/consent/check', { matchId:room.matchId, phase }); await load() }
    catch { setError(t('rooms.genericError')) }
    finally { setCreating(false) }
  }
  const answer = async (checkId, status) => {
    setBusyId(checkId); setError('')
    try { await api.put(`/consent/check/${checkId}`, { status }); await load() }
    catch { setError(t('rooms.genericError')) }
    finally { setBusyId(null) }
  }
  const revoke = async checkId => {
    setBusyId(checkId); setError('')
    try { await api.post(`/consent/check/${checkId}/revoke`); await load() }
    catch { setError(t('rooms.genericError')) }
    finally { setBusyId(null) }
  }

  return <Sheet onClose={onClose} title={`✅ ${t('rooms.consentTitle')}`}>
    {error && <div style={{ color:C.danger, fontSize:12, marginBottom:12 }}>{error}</div>}
    {!room.matchId && <div style={{ color:C.muted, fontSize:13 }}>{t('rooms.unavailable')}</div>}
    {room.matchId && <>
      <p style={{ color:C.muted, fontSize:12, marginBottom:14 }}>{t('rooms.consentHelp')}</p>
      {loading && <div style={{ color:C.muted, fontSize:13 }}>{t('rooms.loading')}</div>}
      {!loading && checks.map(check => {
        const mine = (check.responses || []).find(response => response.userId === user?.id)
        const canAnswer = check.status !== 'EXPIRED' && (!mine || mine.status === 'PENDING' || mine.status === 'NOT_YET')
        return <div key={check.id} style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{t(`rooms.phases.${check.phase}`, check.phase)}</div>
            <span style={{ fontSize:11, color:consentStatusColor[check.status] || C.muted }}>{t(`rooms.consentStatuses.${check.status}`, check.status)}</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>{formatNumber(check.acceptedCount)}/{formatNumber(check.requiredCount)} {t('rooms.confirmed')}</div>
          {canAnswer && <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => answer(check.id, 'ACCEPTED')} disabled={busyId === check.id} style={{ ...smallBtn, background:C.success, color:'#0A140A' }}>{t('rooms.yes')}</button>
            <button onClick={() => answer(check.id, 'NOT_YET')} disabled={busyId === check.id} style={{ ...smallBtn, background:C.input, border:`1px solid ${C.border}`, color:C.text2 }}>{t('rooms.notYet')}</button>
            <button onClick={() => answer(check.id, 'DECLINED')} disabled={busyId === check.id} style={{ ...smallBtn, background:'transparent', border:'1px solid rgba(248,113,113,.3)', color:C.danger }}>{t('rooms.no')}</button>
          </div>}
          {mine?.status === 'ACCEPTED' && <button onClick={() => revoke(check.id)} disabled={busyId === check.id} style={{ ...smallBtn, width:'100%', background:'transparent', border:'1px solid rgba(248,113,113,.3)', color:C.danger }}>{t('rooms.revokeConsent')}</button>}
          {mine?.status === 'DECLINED' && <div style={{ fontSize:11, color:C.danger }}>{t('rooms.declined')}</div>}
          {mine?.status === 'NOT_YET' && <div style={{ fontSize:11, color:C.warning }}>{t('rooms.notYetHelp')}</div>}
        </div>
      })}
      {!loading && checks.length === 0 && <div style={{ color:C.muted, fontSize:12, marginBottom:14 }}>{t('rooms.noChecks')}</div>}
      <div style={{ display:'flex', gap:8, marginTop:6 }}>
        <select value={phase} onChange={event => setPhase(event.target.value)} style={{ flex:1, background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', color:C.text, fontSize:13 }}>
          {phases.map(item => <option key={item} value={item}>{t(`rooms.phases.${item}`)}</option>)}
        </select>
        <button onClick={create} disabled={creating} style={{ background:C.primary, border:'none', borderRadius:50, padding:'0 18px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer', opacity:creating ? .6 : 1 }}>{t('rooms.request')}</button>
      </div>
    </>}
  </Sheet>
}
