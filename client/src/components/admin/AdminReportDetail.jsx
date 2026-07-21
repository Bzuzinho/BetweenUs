import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { reportTierForPriority } from './adminReportContracts'

export default function AdminReportDetail({ colors, reportId, onBack, onResolved }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [data, setData] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const tierColors = useMemo(() => ({
    MAXIMUM: C.danger,
    HIGH: C.danger,
    ELEVATED: C.warning,
    MODERATE: C.warning,
    LOW: C.muted,
    MINIMAL: C.muted,
    NONE: C.muted,
  }), [C])

  const load = useCallback(() => {
    setError('')
    api.get(`/admin/reports/${reportId}`)
      .then(response => setData(response.data))
      .catch(() => setError(t('admin.reports.detailLoadError')))
  }, [reportId, t])

  useEffect(() => { load() }, [load])

  const resolve = async status => {
    setBusy(true)
    setError('')
    try {
      await api.put(`/admin/reports/${reportId}`, { status, internalNotes: notes.trim() || undefined })
      onResolved?.()
    } catch {
      setError(t('admin.reports.actionError'))
    } finally {
      setBusy(false)
    }
  }

  const reassess = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/admin/reports/${reportId}/assess`)
      await load()
    } catch {
      setError(t('admin.reports.actionError'))
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />
  if (!data) return <AdminAsyncState colors={C} state="loading" />

  const { report, evidence, previousReports, aiAssessment, evidenceRestricted } = data
  const tier = reportTierForPriority(report.priority)
  const detail = key => t(`admin.reports.detail.${key}`)
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }

  return (
    <section aria-label={report.reason}>
      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, marginBottom: 14, cursor: 'pointer' }}>
        ← {detail('back')}
      </button>

      {error && <AdminAsyncState colors={C} state="error" message={error} compact />}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ background: tierColors[tier], color: '#0A141A', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
            {t(`admin.reports.tier.${tier}`, tier)}
          </span>
          <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{report.reason}</span>
          <span style={{ color: C.muted, fontSize: 11, marginLeft: 'auto' }}>{t(`admin.reports.status.${report.status}`, report.status)}</span>
        </div>
        {report.details && <div style={{ color: C.text2, fontSize: 13, marginBottom: 10 }}>{report.details}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, fontSize: 12, color: C.muted }}>
          <div>{detail('reporter')}: {report.reporter?.email || '—'}</div>
          <div>{detail('reported')}: {report.reportedUser?.email || '—'}</div>
          {report.reportedUser && <div>{t('admin.reports.risk').replace('{score}', report.reportedUser.riskScore ?? 0)}</div>}
          {report.reportedUser?.profile && <div>{detail('profile')}: {report.reportedUser.profile.displayName || '—'} ({report.reportedUser.profile.type || '—'})</div>}
        </div>
      </div>

      {previousReports?.length > 0 && (
        <div style={card}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{detail('previous')} ({previousReports.length})</div>
          {previousReports.map(previous => (
            <div key={previous.id} style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
              {previous.reason} · {t(`admin.reports.status.${previous.status}`, previous.status)} · {formatDate(previous.createdAt, { dateStyle: 'short' })}
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>🤖 {detail('aiTitle')}</div>
          <button type="button" onClick={reassess} disabled={busy} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', color: C.muted, fontSize: 11, cursor: 'pointer' }}>
            {detail('reassess')}
          </button>
        </div>
        {!aiAssessment && <div style={{ color: C.muted, fontSize: 12 }}>{detail('noAssessment')}</div>}
        {aiAssessment && (
          <div style={{ fontSize: 12, color: C.text2 }}>
            <div style={{ marginBottom: 4 }}>{aiAssessment.result?.summary}</div>
            <div style={{ color: C.muted }}>
              {detail('severity')}: {Math.round((aiAssessment.result?.severity || 0) * 100)}% · {detail('recommendedPriority')}: {aiAssessment.result?.recommendedPriority ?? '—'} · {detail('categories')}: {(aiAssessment.result?.categories || []).join(', ') || '—'}
            </div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 6 }}>{detail('aiDisclaimer')} {aiAssessment.provider}/{aiAssessment.model}</div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{detail('evidence')}</div>
        {evidenceRestricted && <div style={{ color: C.warning, fontSize: 12 }}>🔒 {detail('evidenceRestricted')}</div>}
        {!evidenceRestricted && (!evidence || evidence.length === 0) && <div style={{ color: C.muted, fontSize: 12 }}>{detail('noEvidence')}</div>}
        {!evidenceRestricted && evidence?.map(item => (
          <div key={item.id} style={{ background: C.input, borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 12 }}>
            <div style={{ color: C.primary, marginBottom: 4 }}>{item.type}</div>
            <pre style={{ color: C.text2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit' }}>{JSON.stringify(item.data, null, 2)}</pre>
          </div>
        ))}
      </div>

      <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={detail('internalNote')} style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, fontSize: 12, marginBottom: 10, minHeight: 60 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        <button type="button" onClick={() => resolve('RESOLVED')} disabled={busy} style={{ background: C.successDim, border: `1px solid ${C.success}`, borderRadius: 10, padding: 10, color: C.success, fontSize: 12, minHeight: 40, cursor: 'pointer' }}>✓ {detail('resolve')}</button>
        <button type="button" onClick={() => resolve('ESCALATED')} disabled={busy} style={{ background: C.dangerDim, border: `1px solid ${C.danger}`, borderRadius: 10, padding: 10, color: C.danger, fontSize: 12, minHeight: 40, cursor: 'pointer' }}>⚠ {detail('escalate')}</button>
        <button type="button" onClick={() => resolve('DISMISSED')} disabled={busy} style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.muted, fontSize: 12, minHeight: 40, cursor: 'pointer' }}>✕ {detail('dismiss')}</button>
      </div>
    </section>
  )
}
