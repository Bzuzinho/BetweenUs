import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { PROFILE_STATUSES } from './adminProfileContracts'

export default function AdminProfilesQueue({ colors, onSelectProfile }) {
  const C = colors
  const { t } = useI18n()
  const [profiles, setProfiles] = useState([])
  const [status, setStatus] = useState('PENDING_REVIEW')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.get(`/admin/profiles?status=${status}`)
      .then(response => setProfiles(response.data.profiles || []))
      .catch(() => setError(t('admin.profiles.loadError')))
      .finally(() => setLoading(false))
  }, [status, t])

  useEffect(() => { load() }, [load])

  if (loading) return <AdminAsyncState colors={C} state="loading" compact />
  if (error) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />

  return (
    <section aria-label={t('admin.tabs.profiles.label')}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {PROFILE_STATUSES.map(value => {
          const active = value === status
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
                padding: '7px 14px',
                color: active ? C.primary : C.text2,
                fontSize: 13,
                cursor: 'pointer',
                minHeight: 36,
              }}
            >
              {t(`admin.profiles.status.${value}`, value)}
            </button>
          )
        })}
      </div>

      {profiles.length === 0 && (
        <AdminAsyncState colors={C} state="unavailable" message={t('admin.profiles.empty')} compact />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {profiles.map(profile => {
          const photo = profile.photos?.[0]
          const name = profile.displayName || t('admin.profiles.unknownProfile')
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelectProfile?.(profile)}
              style={{
                padding: 0,
                textAlign: 'left',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                overflow: 'hidden',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <div style={{ height: 120, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {photo
                  ? <img src={photo.storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div aria-hidden="true" style={{ fontSize: 36, color: C.muted, opacity: 0.3 }}>○</div>}
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(10,20,26,0.8)', borderRadius: 6, padding: '2px 8px', fontSize: 10, color: C.text2 }}>
                  {profile.type}
                </div>
              </div>

              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.elevated, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: C.text2, flexShrink: 0, overflow: 'hidden' }}>
                  {photo
                    ? <img src={photo.storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{profile.user?.email || '—'}</div>
                </div>
                <span aria-hidden="true" style={{ color: C.muted, fontSize: 18 }}>›</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
