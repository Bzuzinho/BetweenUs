import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfilePage from './pages/ProfilePage'
import ExploreScreen from './screens/ExploreScreen'
import MatchesListScreen from './screens/MatchesListScreen'
import GuideScreen from './screens/GuideScreen'
import RoomsLocalizedScreen from './screens/RoomsLocalizedScreen'
import LegalReacceptanceBanner from './components/LegalReacceptanceBanner'
import ProfileSwitcher from './components/ProfileSwitcher'
import LanguageSelector from './components/LanguageSelector'
import UserNotificationBell from './components/UserNotificationBell'
import { Logo } from './lib/design'
import { useI18n } from './i18n/I18nContext'
import { useAuth } from './context/AuthContext'
import api from './lib/api'
import { registerPush } from './lib/push'

const NAV = [
  { key:'explore', labelKey:'nav.explore', icon:'○', path:'/explore' },
  { key:'matches', labelKey:'nav.matches', icon:'◎', path:'/matches' },
  { key:'profile', labelKey:'nav.profile', icon:'◌', path:'/profile' },
  { key:'rooms', labelKey:'nav.rooms', icon:'◎', path:'/rooms' },
  { key:'guide', labelKey:'nav.guide', icon:'◈', path:'/guide' },
]

export default function AppShell({ screen }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.pushNotificationsEnabled !== false) registerPush(api, { requestPermission:true })
  }, [user?.id, user?.pushNotificationsEnabled])

  const renderScreen = () => {
    switch (screen) {
      case 'profile': return <ProfilePage />
      case 'matches': return <MatchesListScreen />
      case 'rooms': return <RoomsLocalizedScreen />
      case 'guide': return <GuideScreen />
      default: return <ExploreScreen />
    }
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label={t('common.navigation', 'Navegação principal')}>
        <div className="app-sidebar-brand"><Logo size={34} /><span>Between Us</span></div>
        <nav className="app-sidebar-nav">
          {NAV.map(item => {
            const active = screen === item.key
            return <button key={item.key} onClick={() => navigate(item.path)} className={`app-sidebar-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
              <span className="app-nav-icon">{item.icon}</span><span>{t(item.labelKey)}</span>
            </button>
          })}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-mobile-logo"><Logo size={26} /></div>
          <div className="app-header-actions">
            <LanguageSelector persistAccount compact />
            <UserNotificationBell appBadgeEnabled={user?.appIconBadgeEnabled !== false} />
            <ProfileSwitcher />
          </div>
        </header>
        <div className="app-content">
          <LegalReacceptanceBanner />
          <div className="app-shell-screen">{renderScreen()}</div>
        </div>
      </div>

      <nav className="app-bottom-nav">
        {NAV.map(item => {
          const active = screen === item.key
          return (
            <button key={item.key} onClick={() => navigate(item.path)} aria-label={t(item.labelKey)} aria-current={active ? 'page' : undefined} className={`app-bottom-nav-item ${active ? 'active' : ''}`}>
              <span className="app-nav-icon">{item.icon}</span>
              <span className="app-nav-label">{t(item.labelKey)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
