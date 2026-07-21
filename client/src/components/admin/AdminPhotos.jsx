import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminPhotos({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/admin/photos?status=PENDING')
      .then(response => setPhotos(response.data.photos || []))
      .catch(requestError => setError(requestError.response?.data?.error || t('admin.photos.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const moderate = async (id, moderationStatus) => {
    await api.put(`/admin/photos/${id}`, { moderationStatus })
    setPhotos(previous => previous.filter(photo => photo.id !== id))
  }

  if (loading) return <AdminAsyncState colors={C} type="loading" compact />
  if (error) return <AdminAsyncState colors={C} type="error" message={error} onRetry={load} compact />
  if (photos.length === 0) return <AdminAsyncState colors={C} type="unavailable" message={t('admin.photos.empty')} compact />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {photos.map(photo => (
        <article key={photo.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <img src={photo.storagePath} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
          <div style={{ padding: 10 }}>
            <div style={{ color: C.text2, fontSize: 11, marginBottom: 8 }}>
              {photo.profile?.displayName || t('admin.photos.unknownProfile')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                type="button"
                aria-label={t('admin.photos.approve')}
                title={t('admin.photos.approve')}
                onClick={() => moderate(photo.id, 'APPROVED')}
                style={{ background: C.successDim, border: `1px solid ${C.success}`, borderRadius: 8, padding: 8, color: C.success, fontSize: 14, minHeight: 40, cursor: 'pointer' }}
              >✓</button>
              <button
                type="button"
                aria-label={t('admin.photos.reject')}
                title={t('admin.photos.reject')}
                onClick={() => moderate(photo.id, 'REJECTED')}
                style={{ background: C.dangerDim, border: `1px solid ${C.danger}`, borderRadius: 8, padding: 8, color: C.danger, fontSize: 14, minHeight: 40, cursor: 'pointer' }}
              >✕</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
