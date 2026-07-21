import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { REPORT_STATUSES, reportTierForPriority } from './adminReportContracts'

export default function AdminReportsQueue({ colors, onSelectReport }) {
  const C = colors
  const { t } = useI18n()
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [loading, setLoading] = useState(true)
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
    setLoading(true)
    setError('')
    api.get(`/admin/reports?status=${status}`)
      .then(response => setReports(response.data.reports || []))
      .catch(() => setError(t('admin.reports.loadError')))
      .finally(() => setLoading(false))
  }, [status, t])

  useEffect(() => { load() }, [load])

  const ageLabel = createdAt => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
    if (minutes < 60) return t('admin.reports.age.minutes').replace('{count}', minutes)
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('admin.reports.age.hours').replace('{count}', hours)
    return t('admin.reports.age.days').replace('{count}', Math.floor(hours / 24))
  }

  if (loading) return <AdminAsyncState colors={C} state="loading" compact />
  if (error) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />

  return (
    <section aria-label={t('admin.tabs.reports.label')}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {REPORT_STATUSES.map(value => {
          const active = status === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(value)}
              style={{
                background: active ? C.primaryDim : C.surface,
                border: `1px solid ${active ? C.primary : C.border}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: active ? C.primary : C.muted,
                fontSize: 12,
                minHeight: 34,
                cursor: 'pointer',
              }}
            >
              {t(`admin.reports.status.${value}`, value)}
            </button>
          )
        })}
      </div>

      {reports.length === 0 && (
        <AdminAsyncState colors={C} state="unavailable" message={t('admin.reports.empty')} compact />
      )}

      {reports.map(report => {
        const tier = reportTierForPriority(report.priority)
        const isCritical = tier === 'MAXIMUM' || tier === 'HIGH'
        return (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelectReport?.(report.id)}
            style={{
              width: '100%', textAlign: 'left', background: C.surface,
              border: `1px solid ${isCritical ? 'rgba(248,113,113,0.3)' : C.border}`,
              borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer', color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: tierColors[tier], color: '#0A141A', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                  {t(`admin.reports.tier.${tier}`, tier)}
                </span>
                <span style={{ color: C.text, fontWeight: 500, fontSize: 13 }}>{report.reason}</span>
                {report.aiAssessment && (
                  <span title={t('admin.reports.aiAvailable')} style={{ background: C.primaryDim, color: C.primary, borderRadius: 6, padding: '2px 8px', fontSize: 10 }}>
                    🤖 {t('admin.reports.aiBadge')}
                  </span>
                )}
              </div>
              <span style={{ color: C.muted, fontSize: 11 }}>{ageLabel(report.createdAt)}</span>
            </div>

            <div style={{ color: C.text2, fontSize: 12, marginBottom: 4 }}>
              {report.reportedUser?.email || '—'}
              {report.reportedUser?.riskScore > 0 && (
                <span style={{ color: C.danger }}>
                  {' · '}{t('admin.reports.risk').replace('{score}', report.reportedUser.riskScore)}
                </span>
              )}
            </div>
            {report.details && <div style={{ color: C.muted, fontSize: 12 }}>{report.details}</div>}
          </button>
        )
      })}
    </section>
  )
}
