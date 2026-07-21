import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminReasonModal from './AdminReasonModal'

export const ADMIN_PROFILE_DETAIL_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'HIDDEN', 'SUSPENDED']

export default function AdminUserProfilePanel({ colors, profile, onSaved }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [form, setForm] = useState({ displayName:'', bio:'', city:'', status:'DRAFT' })
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm({
      displayName: profile?.displayName || '',
      bio: profile?.bio || '',
      city: profile?.city || '',
      status: profile?.status || 'DRAFT',
    })
  }, [profile])

  if (!profile) return <div style={{ color:C.muted, textAlign:'center', padding:20 }}>{t('admin.userProfile.empty')}</div>

  const save = async (reason, internalNote) => {
    setError('')
    setMessage('')
    try {
      await api.put(`/admin/profiles/${profile.id}`, {
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        status: form.status,
        reason,
        internalNote,
      })
      setModalOpen(false)
      setMessage(t('admin.userProfile.updated'))
      onSaved?.()
    } catch (responseError) {
      setError(responseError.response?.data?.error || t('admin.userProfile.actionError'))
    }
  }

  const readOnlyFields = [
    ['relationshipStatus', profile.relationshipStatus],
    ['discretion', profile.discretionLevel],
    ['gender', profile.gender],
    ['orientation', profile.orientation],
    ['country', profile.country],
    ['photos', t('admin.userProfile.photoCount').replace('{count}', profile.photos?.length || 0)],
    ['verified', profile.user?.ageVerifiedAt ? t('admin.userProfile.yes') : t('admin.userProfile.no')],
    ['createdAt', formatDate(profile.createdAt)],
  ]

  return (
    <section aria-label={t('admin.userProfile.title')} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
      {modalOpen && <AdminReasonModal colors={C} title={t('admin.userProfile.saveTitle')} onConfirm={save} onCancel={() => setModalOpen(false)} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:500, color:C.text2 }}>{t('admin.userProfile.title')}</span>
        <button type="button" onClick={() => setModalOpen(true)} style={{ background:C.primary, border:'none', borderRadius:8, padding:'6px 14px', color:'#0A141A', fontSize:12, fontWeight:600, cursor:'pointer' }}>{t('admin.userProfile.save')}</button>
      </div>
      {message && <div role="status" style={{ color:C.success, fontSize:12, marginBottom:10 }}>{message}</div>}
      {error && <div role="alert" style={{ color:C.danger, fontSize:12, marginBottom:10 }}>{error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        <label style={{ background:C.elevated, borderRadius:10, padding:'10px 12px' }}>
          <span style={{ fontSize:10, color:C.muted, textTransform:'uppercase', display:'block', marginBottom:4 }}>{t('admin.userProfile.fields.status')}</span>
          <select value={form.status} onChange={event => setForm(previous => ({...previous, status:event.target.value}))} style={{ background:'none', border:'none', color:C.primary, fontSize:13, fontWeight:600, cursor:'pointer', width:'100%' }}>
            {ADMIN_PROFILE_DETAIL_STATUSES.map(status => <option key={status} value={status}>{t(`admin.userProfile.status.${status}`, status)}</option>)}
          </select>
        </label>
        <div style={{ background:C.elevated, borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', marginBottom:4 }}>{t('admin.userProfile.fields.type')}</div>
          <div style={{ fontSize:13, color:C.text }}>{profile.type || 'INDIVIDUAL'}</div>
        </div>
      </div>

      {['displayName','bio','city'].map(key => (
        <label key={key} style={{ display:'block', marginBottom:10 }}>
          <span style={{ fontSize:11, color:C.muted, display:'block', marginBottom:3, textTransform:'uppercase' }}>{t(`admin.userProfile.fields.${key}`)}</span>
          {key === 'bio'
            ? <textarea rows={3} value={form[key]} onChange={event => setForm(previous => ({...previous, [key]:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'10px 12px', color:C.text, resize:'none' }} />
            : <input value={form[key]} onChange={event => setForm(previous => ({...previous, [key]:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'10px 12px', color:C.text }} />}
        </label>
      ))}

      <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:10 }}>{t('admin.userProfile.readOnly')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8 }}>
          {readOnlyFields.map(([key, value]) => value ? (
            <div key={key} style={{ background:C.elevated, borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', marginBottom:2 }}>{t(`admin.userProfile.fields.${key}`)}</div>
              <div style={{ fontSize:12, color:C.text }}>{value}</div>
            </div>
          ) : null)}
        </div>
      </div>

      {profile.intentions?.length > 0 && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:8 }}>{t('admin.userProfile.intentions')}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {profile.intentions.map(item => <span key={item.intention?.id || item.intention?.slug} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>{item.intention?.name || item.intention?.slug}</span>)}
          </div>
        </div>
      )}
    </section>
  )
}
