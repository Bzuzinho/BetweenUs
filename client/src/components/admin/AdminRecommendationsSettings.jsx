import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export const RECOMMENDATION_STATES = ['NO_DATA','COLLECTING_DATA','INSUFFICIENT_SAMPLE','READY_FOR_REVIEW','GUARDRAIL_CONCERN']

export default function AdminRecommendationsSettings({ colors }) {
  const C = colors
  const { t, formatNumber } = useI18n()
  const [status, setStatus] = useState(null)
  const [weights, setWeights] = useState(null)
  const [form, setForm] = useState({})
  const [shadow, setShadow] = useState(null)
  const [guardrails, setGuardrails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    Promise.all([
      api.get('/admin/recommendations/status').then(response => response.data),
      api.get('/admin/recommendations/weights').then(response => response.data),
      api.get('/admin/recommendations/shadow-analysis?days=14').then(response => response.data),
      api.get('/admin/recommendations/guardrails?days=14').then(response => response.data),
    ]).then(([nextStatus,nextWeights,nextShadow,nextGuardrails]) => {
      setStatus(nextStatus); setWeights(nextWeights); setForm(nextWeights?.weights || {}); setShadow(nextShadow); setGuardrails(nextGuardrails)
    }).catch(responseError => setError(responseError.response?.data?.error || t('admin.settings.recommendations.loadError'))).finally(() => setLoading(false))
  }, [t])
  useEffect(() => { load() }, [load])

  const overallState = useMemo(() => {
    const rankSample = shadow?.rankCorrelation?.sampleSize ?? 0
    const control = guardrails?.sample?.control ?? 0
    const recommendation = guardrails?.sample?.recommendation ?? 0
    if (rankSample === 0 && control === 0 && recommendation === 0) return 'NO_DATA'
    if (guardrails?.dataSufficient === true && guardrails?.recommendDisable === true) return 'GUARDRAIL_CONCERN'
    if (guardrails?.dataSufficient === true) return 'READY_FOR_REVIEW'
    if (guardrails?.reason === 'INSUFFICIENT_SAMPLE') return 'INSUFFICIENT_SAMPLE'
    return 'COLLECTING_DATA'
  }, [shadow, guardrails])

  const save = async () => {
    setSaving(true); setMessage(''); setError('')
    try { await api.put('/admin/recommendations/weights', form); setMessage(t('admin.settings.recommendations.saved')); load() }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.recommendations.saveError')) }
    finally { setSaving(false) }
  }

  const pct = value => value == null ? '—' : formatNumber(value, { style:'percent', maximumFractionDigits:1 })
  const tone = { NO_DATA:C.muted, COLLECTING_DATA:C.primary, INSUFFICIENT_SAMPLE:C.primary, READY_FOR_REVIEW:C.success, GUARDRAIL_CONCERN:C.danger }[overallState]

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error && !status) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />

  return <section aria-label={t('admin.settings.recommendations.title')}>
    <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:14, color:C.primary, fontSize:13 }}>{t('admin.settings.recommendations.description')}</div>
    <div style={{ background:C.surface, border:`1.5px solid ${tone}`, borderRadius:12, padding:'12px 16px', marginBottom:16 }}><div style={{ color:tone, fontWeight:700 }}>{t(`admin.settings.recommendations.state.${overallState}.label`)}</div><div style={{ color:C.text2, fontSize:13, marginTop:4 }}>{t(`admin.settings.recommendations.state.${overallState}.text`)}</div></div>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}><div style={{ color:C.text, fontWeight:500, marginBottom:10 }}>{t('admin.settings.recommendations.statusTitle')}</div><div style={{ display:'flex', gap:16, flexWrap:'wrap', color:C.text2, fontSize:13 }}><div>{t('admin.settings.recommendations.shadowMode')}: <strong style={{ color:status?.shadowModeEnabled ? C.success : C.muted }}>{status?.shadowModeEnabled ? t('admin.settings.common.active') : t('admin.settings.common.inactive')}</strong></div><div>{t('admin.settings.recommendations.abTest')}: <strong style={{ color:status?.intelligentRecommendationsEnabled ? C.success : C.muted }}>{status?.intelligentRecommendationsEnabled ? t('admin.settings.common.active') : t('admin.settings.common.inactive')}</strong></div><div>{t('admin.settings.recommendations.model')}: {status?.modelVersion || '—'}</div></div></div>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}><div style={{ color:C.text, fontWeight:500 }}>{t('admin.settings.recommendations.weightsTitle')} {weights?.configVersion ? `(${weights.configVersion})` : ''}</div><div style={{ color:C.muted, fontSize:12, marginBottom:12 }}>{t('admin.settings.recommendations.weightsDescription')}</div><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>{Object.keys(form).map(key => <label key={key}><span style={{ color:C.muted, fontSize:11 }}>{key}</span><input type="number" step="0.1" value={form[key]} onChange={event => setForm(previous => ({...previous,[key]:Number(event.target.value)}))} style={{ width:'100%', boxSizing:'border-box', background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', color:C.text }} /></label>)}</div>{message && <div role="status" style={{ color:C.success, marginTop:10 }}>{message}</div>}{error && <div role="alert" style={{ color:C.danger, marginTop:10 }}>{error}</div>}<button type="button" onClick={save} disabled={saving} style={{ marginTop:14, background:C.primary, border:'none', borderRadius:10, padding:'9px 18px', color:'#0A141A', fontWeight:600 }}>{saving ? '…' : t('admin.settings.recommendations.saveWeights')}</button></div>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}><div style={{ color:C.text, fontWeight:500, marginBottom:10 }}>{t('admin.settings.recommendations.shadowTitle').replace('{days}', shadow?.sinceDays ?? 14)}</div><div style={{ display:'flex', gap:20, flexWrap:'wrap', color:C.text2, fontSize:13 }}><div>{t('admin.settings.recommendations.rankCorrelation')}: <strong>{shadow?.rankCorrelation?.correlation != null ? formatNumber(shadow.rankCorrelation.correlation, { maximumFractionDigits:2 }) : '—'}</strong></div><div>{t('admin.settings.recommendations.currentLikeRate')}: <strong>{pct(shadow?.likeProjection?.currentTopNLikeRate)}</strong></div><div>{t('admin.settings.recommendations.recommendedLikeRate')}: <strong>{pct(shadow?.likeProjection?.recommendationTopNLikeRate)}</strong></div></div></div>
    <div style={{ background:C.surface, border:`1px solid ${guardrails?.recommendDisable ? C.danger : C.border}`, borderRadius:16, padding:18 }}><div style={{ color:C.text, fontWeight:500, marginBottom:10 }}>{t('admin.settings.recommendations.guardrailsTitle').replace('{days}', guardrails?.sinceDays ?? 14)}</div><div style={{ overflowX:'auto' }}><table style={{ width:'100%', borderCollapse:'collapse', color:C.text2, fontSize:12 }}><thead><tr><th></th><th>{t('admin.settings.recommendations.blocks')}</th><th>{t('admin.settings.recommendations.reports')}</th><th>{t('admin.settings.recommendations.safeExit')}</th><th>{t('admin.settings.recommendations.abandonment')}</th></tr></thead><tbody>{[['CONTROL',guardrails?.control],['RECOMMENDATION_V1',guardrails?.recommendationV1]].map(([label,row]) => <tr key={label}><td>{label} (n={row?.profileCount ?? 0})</td><td>{pct(row?.blockRate)}</td><td>{pct(row?.reportRate)}</td><td>{pct(row?.safeExitRate)}</td><td>{pct(row?.matchAbandonmentRate)}</td></tr>)}</tbody></table></div>{guardrails?.recommendDisable && <div style={{ marginTop:12, background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:8, padding:'10px 12px', color:C.danger, fontSize:12 }}>{t('admin.settings.recommendations.disableRecommendation')}{guardrails.concerns?.map((concern,index) => <div key={index}>{concern}</div>)}</div>}</div>
  </section>
}
