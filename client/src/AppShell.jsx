import { useNavigate } from 'react-router-dom'
import ProfilePage from './pages/ProfilePage'
import ExploreScreen from './screens/ExploreScreen'
import MatchesListScreen from './screens/MatchesListScreen'
import GuideScreen from './screens/GuideScreen'
import RoomsLocalizedScreen from './screens/RoomsLocalizedScreen'
import LegalReacceptanceBanner from './components/LegalReacceptanceBanner'
import ProfileSwitcher from './components/ProfileSwitcher'
import LanguageSelector from './components/LanguageSelector'
import { Logo } from './lib/design'
import { useI18n } from './i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3',
}

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
    <div style={{ width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100vh', minHeight:'-webkit-fill-available', background:C.bg, position:'relative' }}>
      <div style={{ paddingBottom:'calc(68px + env(safe-area-inset-bottom))', paddingTop:'env(safe-area-inset-top)' }}>
        <LegalReacceptanceBanner />
        <div style={{ padding:'10px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <Logo size={28} />
          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <LanguageSelector persistAccount compact />
            <ProfileSwitcher />
          </div>
        </div>
        {renderScreen()}
      </div>

      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'rgba(10,20,26,0.97)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-around', alignItems:'flex-start', paddingTop:10, paddingBottom:'calc(10px + env(safe-area-inset-bottom))', zIndex:100 }}>
        {NAV.map(item => {
          const active = screen === item.key
          return (
            <button key={item.key} onClick={() => navigate(item.path)} aria-label={t(item.labelKey)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'4px 16px', background:'none', border:'none', cursor:'pointer', minWidth:48, minHeight:48 }}>
              <span style={{ fontSize:20, color:active ? C.primary : C.muted, transition:'color 0.2s' }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight:active ? 500 : 400, color:active ? C.primary : C.muted, letterSpacing:0.3, transition:'color 0.2s' }}>{t(item.labelKey)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
