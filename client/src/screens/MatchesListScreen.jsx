import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  surface:'#102129', border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', muted:'#7E8FA3', warning:'#FBBF24', danger:'#F87171', success:'#4ADE80',
}

function IncomingRequestCard({ request, busyId, onAccept, onReject, onUpsell }) {
  const { t } = useI18n()
  const id = request.profile.id
  const preview = request.preview || {}
  const name = request.full?.displayName
  const typeIcon = preview.type === 'COUPLE' ? '💑' : preview.type === 'GROUP' ? '👥' : '🧑'
  const photoUrl = preview.photo?.url || request.full?.photos?.find(photo => photo.isPrimary)?.storagePath
  const headline = name || (preview.ageRange ? `${preview.ageRange} ${t('matches.years')}` : t('matches.someoneCompatible'))

  return <div style={{ background:C.surface, border:`1px solid ${C.primary}`, borderRadius:14, padding:14, marginBottom:10 }}>
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:44, height:44, borderRadius:14, overflow:'hidden', background:'linear-gradient(135deg,#3D2060,#1A0A2E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1.5px solid ${C.border}`, flexShrink:0 }}>
        {photoUrl ? <img src={photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : typeIcon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:2 }}>{headline}{preview.city ? ` · ${preview.city}` : ''}</div>
        <div style={{ fontSize:12, color:C.muted }}>
          {t('matches.wantsConnect')}{typeof preview.score === 'number' ? ` · ${preview.score}% ${t('matches.compatible')}` : ''}{preview.verified ? ` · ✓ ${t('matches.verified')}` : ''}
        </div>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <button disabled={busyId === id} onClick={() => onReject(id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 12px', color:C.muted, fontSize:12, cursor:'pointer', opacity:busyId === id ? .5 : 1 }}>{t('matches.reject')}</button>
        <button disabled={busyId === id} onClick={() => onAccept(id)} style={{ background:C.primary, border:'none', borderRadius:10, padding:'8px 12px', color:'#0A141A', fontWeight:600, fontSize:12, cursor:'pointer', opacity:busyId === id ? .5 : 1 }}>{t('matches.accept')}</button>
      </div>
    </div>
    {!request.canViewFullProfile && <button onClick={onUpsell} style={{ marginTop:10, width:'100%', background:'none', border:`1px dashed ${C.border}`, borderRadius:10, padding:'6px 10px', color:C.primary, fontSize:11, cursor:'pointer' }}>✦ {t('matches.premiumProfile')}</button>}
  </div>
}

function IncomingRequestsSection(props) {
  const { t, formatNumber } = useI18n()
  if (!props.requests?.length) return null
  return <section style={{ marginBottom:24 }}>
    <div style={{ fontSize:11, color:C.primary, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8, fontWeight:600 }}>{t('matches.requestsTitle')} — {formatNumber(props.requests.length)} {t('matches.waitingReply')}</div>
    {props.requests.map(request => <IncomingRequestCard key={request.profile.id} request={request} {...props} />)}
  </section>
}

function PendingMatchesSection({ pending, onApprove, busyId }) {
  const { t, formatNumber } = useI18n()
  if (!pending?.length) return null
  const needsMe = pending.filter(item => !item.mySideConfirmed)
  const waitingOnOthers = pending.filter(item => item.mySideConfirmed && !item.otherSideConfirmed)
  if (!needsMe.length && !waitingOnOthers.length) return null

  return <section style={{ marginBottom:24 }}>
    {needsMe.length > 0 && <>
      <div style={{ fontSize:11, color:C.warning, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8, fontWeight:600 }}>{t('matches.needsConfirmation')}</div>
      {needsMe.map(item => <div key={item.matchId} style={{ background:C.surface, border:`1px solid ${C.warning}`, borderRadius:14, padding:14, marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>{item.profile?.displayName}</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{item.myApprovals?.length > 1 ? `${formatNumber(item.myApprovals.filter(approval => approval.approved).length)}/${formatNumber(item.myApprovals.length)} ${t('matches.sideConfirmed')}` : t('matches.confirmHelp')}</div>
        <button disabled={busyId === item.matchId} onClick={() => onApprove(item.matchId)} style={{ background:C.primary, border:'none', borderRadius:10, padding:'8px 16px', color:'#0A141A', fontWeight:600, fontSize:12, cursor:'pointer', opacity:busyId === item.matchId ? .5 : 1 }}>{t('matches.confirmInterest')}</button>
      </div>)}
    </>}
    {waitingOnOthers.length > 0 && <>
      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.05em', margin:'14px 0 8px', fontWeight:600 }}>{t('matches.waitingEveryone')}</div>
      {waitingOnOthers.map(item => <div key={item.matchId} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:10, opacity:.85 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{item.profile?.displayName}</div>
        <div style={{ fontSize:12, color:C.muted }}>{t('matches.alreadyConfirmed')}</div>
      </div>)}
    </>}
  </section>
}

export default function MatchesListScreen() {
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useI18n()
  const [matches, setMatches] = useState([])
  const [pending, setPending] = useState([])
  const [requests, setRequests] = useState([])
  const [requestBusyId, setRequestBusyId] = useState(null)
  const [approvalBusyId, setApprovalBusyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMatches = () => api.get('/matches').then(response => setMatches(response.data.matches || []))
  const loadPending = () => api.get('/couples/matches/pending').then(response => setPending(response.data.pending || [])).catch(() => setPending([]))
  const loadRequests = () => api.get('/matches/pending-requests').then(response => setRequests(response.data.pending || [])).catch(() => setRequests([]))

  useEffect(() => {
    Promise.all([loadMatches(), loadPending(), loadRequests()]).catch(() => setError(t('matches.roomsError'))).finally(() => setLoading(false))
  }, [t])

  const approve = async matchId => {
    setApprovalBusyId(matchId); setError('')
    try { await api.post(`/couples/matches/${matchId}/approve`); await loadPending() }
    catch { setError(t('matches.approvalError')) }
    finally { setApprovalBusyId(null) }
  }

  const acceptRequest = async profileId => {
    setRequestBusyId(profileId); setError('')
    try {
      await api.post(`/matches/accept/${profileId}`)
      setRequests(current => current.filter(item => item.profile.id !== profileId))
      await loadMatches()
    } catch { setError(t('matches.requestAcceptError')) }
    finally { setRequestBusyId(null) }
  }

  const rejectRequest = async profileId => {
    setRequestBusyId(profileId); setError('')
    try {
      await api.post(`/matches/reject/${profileId}`)
      setRequests(current => current.filter(item => item.profile.id !== profileId))
    } catch { setError(t('matches.requestRejectError')) }
    finally { setRequestBusyId(null) }
  }

  const openMatch = match => navigate(`/rooms?matchId=${encodeURIComponent(match.id)}`)

  return <div className="app-screen app-screen--matches" style={{ padding:'16px 16px 0', maxWidth:480, margin:'0 auto' }}>
    <div style={{ fontSize:22, fontWeight:700, marginBottom:20, color:C.primary }}>{t('matches.title')}</div>
    {error && <div style={{ background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.25)', borderRadius:12, padding:'10px 14px', color:C.danger, fontSize:13, marginBottom:14 }}>{error}</div>}

    <IncomingRequestsSection requests={requests} onAccept={acceptRequest} onReject={rejectRequest} busyId={requestBusyId} onUpsell={() => navigate('/premium')} />
    <PendingMatchesSection pending={pending} onApprove={approve} busyId={approvalBusyId} />

    {loading && <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:60 }}>{t('matches.loading')}</div>}
    {!loading && matches.length === 0 && pending.length === 0 && requests.length === 0 && <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:60, marginBottom:16 }}>💫</div>
      <div style={{ fontSize:22, color:C.text, marginBottom:8 }}>{t('matches.emptyTitle')}</div>
      <div style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>{t('matches.emptyHelp')}</div>
    </div>}

    {matches.length > 0 && <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8, fontWeight:600 }}>{t('matches.activeConnections')}</div>}
    <div className="matches-card-grid">
    {matches.map(match => <button key={match.id} onClick={() => openMatch(match)} style={{ width:'100%', background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:16, display:'flex', alignItems:'center', gap:14, marginBottom:12, cursor:'pointer', textAlign:'left' }}>
      <div style={{ width:52, height:52, borderRadius:16, flexShrink:0, background:'linear-gradient(135deg,#3D2060,#1A0A2E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:`1.5px solid ${C.border}` }}>{match.profile?.type === 'COUPLE' ? '💑' : match.profile?.type === 'GROUP' ? '👥' : '🧑'}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:3 }}>{match.profile?.displayName}</div>
        <div style={{ fontSize:12, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{match.lastMessage?.body || t('matches.tapToChat')}</div>
        <div style={{ fontSize:10, color:C.success, marginTop:3, fontWeight:500 }}>{t('matches.match')} ✓</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
        {match.lastMessage?.createdAt && <div style={{ fontSize:11, color:C.muted }}>{formatDate(match.lastMessage.createdAt, { hour:'2-digit', minute:'2-digit' })}</div>}
        {match.unread > 0 && <div aria-label={`${formatNumber(match.unread)} ${t('matches.unread')}`} style={{ background:C.primary, color:'#1A0A2E', borderRadius:10, padding:'2px 7px', fontSize:10, fontWeight:700 }}>{formatNumber(match.unread)}</div>}
      </div>
    </button>)}
    </div>
  </div>
}
