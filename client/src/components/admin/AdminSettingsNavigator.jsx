import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { ADMIN_SETTINGS_TABS, ADMIN_SETTINGS_TAB_ICONS } from './adminSettingsContracts'

export default function AdminSettingsNavigator({ colors, panels = {}, initialTab = 'profiles' }) {
  const C = colors
  const { t } = useI18n()
  const availableTabs = useMemo(() => ADMIN_SETTINGS_TABS.filter(tab => panels[tab]), [panels])
  const [activeTab, setActiveTab] = useState(availableTabs.includes(initialTab) ? initialTab : availableTabs[0])
  const activePanel = panels[activeTab]

  if (!availableTabs.length) return null

  return (
    <section aria-label={t('admin.settings.navigation.label')}>
      <div role="tablist" aria-label={t('admin.settings.navigation.label')} style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {availableTabs.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`admin-settings-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              background:activeTab === tab ? C.primaryDim : C.surface,
              border:`1.5px solid ${activeTab === tab ? C.primary : C.border}`,
              borderRadius:10,
              padding:'9px 18px',
              color:activeTab === tab ? C.primary : '#C8D4DC',
              fontSize:14,
              cursor:'pointer',
              minHeight:40,
            }}
          >
            <span aria-hidden="true">{ADMIN_SETTINGS_TAB_ICONS[tab]}</span> {t(`admin.settings.navigation.tabs.${tab}`)}
          </button>
        ))}
      </div>
      <div id={`admin-settings-panel-${activeTab}`} role="tabpanel" aria-label={t(`admin.settings.navigation.tabs.${activeTab}`)}>
        {activePanel}
      </div>
    </section>
  )
}
