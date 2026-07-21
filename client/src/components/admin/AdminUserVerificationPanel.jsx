import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminReasonModal from './AdminReasonModal'

function AdminVerificationSelfie({ colors, userId }) {
  const C = colors
  const { t } = useI18n()
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setUrl('')
    setError(false)
    api.get(`/verifications/admin/${userId}/selfie-url`)
      .then(response => { if (!cancelled) setUrl(response.data.url) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [userId])

  if (error) return <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{t('admin.userVerification.imageError')}</div>
  if (!url) return <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{t('admin.userVerification.imageLoading')}</div>
  return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={t('admin.userVerification.selfieAlt')} style={{ width:'100%', maxHeight:280, objectFit:'contain', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, marginBottom:10 }} /></a>
}

export default function AdminUserVerificationPanel({ colors, userId, verification, ageVerifiedAt, onChanged }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [rejecting, setRejecting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const review = async (status, reason) => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const response = await api.put(`/admin/verifications/${userId}`, { status, ...(reason ? { reason } : {}) })
      setRejecting(false)
      setMessage(response.data?.activation?.activated ? t('admin.userVerification.approvedAndActivated') : t('admin.userVerification.updated'))
      onChanged?.()
    } catch (responseError) {
      setError(responseError.response?.data?.error || t('admin.userVerification.actionError'))
    } finally {
      setBusy(false)
    }
  }

  const status = verification?.status || 'NONE'

  return (
    <section aria-label={t('admin.userVerification.title')} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
      {rejecting && <AdminReasonModal colors={C} title={t('admin.userVerification.rejectTitle')} onConfirm={reason => review('REJECTED', reason)} onCancel={() => setRejecting(false)} />}
      {message && <div role="status" style={{ color:C.success, fontSize:12, marginBottom:10 }}>{message}</div>}
      {error && <div role="alert" style={{ color:C.danger, fontSize:12, marginBottom:10 }}>{error}</div>}
      <div style={{ fontSize:12, color:C.muted, lineHeight:1.8, marginBottom:14 }}>
        <div>{t('admin.userVerification.type')}: <strong style={{ color:C.text }}>{verification?.type || '—'}</strong></div>
        <div>{t('admin.userVerification.statusLabel')}: <strong style={{ color:C.text }}>{t(`admin.userVerification.status.${status}`, status)}</strong></div>
        {verification?.reviewedAt && <div>{t('admin.userVerification.reviewedAt')}: <strong style={{ color:C.text }}>{formatDate(verification.reviewedAt)}</strong></div>}
        {ageVerifiedAt && <div>{t('admin.userVerification.ageVerifiedAt')}: <strong style={{ color:C.success }}>{formatDate(ageVerifiedAt)}</strong></div>}
      </div>
      {verification?.selfieStoragePath && <AdminVerificationSelfie colors={C} userId={userId} />}
      {status === 'PENDING' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <button type="button" disabled={busy} onClick={() => review('APPROVED')} style={{ background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:10, color:C.success, cursor:'pointer' }}>{t('admin.userVerification.approve')}</button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)} style={{ background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:10, color:C.danger, cursor:'pointer' }}>{t('admin.userVerification.reject')}</button>
        </div>
      )}
    </section>
  )
}
