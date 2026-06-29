import { useNavigate } from 'react-router-dom'
import ProfilePage from './pages/ProfilePage'
import ExploreScreen from './screens/ExploreScreen'
import MatchesScreen from './screens/MatchesScreen'
import GuideScreen from './screens/GuideScreen'

const colors = {
  bg:'#0E0818', plum:'#2D1B4E', accent:'#C9956B', muted:'#7A6E88'
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
    <div style={{ maxWidth:420, margin:'0 auto', minHeight:'100vh',
      background:colors.bg, position:'relative' }}>
      <div style={{ paddingBottom:70 }}>
        {renderScreen()}
      </div>
      <nav style={{ position:'fixed', bottom:0, left:'50%',
        transform:'translateX(-50%)', width:'100%', maxWidth:420,
        background:'rgba(14,8,24,0.97)', backdropFilter:'blur(20px)',
        borderTop:`1px solid ${colors.plum}`,
        display:'flex', justifyContent:'space-around',
        padding:'10px 0 20px', zIndex:100 }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => navigate(n.path)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center',
              gap:3, cursor:'pointer', padding:'4px 12px', borderRadius:12,
              border:'none', background:'none', transition:'all 0.2s' }}>
            <span style={{ fontSize:20,
              filter: screen === n.key
                ? `drop-shadow(0 0 6px ${colors.accent})` : 'none' }}>
              {n.icon}
            </span>
            <span style={{ fontSize:10, fontFamily:'Inter,sans-serif',
              color: screen === n.key ? colors.accent : colors.muted }}>
              {n.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
