import { useI18n } from '../../i18n/I18nContext'

export const ADMIN_TABS = [
  { key:'dashboard', icon:'▣', translationKey:'dashboard' },
  { key:'reports', icon:'⚑', translationKey:'reports' },
  { key:'photos', icon:'◻', translationKey:'photos' },
  { key:'profiles', icon:'○', translationKey:'profiles' },
  { key:'users', icon:'◎', translationKey:'users' },
  { key:'verifications', icon:'◈', translationKey:'verifications' },
  { key:'conversations', icon:'◌', translationKey:'conversations' },
  { key:'audit', icon:'◑', translationKey:'audit' },
  { key:'beta', icon:'◇', translationKey:'beta' },
  { key:'configuracoes', icon:'⚙', translationKey:'settings' },
]

export default function AdminTabBar({ tab, changeTab, allowedTabs, colors }) {
  const { t } = useI18n()
  const tabs = ADMIN_TABS.filter(item => allowedTabs.includes(item.key))
  const stickyTop = 'calc(56px + env(safe-area-inset-top))'

  const label = item => t(`admin.tabs.${item.translationKey}.label`)

  return (
    <>
      <div
        className="admin-tabbar-mobile"
        style={{
          display:'grid',
          gridTemplateColumns:`repeat(${Math.min(tabs.length, 5)}, 1fr)`,
          background:colors.bg,
          borderBottom:`1px solid ${colors.border}`,
          position:'sticky',
          top:stickyTop,
          zIndex:40,
        }}
      >
        {tabs.map(item => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => changeTab(item.key)}
              aria-current={active ? 'page' : undefined}
              aria-label={label(item)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:2, padding:'7px 2px', background:active ? colors.primaryDim : 'none',
                border:'none', borderBottom:active ? `2px solid ${colors.primary}` : '2px solid transparent',
                color:active ? colors.primary : '#C8D4DC', fontSize:8,
                fontWeight:active ? 600 : 400, cursor:'pointer', minHeight:44,
              }}
            >
              <span aria-hidden="true" style={{ fontSize:16, lineHeight:1 }}>{item.icon}</span>
              <span style={{ marginTop:1, textAlign:'center', lineHeight:1.1 }}>{label(item)}</span>
            </button>
          )
        })}
      </div>

      <div
        className="admin-tabbar-desktop"
        style={{
          display:'none', flexWrap:'wrap', gap:4, padding:'10px 16px', background:colors.bg,
          borderBottom:`1px solid ${colors.border}`, position:'sticky', top:stickyTop, zIndex:40,
        }}
      >
        {tabs.map(item => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => changeTab(item.key)}
              aria-current={active ? 'page' : undefined}
              title={t(`admin.tabs.${item.translationKey}.description`)}
              style={{
                display:'flex', alignItems:'center', gap:5, background:active ? colors.primaryDim : 'none',
                border:`1px solid ${active ? colors.primary : 'transparent'}`, borderRadius:8,
                padding:'7px 12px', color:active ? colors.primary : '#C8D4DC', fontSize:13,
                fontWeight:active ? 600 : 400, cursor:'pointer', whiteSpace:'nowrap',
              }}
            >
              <span aria-hidden="true" style={{ fontSize:14 }}>{item.icon}</span>
              {label(item)}
            </button>
          )
        })}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .admin-tabbar-mobile { display:none !important; }
          .admin-tabbar-desktop { display:flex !important; }
          .admin-name-block { display:block !important; }
        }
        @media (max-width: 639px) {
          .admin-tabbar-desktop { display:none !important; }
          .admin-name-block { display:none !important; }
        }
      `}</style>
    </>
  )
}
