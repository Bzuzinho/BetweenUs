import { useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import AdminCatalogManager from './AdminCatalogManager'
import AdminProfileTypeSettings from './AdminProfileTypeSettings'
import AdminRoleReference from './AdminRoleReference'
import AdminLocationsSettings from './AdminLocationsSettings'
import AdminSubscriptionSettings from './AdminSubscriptionSettings'
import AdminEmailDiagnostics from './AdminEmailDiagnostics'
import AdminGuideSettings from './AdminGuideSettings'
import AdminEventsSettings from './AdminEventsSettings'
import AdminCirclesSettings from './AdminCirclesSettings'
import AdminRecommendationsSettings from './AdminRecommendationsSettings'
import AdminReferralRule from './AdminReferralRule'
import { ADMIN_SETTINGS_TABS } from './adminSettingsContracts'

const icons = { profiles:'◎', adminRoles:'🛡', genders:'⚧', orientations:'◇', intentions:'✚', boundaries:'▲', privateInterests:'✷', locations:'📍', subscriptions:'✦', email:'✉', guide:'◈', events:'◇', circles:'◎', recommendations:'✦', referrals:'🎁' }

export default function AdminSettingsPage({ colors }) {
  const C = colors
  const { t } = useI18n()
  const [tab, setTab] = useState('profiles')

  const content = () => {
    if (tab === 'profiles') return <AdminProfileTypeSettings colors={C} />
    if (tab === 'adminRoles') return <AdminRoleReference colors={C} />
    if (['genders','orientations','intentions','boundaries','privateInterests'].includes(tab)) return <AdminCatalogManager colors={C} catalog={tab} />
    if (tab === 'locations') return <AdminLocationsSettings colors={C} />
    if (tab === 'subscriptions') return <AdminSubscriptionSettings colors={C} />
    if (tab === 'email') return <AdminEmailDiagnostics colors={C} />
    if (tab === 'guide') return <AdminGuideSettings colors={C} />
    if (tab === 'events') return <AdminEventsSettings colors={C} />
    if (tab === 'circles') return <AdminCirclesSettings colors={C} />
    if (tab === 'recommendations') return <AdminRecommendationsSettings colors={C} />
    if (tab === 'referrals') return <AdminReferralRule colors={C} />
    return null
  }

  return <section aria-label={t('admin.tabs.settings.label')}>
    <div role="tablist" aria-label={t('admin.tabs.settings.label')} style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
      {ADMIN_SETTINGS_TABS.map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} style={{ background:tab === value ? C.primaryDim : C.surface, border:`1.5px solid ${tab === value ? C.primary : C.border}`, borderRadius:10, padding:'9px 14px', color:tab === value ? C.primary : C.text2, fontSize:13, cursor:'pointer', minHeight:40 }}>{icons[value]} {t(`admin.settings.tabs.${value}`)}</button>)}
    </div>
    <div role="tabpanel">{content()}</div>
  </section>
}
