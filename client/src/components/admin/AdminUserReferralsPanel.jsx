import { useI18n } from '../../i18n/I18nContext'

export default function AdminUserReferralsPanel({ colors, referral }) {
  const C = colors
  const { t } = useI18n()
  const invited = referral?.invited || []

  return (
    <section aria-label={t('admin.userReferrals.title')} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
      <div style={{ fontSize:14, fontWeight:500, color:C.text2, marginBottom:10 }}>{t('admin.userReferrals.title')}</div>
      {!referral?.invitedBy && invited.length === 0 && <div style={{ color:C.muted, fontSize:13 }}>{t('admin.userReferrals.empty')}</div>}

      {referral?.invitedBy && (
        <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
          {t('admin.userReferrals.invitedBy')} <strong style={{ color:C.text }}>{referral.invitedBy.email}</strong>
          {' · '}{referral.invitedBySubscribed ? t('admin.userReferrals.subscribed') : t('admin.userReferrals.notSubscribed')}
        </div>
      )}

      {invited.length > 0 && (
        <>
          <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
            {t('admin.userReferrals.invitedCount').replace('{count}', invited.length)}
          </div>
          {invited.map((item, index) => {
            const status = item.creditGranted ? 'CREDITED' : item.subscribedAt ? 'SUBSCRIBED' : 'REGISTERED'
            return (
              <div key={item.user?.id || index} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                <span style={{ color:C.text, overflowWrap:'anywhere' }}>{item.user?.email || '—'}</span>
                <span style={{ color:item.creditGranted ? C.success : item.subscribedAt ? C.primary : C.muted }}>{t(`admin.userReferrals.status.${status}`)}</span>
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}
