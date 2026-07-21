import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'

export default function AdminEmailDiagnostics({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [diagnostic, setDiagnostic] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpUrl, setOtpUrl] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const runDiagnostic = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await api.get('/admin/email-config'); setDiagnostic(response.data) }
    catch { setDiagnostic({ status:'error', message:t('admin.settings.email.diagnosticError') }) }
    finally { setLoading(false) }
  }, [t])

  useEffect(() => { runDiagnostic() }, [runDiagnostic])

  const sendTest = async () => {
    setMessage(''); setError('')
    try { await api.post('/admin/test-email', { to:testTo }); setMessage(t('admin.settings.email.sent').replace('{email}', testTo)) }
    catch (responseError) { setError(responseError.response?.data?.detail || responseError.response?.data?.error || t('admin.settings.email.sendError')) }
  }

  const generateOtp = async () => {
    setMessage(''); setError('')
    try { const response = await api.post('/auth/otp', { targetEmail:otpEmail }); setOtpUrl(response.data.loginUrl || '') }
    catch (responseError) { setError(responseError.response?.data?.error || t('admin.settings.email.otpError')) }
  }

  const statusKey = diagnostic?.status === 'ok' ? 'ok' : diagnostic?.status === 'misconfigured' ? 'misconfigured' : 'error'

  return (
    <section aria-label={t('admin.settings.email.title')}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}><div style={{ fontSize:14, fontWeight:500, color:C.text }}>{t('admin.settings.email.smtpTitle')}</div><button type="button" onClick={runDiagnostic} disabled={loading} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 12px', color:C.text2, cursor:'pointer' }}>{loading ? '…' : t('admin.settings.email.test')}</button></div>
        {diagnostic && <>
          <div style={{ display:'inline-block', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:500, marginBottom:12, background:statusKey === 'ok' ? C.successDim : C.dangerDim, color:statusKey === 'ok' ? C.success : C.danger }}>{t(`admin.settings.email.status.${statusKey}`)}</div>
          {diagnostic.message && statusKey !== 'ok' && <div style={{ fontSize:12, color:C.danger, marginBottom:10, fontFamily:'monospace', background:C.elevated, borderRadius:8, padding:'8px 10px' }}>{diagnostic.message}</div>}
          {diagnostic.missing?.length > 0 && <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:C.danger, marginBottom:6 }}>{t('admin.settings.email.missing')}</div>{diagnostic.missing.map(key => <div key={key} style={{ fontFamily:'monospace', fontSize:12, color:C.danger, padding:'3px 8px' }}>{key}</div>)}</div>}
          {diagnostic.hints?.length > 0 && <div><div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{t('admin.settings.email.hints')}</div>{diagnostic.hints.map((hint, index) => <div key={index} style={{ fontSize:12, color:C.text2, marginBottom:3 }}>• {hint}</div>)}</div>}
          {diagnostic.config && <div style={{ marginTop:10 }}><div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{t('admin.settings.email.currentValues')}</div>{Object.entries(diagnostic.config).map(([key,value]) => <div key={key} style={{ display:'flex', gap:8, fontSize:12, marginBottom:2 }}><span style={{ color:C.muted, minWidth:120, fontFamily:'monospace' }}>{key}</span><span style={{ color:value ? C.text2 : C.danger, fontFamily:'monospace' }}>{value || t('admin.settings.email.undefined')}</span></div>)}</div>}
        </>}
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:12 }}>{t('admin.settings.email.testEmailTitle')}</div>
        <div style={{ display:'flex', gap:8 }}><input value={testTo} onChange={event => setTestTo(event.target.value)} placeholder={t('admin.settings.email.destination')} style={{ flex:1, background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text }} /><button type="button" onClick={sendTest} disabled={!testTo} style={{ background:C.primary, border:'none', borderRadius:10, padding:'0 16px', color:'#0A141A', fontWeight:600 }}>{t('admin.settings.email.send')}</button></div>
      </div>

      <div style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:4 }}>{t('admin.settings.email.otpTitle')}</div><div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{t('admin.settings.email.otpDescription')}</div>
        <div style={{ display:'flex', gap:8 }}><input value={otpEmail} onChange={event => setOtpEmail(event.target.value)} placeholder={t('admin.settings.email.userEmail')} style={{ flex:1, background:C.input, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', color:C.text }} /><button type="button" onClick={generateOtp} disabled={!otpEmail} style={{ background:C.elevated, border:`1px solid ${C.primary}`, borderRadius:10, padding:'0 14px', color:C.primary, fontWeight:600 }}>{t('admin.settings.email.generate')}</button></div>
        {otpUrl && <div style={{ marginTop:12 }}><div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{t('admin.settings.email.otpLink')}</div><div style={{ background:C.bg, borderRadius:8, padding:'10px 12px', fontSize:11, color:C.primary, fontFamily:'monospace', wordBreak:'break-all', marginBottom:6 }}>{otpUrl}</div><button type="button" onClick={() => navigator.clipboard.writeText(otpUrl)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 12px', color:C.muted }}>{t('admin.settings.email.copy')}</button></div>}
      </div>
      {message && <div role="status" style={{ color:C.success, marginTop:10 }}>{message}</div>}
      {error && <div role="alert" style={{ color:C.danger, marginTop:10 }}>{error}</div>}
    </section>
  )
}
