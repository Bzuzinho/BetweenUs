import { useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminReasonModal from './AdminReasonModal'
import { PROFILE_DECISIONS } from './adminProfileContracts'

export default function AdminProfileDetail({ colors, profile, onBack, onResolved }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [showReject, setShowReject] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!profile) return null

  const photo = profile.photos?.[0]
  const name = profile.displayName || t('admin.profiles.unknownProfile')

  const moderate = async (status, reason = 'Admin review') => {
    setBusy(true)
    setError('')
    try {
      await api.put(`/admin/profiles/${profile.id}/status`, { status, reason })
      setShowReject(false)
      onResolved?.()
    } catch {
      setError(t('admin.profiles.actionError'))
    } finally {
      setBusy(false)
    }
  }

  const details = [
    ['gender', profile.gender || '—'],
    ['orientation', profile.orientation || '—'],
    ['relationshipStatus', profile.relationshipStatus || '—'],
    ['discretion', profile.discretionLevel || '—'],
    ['photos', String(profile.photos?.length || 0)],
    ['status', t(`admin.profiles.status.${profile.status}`, profile.status)],
  ]

  return (
    <section style={{ width:'100%' }} aria-label={name}>
      {showReject && (
        <AdminReasonModal
          colors={C}
          title={t('admin.profiles.rejectTitle')}
          onCancel={() => setShowReject(false)}
          onConfirm={reason => moderate(PROFILE_DECISIONS.reject, reason)}
        />
      )}

      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
        ← {t('admin.profiles.back')}
      </button>

      {error && <div role="alert" style={{ color: C.danger, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <div className="admin-profile-detail-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        <div className="admin-profile-detail-hero" style={{ height: 200, background: C.elevated, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo
            ? <img src={photo.storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div aria-hidden="true" style={{ fontSize: 48, color: C.muted, opacity: 0.4 }}>○</div>}
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(10,20,26,0.8)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: C.text2 }}>
            {profile.type}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.elevated, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: C.text2, flexShrink: 0, overflow: 'hidden' }}>
              {photo
                ? <img src={photo.storagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : name[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{profile.user?.email || '—'}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {profile.city || '—'} · {t('admin.profiles.created')} {formatDate(profile.createdAt, { dateStyle: 'medium' })}
              </div>
            </div>
          </div>

          {profile.bio && <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, marginBottom: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>{profile.bio}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
            {details.map(([key, value]) => (
              <div key={key} style={{ background: C.elevated, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{t(`admin.profiles.fields.${key}`)}</div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {profile.photos?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {t('admin.profiles.gallery').replace('{count}', profile.photos.length)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.photos.map(item => (
                  <div key={item.id} style={{ position: 'relative' }}>
                    <img src={item.storagePath} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                    <div style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(10,20,26,0.8)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: C.text2 }}>
                      {item.moderationStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" disabled={busy} onClick={() => setShowReject(true)} style={{ background: C.dangerDim, border: `1px solid ${C.danger}`, borderRadius: 12, padding: 13, color: C.danger, fontSize: 14, fontWeight: 500, cursor: 'pointer', minHeight: 48, opacity: busy ? 0.6 : 1 }}>
              {t('admin.profiles.reject')}
            </button>
            <button type="button" disabled={busy} onClick={() => moderate(PROFILE_DECISIONS.approve)} style={{ background: C.successDim, border: `1px solid ${C.success}`, borderRadius: 12, padding: 13, color: C.success, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48, opacity: busy ? 0.6 : 1 }}>
              ✓ {t('admin.profiles.approve')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
