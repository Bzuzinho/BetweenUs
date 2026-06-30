import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreateProfilePage from './pages/CreateProfilePage'
import CouplePage, { CoupleInvitePage } from './pages/CouplePage'
import PhotosPage from './pages/PhotosPage'
import ContactsBlockPage from './pages/ContactsBlockPage'
import VerificationPage from './pages/VerificationPage'
import PremiumPage from './pages/PremiumPage'
import PrivacySettingsPage from './pages/PrivacySettingsPage'
import BetaJoinPage from './pages/BetaJoinPage'
import LegalPage from './pages/LegalPage'
import AdminPage from './pages/AdminPage'
import AppShell from './AppShell'

const LoadingScreen = () => (
  <div style={{ minHeight:'100vh', background:'#0E0818', display:'flex',
    alignItems:'center', justifyContent:'center' }}>
    <div style={{ color:'#C9956B', fontFamily:"'Playfair Display',serif",
      fontSize:28, fontStyle:'italic' }}>Between Us</div>
  </div>
)

// Point 16: regular routes require a profile, UNLESS the user is an admin
function PrivateRoute({ children, requireProfile = true }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  // Admins are never forced through profile creation
  if (user.adminRole) return children
  if (requireProfile && !user.profile) return <Navigate to="/create-profile" replace />
  return children
}

// Point 1: dedicated admin route — requires adminRole, never requires a profile
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!user.adminRole) return <Navigate to="/explore" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    if (user.adminRole) return <Navigate to="/admin" replace />
    return <Navigate to={user.profile ? '/explore' : '/create-profile'} replace />
  }
  return children
}

// Point 16: root redirect respects admin flow
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.adminRole) return <Navigate to="/admin" replace />
  if (!user.profile) return <Navigate to="/create-profile" replace />
  return <Navigate to="/explore" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/join" element={<BetaJoinPage />} />
        <Route path="/join/:code" element={<BetaJoinPage />} />
        <Route path="/couple-invite/:token" element={<CoupleInvitePage />} />
        <Route path="/legal/:page" element={<LegalPage />} />

        {/* Point 1: admin panel — separate from normal user flow */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/admin/:tab" element={<AdminRoute><AdminPage /></AdminRoute>} />

        <Route path="/create-profile" element={
          <PrivateRoute requireProfile={false}><CreateProfilePage /></PrivateRoute>
        } />
        <Route path="/couple" element={<PrivateRoute><CouplePage /></PrivateRoute>} />
        <Route path="/photos" element={<PrivateRoute><PhotosPage /></PrivateRoute>} />
        <Route path="/contacts/block" element={<PrivateRoute><ContactsBlockPage /></PrivateRoute>} />
        <Route path="/verify" element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
        <Route path="/premium" element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
        <Route path="/privacy-settings" element={<PrivateRoute><PrivacySettingsPage /></PrivateRoute>} />

        {/* Point 2: /debug removed from production entirely — only in dev builds */}
        {import.meta.env.DEV && (
          <Route path="/debug" element={
            <div style={{ padding: 40, color: '#fff' }}>
              Debug page is only available via local dev server.
            </div>
          } />
        )}

        <Route path="/explore" element={<PrivateRoute><AppShell screen="explore" /></PrivateRoute>} />
        <Route path="/matches" element={<PrivateRoute><AppShell screen="matches" /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><AppShell screen="profile" /></PrivateRoute>} />
        <Route path="/guide" element={<PrivateRoute><AppShell screen="guide" /></PrivateRoute>} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
