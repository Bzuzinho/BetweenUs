import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
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

const C = { bg:'#0E0818', accent:'#C9956B', rose:'#F2C4B8' }

const LoadingScreen = () => (
  <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontStyle:'italic', background:`linear-gradient(135deg,${C.accent},${C.rose})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
      Between Us
    </div>
  </div>
)

function PrivateRoute({ children, requireProfile = true }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.adminRole) return children
  if (requireProfile && !user.profile) return <Navigate to="/create-profile" replace />
  return children
}

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

        {/* Public auth routes */}
        <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />

        {/* Beta */}
        <Route path="/join"      element={<BetaJoinPage />} />
        <Route path="/join/:code" element={<BetaJoinPage />} />

        {/* Legal — public */}
        <Route path="/legal/:page" element={<LegalPage />} />

        {/* Couple invite — public (needs auth check inside) */}
        <Route path="/couple-invite/:token" element={<CoupleInvitePage />} />

        {/* Admin */}
        <Route path="/admin"      element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/admin/:tab" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Private routes */}
        <Route path="/create-profile"   element={<PrivateRoute requireProfile={false}><CreateProfilePage /></PrivateRoute>} />
        <Route path="/couple"           element={<PrivateRoute><CouplePage /></PrivateRoute>} />
        <Route path="/photos"           element={<PrivateRoute><PhotosPage /></PrivateRoute>} />
        <Route path="/contacts/block"   element={<PrivateRoute><ContactsBlockPage /></PrivateRoute>} />
        <Route path="/verify"           element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
        <Route path="/premium"          element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
        <Route path="/privacy-settings" element={<PrivateRoute><PrivacySettingsPage /></PrivateRoute>} />

        {/* Main app */}
        <Route path="/explore" element={<PrivateRoute><AppShell screen="explore" /></PrivateRoute>} />
        <Route path="/matches"  element={<PrivateRoute><AppShell screen="matches" /></PrivateRoute>} />
        <Route path="/profile"  element={<PrivateRoute><AppShell screen="profile" /></PrivateRoute>} />
        <Route path="/guide"    element={<PrivateRoute><AppShell screen="guide" /></PrivateRoute>} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
