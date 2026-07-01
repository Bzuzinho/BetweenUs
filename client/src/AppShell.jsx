import { useNavigate } from 'react-router-dom'
import ProfilePage from './pages/ProfilePage'
import ExploreScreen from './screens/ExploreScreen'
import MatchesScreen from './screens/MatchesScreen'
import GuideScreen from './screens/GuideScreen'

const colors = {
  bg:'#0E0818', plum:'#2D1B4E', accent:'#C9956B',
  accentLight:'#E8B89A', muted:'#7A6E88', white:'#FAF7F5'
}

const NAV = [
  { key:'explore',  label:'Explorar', icon:'🔍', path:'/explore' },
  { key:'matches',  label:'Matches',  icon:'💬', path:'/matches' },
  { key:'profile',  label:'Perfil',   icon:'👤', path:'/profile' },
  { key:'guide',    label:'Guia',     icon:'📖', path:'/guide'   },
]

export default function AppShell({ screen }) {
  const navigate = useNavigate()

  const renderScreen = () => {
    switch(screen) {
      case 'profile': return <ProfilePage />
      case 'matches': return <MatchesScreen />
      case 'guide':   return <GuideScreen />
      default:        return <ExploreScreen />
    }
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      minHeight: '-webkit-fill-available',
      background: colors.bg,
      position: 'relative',
    }}>
      {/* Scrollable content area — leaves room for nav bar */}
      <div style={{
        paddingBottom: 'calc(70px + env(safe-area-inset-bottom))',
        minHeight: '100vh',
      }}>
        {renderScreen()}
      </div>

      {/* Fixed bottom nav — respects iPhone home indicator */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: 'rgba(14,8,24,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${colors.plum}`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        paddingTop: 10,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        {NAV.map(n => {
          const active = screen === n.key
          return (
            <button
              key={n.key}
              onClick={() => navigate(n.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 16px',
                borderRadius: 12,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                minWidth: 48,
                minHeight: 48,
              }}
            >
              <span style={{
                fontSize: 22,
                filter: active ? `drop-shadow(0 0 6px ${colors.accent})` : 'none',
                transition: 'filter 0.2s',
              }}>
                {n.icon}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                color: active ? colors.accentLight : colors.muted,
                letterSpacing: 0.3,
                transition: 'color 0.2s',
              }}>
                {n.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
