import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import AdminReasonModal from './AdminReasonModal'
import AdminRoleManager from './AdminRoleManager'
import { availableAdminUserActions, canViewSensitiveTaxId } from './adminUserDetailContracts'

export default function AdminUserAccountDetail({ colors, userId, currentAdminRole, onBack, onDeleted }) {
  const C = colors
  const { t, locale } = useI18n()
  const [data, setData] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [form, setForm] = useState({ email:'', accountName:'', nif:'' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)

  const canSeeNif = canViewSensitiveTaxId(currentAdminRole)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get(`/admin/users/${userId}`),
      api.get(`/admin/users/${userId}/eligibility`).catch(() => ({ data:{ eligibility:null } })),
    ])
      .then(([userResponse, eligibilityResponse]) => {
        setData(userResponse.data)
        setEligibility(eligibilityResponse.data.eligibility)
        setForm({
          email: userResponse.data.email || '',
          accountName: userResponse.data.accountName || '',
          nif: userResponse.data.nif || '',
        })
      })
      .catch(responseError => setError(responseError.response?.data?.error || t('admin.users.detail.loadError')))
      .finally(() => setLoading(false))
  }, [userId, t])

  useEffect(() => { load() }, [load])

  const formatDate = value => value ? new Intl.DateTimeFormat(locale).format(new Date(value)) : '—'
  const actions = useMemo(() => availableAdminUserActions(data?.status), [data?.status])

  const run = async operation => {
    setBusy(true)
    setError('')
    setMessage('')
    try { await operation() } finally { setBusy(false) }
  }

  const saveAccount = (reason, internalNote) => run(async () => {
    const payload = { email:form.email, accountName:form.accountName, reason, internalNote }
    if (canSeeNif) payload.nif = form.nif
    await api.put(`/admin/users/${userId}`, payload)
    setModal(null)
    setMessage(t('admin.users.detail.updated'))
    load()
  }).catch(responseError => setError(responseError.response?.data?.error || t('admin.users.detail.actionError')))

  const changeStatus = (status, reason) => run(async () => {
    await api.put(`/admin/users/${userId}/status`, { status, reason })
    setModal(null)
    setMessage(t('admin.users.detail.statusUpdated').replace('{status}', t(`admin.users.detail.status.${status}`, status)))
    load()
  }).catch(responseError => setError(responseError.response?.data?.error || t('admin.users.detail.actionError')))

  const deleteUser = (reason, internalNote) => run(async () => {
    await api.delete(`/admin/users/${userId}`, { data:{ reason, internalNote } })
    setModal(null)
    onDeleted?.()
    onBack?.()
  }).catch(responseError => setError(responseError.response?.data?.error || t('admin.users.detail.actionError')))

  const resetPassword = () => run(async () => {
    await api.post(`/admin/users/${userId}/reset-password`)
    setMessage(t('admin.users.detail.resetSent'))
  }).catch(() => setError(t('admin.users.detail.actionError')))

  const evaluateActivation = () => run(async () => {
    const response = await api.post(`/admin/users/${userId}/evaluate-activation`)
    if (response.data.activated) setMessage(t('admin.users.detail.activationSuccess'))
    else setError(t('admin.users.detail.activationPending'))
    load()
  }).catch(responseError => setError(responseError.response?.data?.error || t('admin.users.detail.actionError')))

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error && !data) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />
  if (!data) return <AdminAsyncState colors={C} state="unavailable" />

  return (
    <section aria-label={t('admin.users.detail.title')}>
      {modal === 'save' && <AdminReasonModal colors={C} title={t('admin.users.detail.saveTitle')} onConfirm={saveAccount} onCancel={() => setModal(null)} />}
      {modal === 'suspend' && <AdminReasonModal colors={C} title={t('admin.users.detail.suspend')} onConfirm={reason => changeStatus('SUSPENDED', reason)} onCancel={() => setModal(null)} />}
      {modal === 'ban' && <AdminReasonModal colors={C} title={t('admin.users.detail.ban')} onConfirm={reason => changeStatus('BANNED', reason)} onCancel={() => setModal(null)} />}
      {modal === 'activate' && <AdminReasonModal colors={C} title={t('admin.users.detail.activate')} onConfirm={reason => changeStatus('ACTIVE', reason)} onCancel={() => setModal(null)} />}
      {modal === 'delete' && <AdminReasonModal colors={C} title={t('admin.users.detail.delete')} onConfirm={deleteUser} onCancel={() => setModal(null)} />}

      <button type="button" onClick={onBack} aria-label={t('admin.users.detail.back')} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:14 }}>←</button>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:3 }}>{data.email}</div>
        <div style={{ fontSize:12, color:C.muted }}>
          {t(`admin.users.detail.status.${data.status}`, data.status)}
          {data.adminRole && <span style={{ color:C.primary }}> · {data.adminRole}</span>}
          {data.riskScore > 0 && <span style={{ color:C.danger }}> · {t('admin.users.risk').replace('{score}', data.riskScore)}</span>}
        </div>
        {eligibility && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
            {['canAppearInDiscovery','canLike','canMatch','canChat'].map(key => (
              <span key={key} style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:eligibility[key] ? C.successDim : C.dangerDim, color:eligibility[key] ? C.success : C.danger, border:`1px solid ${eligibility[key] ? C.success : C.danger}` }}>
                {eligibility[key] ? '✓' : '✕'} {t(`admin.users.detail.eligibility.${key}`)}
              </span>
            ))}
          </div>
        )}
        {eligibility?.reasons?.length > 0 && <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>{t('admin.users.detail.eligibilityReason')}: {eligibility.reasons.join(', ')}</div>}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {actions.canActivate && <button type="button" disabled={busy} onClick={() => setModal('activate')} style={{ minWidth:130, background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:'9px 14px', color:C.success, cursor:'pointer' }}>{t('admin.users.detail.activate')}</button>}
        {actions.canEvaluateActivation && <button type="button" disabled={busy} onClick={evaluateActivation} style={{ minWidth:150, background:C.successDim, border:`1px solid ${C.success}`, borderRadius:10, padding:'9px 14px', color:C.success, cursor:'pointer' }}>{t('admin.users.detail.evaluate')}</button>}
        {actions.canSuspend && <button type="button" disabled={busy} onClick={() => setModal('suspend')} style={{ minWidth:130, background:'rgba(251,191,36,0.1)', border:`1px solid ${C.warning}`, borderRadius:10, padding:'9px 14px', color:C.warning, cursor:'pointer' }}>{t('admin.users.detail.suspend')}</button>}
        {actions.canBan && <button type="button" disabled={busy} onClick={() => setModal('ban')} style={{ minWidth:110, background:C.dangerDim, border:`1px solid ${C.danger}`, borderRadius:10, padding:'9px 14px', color:C.danger, cursor:'pointer' }}>{t('admin.users.detail.ban')}</button>}
        {actions.canResetPassword && <button type="button" disabled={busy} onClick={resetPassword} style={{ minWidth:150, background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 14px', color:C.text2, cursor:'pointer' }}>{t('admin.users.detail.resetPassword')}</button>}
        {actions.canDelete && <button type="button" disabled={busy} onClick={() => setModal('delete')} style={{ minWidth:110, background:C.dangerDim, border:`1px solid rgba(248,113,113,0.3)`, borderRadius:10, padding:'9px 14px', color:C.danger, cursor:'pointer' }}>{t('admin.users.detail.delete')}</button>}
      </div>

      {message && <div role="status" style={{ background:C.successDim, border:`1px solid rgba(74,222,128,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.success, fontSize:13 }}>{message}</div>}
      {error && <div role="alert" style={{ background:C.dangerDim, border:`1px solid rgba(248,113,113,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:12, color:C.danger, fontSize:13 }}>{error}</div>}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontSize:14, fontWeight:500, color:C.text2 }}>{t('admin.users.detail.account')}</span>
          <button type="button" onClick={() => setModal('save')} style={{ background:C.primary, border:'none', borderRadius:8, padding:'6px 14px', color:'#0A141A', fontSize:12, fontWeight:600, cursor:'pointer' }}>{t('admin.users.detail.save')}</button>
        </div>
        <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.users.detail.email')}</label>
        <input value={form.email} onChange={event => setForm(previous => ({...previous, email:event.target.value}))} style={{ width:'100%', minHeight:44, boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'10px 12px', color:C.text, marginBottom:10 }} />
        <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.users.detail.accountName')}</label>
        <input value={form.accountName} onChange={event => setForm(previous => ({...previous, accountName:event.target.value}))} style={{ width:'100%', minHeight:44, boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'10px 12px', color:C.text, marginBottom:10 }} />
        {canSeeNif ? (
          <>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:4 }}>{t('admin.users.detail.nif')}</label>
            <input value={form.nif} onChange={event => setForm(previous => ({...previous, nif:event.target.value}))} style={{ width:'100%', minHeight:44, boxSizing:'border-box', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'10px 12px', color:C.text, marginBottom:10 }} />
          </>
        ) : <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>{t('admin.users.detail.nifRestricted')}</div>}
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
          <div>{t('admin.users.detail.emailVerified')}: {data.emailVerifiedAt ? formatDate(data.emailVerifiedAt) : t('admin.users.detail.no')}</div>
          {data.dateOfBirth && <div>{t('admin.users.detail.dateOfBirth')}: {formatDate(data.dateOfBirth)}</div>}
          <div>{t('admin.users.detail.createdAt')}: {formatDate(data.createdAt)}</div>
        </div>
        <AdminRoleManager colors={C} userId={userId} currentRole={data.adminRole} currentAdminRole={currentAdminRole} onChanged={load} />
      </div>
    </section>
  )
}
