import { useI18n } from '../../i18n/I18nContext'

export default function AdminUserSubscriptionPanel({ colors, subscription, financials, isTestAccount = false }) {
  const C = colors
  const { t, formatDate, formatNumber } = useI18n()
  const formatMoney = (minorUnits, currency = 'EUR') => {
    if (minorUnits === null || minorUnits === undefined) return '—'
    try { return formatNumber(Number(minorUnits) / 100, { style:'currency', currency }) }
    catch { return `${(Number(minorUnits) / 100).toFixed(2)} ${currency}` }
  }
  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, fontSize:13, color:C.text2, lineHeight:2, marginBottom:14 }

  if (!subscription) return <div style={card}>{t('admin.userSubscription.empty')}</div>

  return (
    <section aria-label={t('admin.userSubscription.title')}>
      <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:6 }}>{t('admin.userSubscription.current')}</div>
      <div style={card}>
        <div>{t('admin.userSubscription.plan')}: <strong style={{ color:C.text }}>{subscription.plan}</strong></div>
        <div>{t('admin.userSubscription.status')}: <strong style={{ color:C.text }}>{subscription.status}</strong></div>
        <div>{t('admin.userSubscription.provider')}: <strong style={{ color:C.text }}>{subscription.provider || '—'}</strong></div>
        <div>{t('admin.userSubscription.startedAt')}: <strong style={{ color:C.text }}>{formatDate(subscription.createdAt)}</strong></div>
        {subscription.currentPeriodStart && <div>{t('admin.userSubscription.periodStart')}: <strong style={{ color:C.text }}>{formatDate(subscription.currentPeriodStart)}</strong></div>}
        {subscription.currentPeriodEnd && <div>{t('admin.userSubscription.periodEnd')}: <strong style={{ color:C.text }}>{formatDate(subscription.currentPeriodEnd)}</strong></div>}
        <div>{t('admin.userSubscription.cancelAtEnd')}: <strong style={{ color:subscription.cancelAtPeriodEnd ? C.warning : C.text }}>{subscription.cancelAtPeriodEnd ? t('admin.userSubscription.yes') : t('admin.userSubscription.no')}</strong></div>
        {subscription.cancelledAt && <div>{t('admin.userSubscription.cancelledAt')}: <strong style={{ color:C.danger }}>{formatDate(subscription.cancelledAt)}</strong></div>}
      </div>

      <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:6 }}>{t('admin.userSubscription.currentPeriod')}</div>
      <div style={card}>
        {financials?.hasLocalPaymentHistory
          ? <div>{t('admin.userSubscription.amountPaid')}: <strong style={{ color:C.text }}>{formatMoney(financials.currentPeriod?.amountPaid, financials.currentPeriod?.currency)}</strong></div>
          : <div style={{ color:C.muted }}>{t('admin.userSubscription.noLocalHistory')}</div>}
      </div>

      <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:6 }}>{t('admin.userSubscription.lifetime')}</div>
      <div style={card}>
        {financials?.hasLocalPaymentHistory ? (
          <>
            <div>{t('admin.userSubscription.totalPaid')}: <strong style={{ color:C.text }}>{formatMoney(financials.lifetime?.totalAmountPaid, financials.lifetime?.currency)}</strong></div>
            <div>{t('admin.userSubscription.successfulPayments')}: <strong style={{ color:C.text }}>{financials.lifetime?.totalSuccessfulPayments || 0}</strong></div>
            {financials.lifetime?.lastSuccessfulPaymentAt && <div>{t('admin.userSubscription.lastPayment')}: <strong style={{ color:C.text }}>{formatDate(financials.lifetime.lastSuccessfulPaymentAt)}</strong></div>}
            {financials.recentFailedPayments > 0 && <div>{t('admin.userSubscription.failedPayments')}: <strong style={{ color:C.danger }}>{financials.recentFailedPayments}</strong></div>}
          </>
        ) : (
          <div style={{ color:C.muted }}>
            {t('admin.userSubscription.noLocalHistory')}
            {isTestAccount && <div style={{ marginTop:6, fontSize:11 }}>{t('admin.userSubscription.testAccountNote')}</div>}
          </div>
        )}
      </div>
    </section>
  )
}
