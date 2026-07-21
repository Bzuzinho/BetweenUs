import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  surface:'#102129', input:'#0F1E26', border:'#1E3340', primary:'#B8A7FF',
  primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', warning:'#FBBF24', danger:'#F87171',
}
const sectionStyle = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }
const sectionTitle = { fontSize:14, color:C.text, fontWeight:600, marginBottom:4, display:'flex', alignItems:'center', gap:8 }
const preferenceColor = { YES:C.success, MAYBE:C.warning, NO:C.danger }

export function AgreementSection() {
  const { t, formatNumber } = useI18n()
  const [catalog, setCatalog] = useState({ boundaries:[], questions:[] })
  const [summary, setSummary] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingRef, setSavingRef] = useState(null)
  const [error, setError] = useState('')

  const refKey = ref => ref.boundaryId ? `b:${ref.boundaryId}` : `q:${ref.agreementQuestionId}`
  const mapAnswers = items => Object.fromEntries((items || []).map(item => [item.boundaryId ? `b:${item.boundaryId}` : `q:${item.agreementQuestionId}`, item.preference]))

  const load = useCallback(() => {
    Promise.all([api.get('/agreements/questions'), api.get('/agreements/me'), api.get('/agreements/me/my-answers')])
      .then(([questions, current, mine]) => {
        setCatalog(questions.data)
        setSummary(current.data)
        setAnswers(mapAnswers(mine.data.answers))
      })
      .catch(() => setError(t('couple.agreementError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const answer = async (ref, preference) => {
    const key = refKey(ref)
    const previous = answers[key]
    setSavingRef(key)
    setError('')
    setAnswers(current => ({ ...current, [key]:preference }))
    try {
      await api.put('/agreements/me/answer', { ...ref, preference })
      const [current, mine] = await Promise.all([api.get('/agreements/me'), api.get('/agreements/me/my-answers')])
      setSummary(current.data)
      setAnswers(mapAnswers(mine.data.answers))
    } catch {
      setAnswers(current => ({ ...current, [key]:previous }))
      setError(t('couple.agreementError'))
    } finally { setSavingRef(null) }
  }

  const lock = async () => {
    setError('')
    try { await api.post('/agreements/me/lock'); load() }
    catch { setError(t('couple.agreementError')) }
  }

  const newRound = async () => {
    if (!window.confirm(t('couple.newRoundConfirm'))) return
    setError('')
    try { await api.post('/agreements/me/new-round'); load() }
    catch { setError(t('couple.agreementError')) }
  }

  if (loading) return null

  const resultByLabel = Object.fromEntries((summary?.results || []).map(result => [result.label, result]))
  const items = [...catalog.boundaries.map(item => ({ ...item, kind:'boundary' })), ...catalog.questions.map(item => ({ ...item, kind:'question' }))]
  const byCategory = items.reduce((groups, item) => { (groups[item.category || 'OTHER'] ||= []).push(item); return groups }, {})
  const locked = summary?.status === 'LOCKED'
  const preferenceLabel = value => t(`couple.${value === 'YES' ? 'yes' : value === 'MAYBE' ? 'maybe' : 'no'}`)
  const status = summary?.status || 'DRAFT'

  return <div style={sectionStyle}>
    <div style={sectionTitle}>📜 {t('couple.agreementTitle')}</div>
    <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>{t('couple.agreementHelp')}</p>
    {error && <div style={{ color:C.danger, fontSize:12, marginBottom:12 }}>{error}</div>}
    {summary && <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
      <span style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, color:C.text2 }}>{t('couple.status')}: {t(`couple.statuses.${status}`)}</span>
      {summary.conflictCount > 0 && <span style={{ border:`1px solid ${C.danger}`, borderRadius:20, padding:'5px 12px', fontSize:11, color:C.danger }}>{formatNumber(summary.conflictCount)} {t('couple.conflicts')}</span>}
      {summary.missingCount > 0 && <span style={{ border:`1px solid ${C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, color:C.muted }}>{formatNumber(summary.missingCount)} {t('couple.missing')}</span>}
    </div>}
    {locked && <div style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', marginBottom:14, fontSize:12, color:C.muted }}>{t('couple.lockedHelp')}</div>}
    {Object.entries(byCategory).map(([category, categoryItems]) => <div key={category} style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>{category.replace(/_/g, ' ')}</div>
      {categoryItems.map(item => {
        const key = refKey(item.ref)
        const result = resultByLabel[item.label]
        return <div key={key} style={{ padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, gap:8 }}>
            <span style={{ fontSize:13, color:C.text, flex:1 }}>{item.label}</span>
            {result?.sharedPreference && <span style={{ fontSize:10, fontWeight:600, color:result.aligned ? C.success : C.warning }}>{result.aligned ? `✓ ${t('couple.aligned')}` : `~ ${t('couple.conservative')}`}: {preferenceLabel(result.sharedPreference)}</span>}
          </div>
          <div style={{ display:'flex', gap:6 }}>{['YES','MAYBE','NO'].map(preference => <button key={preference} disabled={locked || savingRef === key} onClick={() => answer(item.ref, preference)} style={{ flex:1, background:answers[key] === preference ? `${preferenceColor[preference]}22` : 'transparent', border:`1px solid ${answers[key] === preference ? preferenceColor[preference] : C.border}`, borderRadius:8, padding:'6px 10px', fontSize:11, color:answers[key] === preference ? preferenceColor[preference] : C.muted, cursor:locked ? 'not-allowed' : 'pointer', opacity:locked || savingRef === key ? .5 : 1 }}>{preferenceLabel(preference)}</button>)}</div>
        </div>
      })}
    </div>)}
    <div style={{ display:'flex', gap:10, marginTop:12 }}>{!locked
      ? <button onClick={lock} style={{ flex:1, background:C.input, border:`1px solid ${C.border}`, borderRadius:50, padding:12, fontSize:13, color:C.text2, cursor:'pointer' }}>🔒 {t('couple.lockRound')}</button>
      : <button onClick={newRound} style={{ flex:1, background:C.primary, border:'none', borderRadius:50, padding:12, fontSize:13, fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>↻ {t('couple.newRound')}</button>}
    </div>
  </div>
}

export function PendingMatchesSection() {
  const { t } = useI18n()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    api.get('/couples/matches/pending').then(response => setPending(response.data.pending || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const approve = async matchId => {
    setBusyId(matchId)
    try { await api.post(`/couples/matches/${matchId}/approve`); load() }
    catch { window.alert(t('couple.approveError')) }
    finally { setBusyId(null) }
  }
  const reject = async matchId => {
    if (!window.confirm(t('couple.rejectConfirm'))) return
    setBusyId(matchId)
    try { await api.post(`/couples/matches/${matchId}/reject`); load() }
    catch { window.alert(t('couple.rejectError')) }
    finally { setBusyId(null) }
  }

  if (loading || pending.length === 0) return null

  return <div style={sectionStyle}>
    <div style={sectionTitle}>💫 {t('couple.pendingTitle')}</div>
    <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, marginBottom:14 }}>{t('couple.pendingHelp')}</p>
    {pending.map(item => <div key={item.matchId} style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
      <div style={{ fontSize:14, color:C.text, fontWeight:600, marginBottom:8 }}>{item.profile?.type === 'COUPLE' ? '💑' : '🧑'} {item.profile?.displayName}</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        {item.myApprovals.map(member => <span key={member.userId} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:member.approved ? 'rgba(74,222,128,.1)' : C.surface, border:`1px solid ${member.approved ? C.success : C.border}`, color:member.approved ? C.success : C.muted }}>{member.isCreator ? t('couple.partnerA') : t('couple.partnerB')} {member.approved ? `✓ ${t('couple.confirmed')}` : `· ${t('couple.pendingConfirmation')}`}</span>)}
        <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:item.otherSideConfirmed ? 'rgba(74,222,128,.1)' : C.surface, border:`1px solid ${item.otherSideConfirmed ? C.success : C.border}`, color:item.otherSideConfirmed ? C.success : C.muted }}>{t('couple.otherSide')} {item.otherSideConfirmed ? `✓ ${t('couple.confirmed')}` : `· ${t('couple.waiting')}`}</span>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => reject(item.matchId)} disabled={busyId === item.matchId} style={{ flex:1, background:'transparent', border:`1px solid ${C.danger}`, borderRadius:50, padding:10, fontSize:12, color:C.danger, cursor:'pointer', opacity:busyId === item.matchId ? .6 : 1 }}>{t('couple.reject')}</button>
        <button onClick={() => approve(item.matchId)} disabled={busyId === item.matchId || item.mySideConfirmed} style={{ flex:2, background:C.primary, border:'none', borderRadius:50, padding:10, fontSize:12, fontWeight:600, color:'#1A0A2E', cursor:'pointer', opacity:busyId === item.matchId || item.mySideConfirmed ? .6 : 1 }}>{item.mySideConfirmed ? `✓ ${t('couple.alreadyConfirmed')}` : t('couple.confirmInterest')}</button>
      </div>
    </div>)}
  </div>
}
