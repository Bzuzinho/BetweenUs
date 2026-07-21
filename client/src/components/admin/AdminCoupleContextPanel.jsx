import { useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { discoveryPolicyKey, sharedProfileTypeKey } from './adminCoupleContextContracts'

export default function AdminCoupleContextPanel({ colors, context, profileId }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [raw, setRaw] = useState(null)
  const [loadingRaw, setLoadingRaw] = useState(false)
  const [error, setError] = useState('')

  if (!context) return <AdminAsyncState colors={C} state="unavailable" message={t('admin.coupleContext.empty')} />

  const loadRaw = async () => {
    if (!profileId) return
    setLoadingRaw(true)
    setError('')
    try {
      const response = await api.get(`/agreements/admin/${profileId}/raw`)
      setRaw(response.data)
    } catch (responseError) {
      setError(responseError.response?.data?.error || t('admin.coupleContext.rawError'))
    } finally {
      setLoadingRaw(false)
    }
  }

  const agreement = context.agreement
  const profileType = sharedProfileTypeKey(context.type)
  const discoveryPolicy = discoveryPolicyKey(context.individualDiscoveryPolicy)

  return (
    <section aria-label={t('admin.coupleContext.title')} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
      <div style={{ fontSize:14, fontWeight:500, color:C.text2, marginBottom:4 }}>
        {t(`admin.coupleContext.type.${profileType}`)}: {context.displayName}
      </div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:12 }}>{t('admin.coupleContext.memberExplanation')}</div>

      <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>
        {t('admin.coupleContext.approvalPolicy')}: <strong style={{ color:C.text }}>{context.approvalPolicy || '—'}</strong>
        {' · '}{t('admin.coupleContext.activeMembers')}: <strong style={{ color:C.text }}>{context.activeMemberCount ?? 0}</strong>
      </div>
      <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
        {t('admin.coupleContext.discoveryPolicy')}: <strong style={{ color:C.text }}>{t(`admin.coupleContext.discovery.${discoveryPolicy}`)}</strong>
      </div>

      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{t('admin.coupleContext.members')}</div>
      {(context.members || []).map(member => (
        <div key={member.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'8px 0', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
          <span style={{ color:C.text }}>
            {member.email || t('admin.coupleContext.pendingInvite')}
            {member.isCreator ? ` · ${t('admin.coupleContext.creator')}` : ''}
          </span>
          <span style={{ color:member.status === 'ACCEPTED' ? C.success : member.status === 'PENDING' ? C.warning : C.muted }}>
            {t(`admin.coupleContext.memberStatus.${member.status}`, member.status)}
          </span>
        </div>
      ))}

      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', margin:'16px 0 6px' }}>{t('admin.coupleContext.agreementMode')}</div>
      {agreement ? (
        <div style={{ fontSize:12, color:C.text2, lineHeight:1.9 }}>
          <div>{t('admin.coupleContext.status')}: <strong style={{ color:C.text }}>{agreement.status}</strong> (v{agreement.version})</div>
          <div>{t('admin.coupleContext.conflicts')}: <strong style={{ color:agreement.conflictCount > 0 ? C.danger : C.text }}>{agreement.conflictCount}</strong></div>
          <div>{t('admin.coupleContext.missing')}: <strong style={{ color:C.text }}>{agreement.missingCount}</strong></div>
          {agreement.lockedAt && <div>{t('admin.coupleContext.lockedAt')}: <strong style={{ color:C.text }}>{formatDate(agreement.lockedAt)}</strong></div>}
        </div>
      ) : <div style={{ color:C.muted, fontSize:12 }}>{t('admin.coupleContext.noAgreement')}</div>}

      {error && <div role="alert" style={{ color:C.danger, fontSize:12, marginTop:12 }}>{error}</div>}

      {!raw ? (
        <button type="button" onClick={loadRaw} disabled={loadingRaw || !profileId} style={{ marginTop:14, background:C.dangerDim, border:'1px solid rgba(248,113,113,0.3)', borderRadius:10, padding:'8px 14px', color:C.danger, fontSize:12, cursor:'pointer', opacity:loadingRaw || !profileId ? 0.6 : 1 }}>
          {loadingRaw ? t('admin.common.loading') : `⚠ ${t('admin.coupleContext.viewRaw')}`}
        </button>
      ) : (
        <div style={{ marginTop:14, background:C.dangerDim, border:'1px solid rgba(248,113,113,0.3)', borderRadius:12, padding:12 }}>
          <div style={{ fontSize:11, color:C.danger, marginBottom:8 }}>⚠ {t('admin.coupleContext.rawWarning')}</div>
          {(raw.answers || []).map((answer, index) => (
            <div key={answer.id || index} style={{ fontSize:12, color:C.text2, padding:'4px 0', borderBottom:`1px solid ${C.border}` }}>
              <strong style={{ color:C.text }}>{answer.member?.email || '—'}</strong>: {answer.question} → {answer.preference}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
