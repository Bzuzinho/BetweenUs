import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

function StatCard({ label, value, color, onClick, colors }) {
  const C = colors
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '14px 12px',
        textAlign: 'center',
        flex: 1,
        minWidth: 80,
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, color: color || C.primary }}>{value ?? '—'}</div>
      <div style={{ color: C.muted, fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </button>
  )
}

export default function AdminDashboard({ changeTab, colors }) {
  const C = colors
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/admin/dashboard')
      .then(response => setData(response.data))
      .catch(errorResponse => setError(errorResponse.response?.data?.error || t('admin.dashboard.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  if (loading) return <AdminAsyncState state="loading" colors={C} />
  if (error) return <AdminAsyncState state="error" message={error} onRetry={load} colors={C} />

  const visible = new Set(data?.visibleSections || [])
  if (visible.size === 0) {
    return <AdminAsyncState state="unavailable" message={t('admin.dashboard.unavailable')} colors={C} />
  }

  const metric = key => t(`admin.dashboard.metrics.${key}`, key)

  return (
    <div>
      {(visible.has('users') || visible.has('profiles') || visible.has('reports')) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {visible.has('users') && <StatCard colors={C} label={metric('users')} value={data.users?.total} onClick={() => changeTab('users')} />}
          {visible.has('users') && <StatCard colors={C} label={metric('today')} value={data.users?.newToday} color={C.success} onClick={() => changeTab('users')} />}
          {visible.has('users') && <StatCard colors={C} label={metric('highRisk')} value={data.users?.highRisk} color={C.danger} onClick={() => changeTab('users')} />}
        </div>
      )}

      {(visible.has('profiles') || visible.has('reports') || visible.has('photos')) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {visible.has('profiles') && <StatCard colors={C} label={metric('pendingProfiles')} value={data.profiles?.pending} color={C.warning} onClick={() => changeTab('profiles')} />}
          {visible.has('reports') && <StatCard colors={C} label={metric('reports')} value={data.reports?.pending} color={C.danger} onClick={() => changeTab('reports')} />}
          {visible.has('photos') && <StatCard colors={C} label={metric('pendingPhotos')} value={data.photos?.pending} color={C.warning} onClick={() => changeTab('photos')} />}
        </div>
      )}

      {(visible.has('verifications') || visible.has('subscriptions') || visible.has('users')) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {visible.has('verifications') && <StatCard colors={C} label={metric('pendingVerifications')} value={data.verifications?.pending} color={C.warning} onClick={() => changeTab('verifications')} />}
          {visible.has('subscriptions') && <StatCard colors={C} label={metric('premium')} value={data.subscriptions?.total} color={C.success} onClick={() => changeTab('users')} />}
          {visible.has('users') && <StatCard colors={C} label={metric('suspended')} value={data.users?.suspended} color={C.muted} onClick={() => changeTab('users')} />}
        </div>
      )}
    </div>
  )
}
