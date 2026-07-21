import { useI18n } from '../../i18n/I18nContext'

export const ADMIN_SUBSCRIPTION_PLANS = [
  { slug:'FREE', priceKey:'freePrice', features:['profile','limitedMatches','basicChat'] },
  { slug:'PREMIUM', priceKey:'premiumPrice', features:['invisibleMode','travelMode','advancedPrivatePhotos','premiumFilters','contactBlocking','discreetReceipts'] },
]

export default function AdminSubscriptionSettings({ colors }) {
  const C = colors
  const { t } = useI18n()
  return <section aria-label={t('admin.settings.subscriptions.title')}>
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
      <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:12 }}>{t('admin.settings.subscriptions.manageTitle')}</div>
      <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:12 }}>{t('admin.settings.subscriptions.manageDescription')}</div>
      <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" style={{ display:'inline-block', background:C.primary, borderRadius:50, padding:'10px 20px', fontSize:13, fontWeight:500, color:'#0A141A', textDecoration:'none' }}>{t('admin.settings.subscriptions.openStripe')}</a>
    </div>
    <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:10 }}>{t('admin.settings.subscriptions.currentPlans')}</div>
    {ADMIN_SUBSCRIPTION_PLANS.map(plan => <div key={plan.slug} style={{ background:C.surface, border:`1px solid ${plan.slug === 'PREMIUM' ? C.primary : C.border}`, borderRadius:16, padding:18, marginBottom:10 }}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}><div><div style={{ fontSize:15, fontWeight:600, color:C.text }}>{t(`admin.settings.subscriptions.plan.${plan.slug}.name`)}</div><div style={{ fontSize:13, color:C.primary, marginTop:2 }}>{t(`admin.settings.subscriptions.${plan.priceKey}`)}</div></div><code style={{ color:C.text2, fontSize:11 }}>{plan.slug}</code></div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{plan.features.map(feature => <span key={feature} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>{t(`admin.settings.subscriptions.features.${feature}`)}</span>)}</div></div>)}
  </section>
}
