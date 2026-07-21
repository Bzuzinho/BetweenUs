import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { visibleAdminUserDetailTabs } from './adminUserDetailNavigationContracts'

const TAB_ICONS = {
  info:'📧', profile:'👤', couple:'💑', subscription:'✦', referrals:'🎁', verification:'◈', privacy:'🔒', history:'📋',
}

export default function AdminUserDetailNavigator({ colors, hasCoupleContext = false, panels = {}, initialTab = 'info' }) {
  const C = colors
  const { t } = useI18n()
  const tabs = useMemo(() => visibleAdminUserDetailTabs({ hasCoupleContext }), [hasCoupleContext])
  const [activeTab, setActiveTab] = useState(tabs.includes(initialTab) ? initialTab : tabs[0])
  const activePanel = panels[activeTab]

  return (
    <div>
      <div role="tablist" aria-label={t('admin.userNavigation.label')} style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`admin-user-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{ background:activeTab === tab ? C.primaryDim : C.surface, border:`1.5px solid ${activeTab === tab ? C.primary : C.border}`, borderRadius:10, padding:'8px 10px', color:activeTab === tab ? C.primary : C.muted, fontSize:11, fontWeight:activeTab === tab ? 500 : 400, cursor:'pointer', minHeight:38 }}
          >
            <span aria-hidden="true">{TAB_ICONS[tab]}</span> {t(`admin.userNavigation.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div id={`admin-user-panel-${activeTab}`} role="tabpanel" aria-label={t(`admin.userNavigation.tabs.${activeTab}`)}>
        {activePanel || <div style={{ color:C.muted, padding:20 }}>{t('admin.userNavigation.unavailable')}</div>}
      </div>
    </div>
  )
}
