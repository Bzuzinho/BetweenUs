import { useI18n } from '../../i18n/I18nContext'
import { ADMIN_DISPLAYED_SUBSCRIPTION_PLANS, STRIPE_PRODUCTS_URL } from './adminSubscriptionPlansContracts'

export default function AdminSubscriptionPlans({ colors }) {
  const C = colors
  const { t } = useI18n()

  return (
    <section aria-label={t('admin.settings.subscriptions.title')}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:12 }}>{t('admin.settings.subscriptions.manageTitle')}</div>
        <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:12 }}>{t('admin.settings.subscriptions.description')}</div>
        <a href={STRIPE_PRODUCTS_URL} target="_blank" rel="noopener noreferrer" style={{ display:'inline-block', background:C.primary, borderRadius:50, padding:'10px 20px', fontSize:13, fontWeight:500, color:'#0A141A', textDecoration:'none' }}>{t('admin.settings.subscriptions.openStripe')}</a>
      </div>

      <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>{t('admin.settings.subscriptions.currentPlans')}</div>
      {ADMIN_DISPLAYED_SUBSCRIPTION_PLANS.map(plan => (
        <article key={plan.slug} style={{ background:C.surface, border:`1px solid ${plan.slug === 'PREMIUM' ? C.primary : C.border}`, borderRadius:16, padding:18, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div><div style={{ fontSize:15, fontWeight:600, color:C.text }}>{t(`admin.settings.subscriptions.plans.${plan.translationKey}.name`)}</div><div style={{ fontSize:13, color:C.primary, marginTop:2 }}>{t(`admin.settings.subscriptions.plans.${plan.translationKey}.price`)}</div></div>
            <span style={{ fontSize:11, background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', color:C.text2 }}>{plan.slug}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {plan.featureKeys.map(feature => <span key={feature} style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:C.text2 }}>{t(`admin.settings.subscriptions.features.${feature}`)}</span>)}
          </div>
        </article>
      ))}
    </section>
  )
}
