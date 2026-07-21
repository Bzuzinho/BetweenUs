import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'

export default function AdminReferralRule({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [rule, setRule] = useState(null)
  const [form, setForm] = useState({ referralsRequired:2, rewardMonths:2 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/admin/referral-rule')
      .then(response => {
        setRule(response.data.rule)
        setForm({ referralsRequired:response.data.rule.referralsRequired, rewardMonths:response.data.rule.rewardMonths })
      })
      .catch(() => setError(t('admin.settings.referrals.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await api.put('/admin/referral-rule', {
        referralsRequired:Number(form.referralsRequired),
        rewardMonths:Number(form.rewardMonths),
      })
      setRule(response.data.rule)
      setMessage(t('admin.settings.referrals.updated'))
    } catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.referrals.saveError')) }
    finally { setSaving(false) }
  }

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error && !rule) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />

  return (
    <section aria-label={t('admin.settings.referrals.title')}>
      <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:C.primary, lineHeight:1.5 }}>{t('admin.settings.referrals.description')}</div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, maxWidth:420 }}>
        <label style={{ fontSize:12, color:C.text2, fontWeight:600, display:'block', marginBottom:6 }}>{t('admin.settings.referrals.required')}</label>
        <input type="number" min="1" value={form.referralsRequired} onChange={event => setForm(previous => ({...previous, referralsRequired:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.elevated, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14, marginBottom:16 }} />
        <label style={{ fontSize:12, color:C.text2, fontWeight:600, display:'block', marginBottom:6 }}>{t('admin.settings.referrals.months')}</label>
        <input type="number" min="1" value={form.rewardMonths} onChange={event => setForm(previous => ({...previous, rewardMonths:event.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:C.elevated, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14, marginBottom:18 }} />
        {error && <div role="alert" style={{ color:C.danger, fontSize:13, marginBottom:12 }}>{error}</div>}
        {message && <div role="status" style={{ color:C.success, fontSize:13, marginBottom:12 }}>{message}</div>}
        <button type="button" onClick={save} disabled={saving} style={{ background:C.primary, border:'none', borderRadius:10, padding:'11px 20px', color:'#0A141A', fontWeight:700, fontSize:14, cursor:'pointer' }}>{saving ? t('admin.settings.referrals.saving') : t('admin.settings.referrals.save')}</button>
        {rule && <div style={{ marginTop:16, fontSize:12, color:C.muted, lineHeight:1.5 }}>{t('admin.settings.referrals.current').replace('{required}', rule.referralsRequired).replace('{months}', rule.rewardMonths)}</div>}
      </div>
    </section>
  )
}
