import { useNavigate } from 'react-router-dom'
import ProfilePage from './pages/ProfilePage'
import ExploreScreen from './screens/ExploreScreen'
import MatchesScreen from './screens/MatchesScreen'
import GuideScreen from './screens/GuideScreen'
import RoomsScreen from './screens/RoomsScreen'
import LegalReacceptanceBanner from './components/LegalReacceptanceBanner'
import ProfileSwitcher from './components/ProfileSwitcher'
import { Logo } from './lib/design'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3',
}

const NAV = [
  { key:'explore', label:'Explorar', icon:'○',  path:'/explore' },
  { key:'matches', label:'Matches',  icon:'◎',  path:'/matches' },
  { key:'profile', label:'Perfil',   icon:'◌',  path:'/profile' },
  { key:'rooms',   label:'Salas',    icon:'◎',  path:'/rooms'   },
  { key:'guide',   label:'Guia',     icon:'◈',  path:'/guide'   },
]

export default function AppShell({ screen }) {
  const navigate = useNavigate()

  const renderScreen = () => {
    switch(screen) {
      case 'profile': return <ProfilePage />
      case 'matches': return <MatchesScreen />
      case 'rooms':   return <RoomsScreen />
      case 'guide':   return <GuideScreen />
      default:        return <ExploreScreen />
    }
  }

  return (
    <div style={{
      width:'100%', maxWidth:480, margin:'0 auto',
      minHeight:'100vh', minHeight:'-webkit-fill-available',
      background:C.bg, position:'relative',
    }}>
      <div style={{ paddingBottom:'calc(68px + env(safe-area-inset-bottom))', paddingTop:'env(safe-area-inset-top)' }}>
        <LegalReacceptanceBanner />
        <div style={{ padding:'10px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <Logo size={28} />
          <ProfileSwitcher />
        </div>
        {renderScreen()}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position:'fixed', bottom:0,
        left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480,
        background:'rgba(10,20,26,0.97)',
        backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        borderTop:`1px solid ${C.border}`,
        display:'flex', justifyContent:'space-around', alignItems:'flex-start',
        paddingTop:10,
        paddingBottom:'calc(10px + env(safe-area-inset-bottom))',
        zIndex:100,
      }}>
        {NAV.map(n => {
          const active = screen === n.key
          return (
            <button
              key={n.key}
              onClick={() => navigate(n.path)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                padding:'4px 16px', background:'none', border:'none', cursor:'pointer',
                minWidth:48, minHeight:48,
              }}
            >
              <span style={{
                fontSize:20,
                color: active ? C.primary : C.muted,
                transition:'color 0.2s',
              }}>
                {n.icon}
              </span>
              <span style={{
                fontSize:10,
                fontWeight: active ? 500 : 400,
                color: active ? C.primary : C.muted,
                letterSpacing:0.3,
                transition:'color 0.2s',
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
