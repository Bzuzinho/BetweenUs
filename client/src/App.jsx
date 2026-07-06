import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import CreateProfilePage from './pages/CreateProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import AccountPage from './pages/AccountPage'
import CouplePage, { CoupleInvitePage } from './pages/CouplePage'
import GroupPage, { GroupInvitePage } from './pages/GroupPage'
import ReferralsPage from './pages/ReferralsPage'
import PhotosPage from './pages/PhotosPage'
import ContactsBlockPage from './pages/ContactsBlockPage'
import VerificationPage from './pages/VerificationPage'
import PremiumPage from './pages/PremiumPage'
import PrivacySettingsPage from './pages/PrivacySettingsPage'
import BetaJoinPage from './pages/BetaJoinPage'
import LegalPage from './pages/LegalPage'
import AdminPage from './pages/AdminPage'
import OtpLoginPage from './pages/OtpLoginPage'
import AppShell from './AppShell'

const C = { bg:'#0A141A' }

const LoadingScreen = () => (
  <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <svg width="56" height="28" viewBox="0 0 56 28">
      <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
      <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.75"/>
    </svg>
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

        {/* Public */}
        <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/join"            element={<BetaJoinPage />} />
        <Route path="/join/:code"      element={<BetaJoinPage />} />
        <Route path="/otp-login"         element={<OtpLoginPage />} />
        <Route path="/legal/:page"     element={<LegalPage />} />
        <Route path="/couple-invite/:token" element={<CoupleInvitePage />} />
        <Route path="/group-invite/:token" element={<GroupInvitePage />} />

        {/* Admin */}
        <Route path="/admin"      element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/admin/:tab" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Private */}
        <Route path="/account"           element={<PrivateRoute requireProfile={false}><AccountPage /></PrivateRoute>} />
        <Route path="/create-profile"    element={<PrivateRoute requireProfile={false}><CreateProfilePage /></PrivateRoute>} />
        <Route path="/edit-profile"      element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
        <Route path="/couple"            element={<PrivateRoute><CouplePage /></PrivateRoute>} />
        <Route path="/group"             element={<PrivateRoute><GroupPage /></PrivateRoute>} />
        <Route path="/referrals"         element={<PrivateRoute><ReferralsPage /></PrivateRoute>} />
        <Route path="/photos"            element={<PrivateRoute><PhotosPage /></PrivateRoute>} />
        <Route path="/contacts/block"    element={<PrivateRoute><ContactsBlockPage /></PrivateRoute>} />
        <Route path="/verify"            element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
        <Route path="/premium"           element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
        <Route path="/privacy-settings"  element={<PrivateRoute><PrivacySettingsPage /></PrivateRoute>} />

        {/* App shell */}
        <Route path="/explore" element={<PrivateRoute><AppShell screen="explore" /></PrivateRoute>} />
        <Route path="/matches"  element={<PrivateRoute><AppShell screen="matches" /></PrivateRoute>} />
        <Route path="/profile"  element={<PrivateRoute><AppShell screen="profile" /></PrivateRoute>} />
        <Route path="/guide"    element={<PrivateRoute><AppShell screen="guide" /></PrivateRoute>} />
        <Route path="/rooms"    element={<PrivateRoute><AppShell screen="rooms" /></PrivateRoute>} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
