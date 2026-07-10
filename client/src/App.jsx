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
import { resolvePostLoginRoute } from './lib/postLoginRoute'

const C = { bg:'#0A141A' }

const LoadingScreen = () => (
  <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <svg width="56" height="28" viewBox="0 0 56 28">
      <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
      <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.75"/>
    </svg>
  </div>
)

// BETA.2.5 — recoverable fallback for a route that ends up in a state
// resolvePostLoginRoute/PrivateRoute genuinely cannot classify (should not
// normally happen — this is a safety net, not the primary fix). The
// primary fix is (a) lib/api.js now has a request timeout, so a hung
// backend request rejects instead of leaving `loading` true forever, and
// (b) a single resolvePostLoginRoute() definition instead of four
// divergent copies. This component exists so that IF some future state
// still slips through, the user sees an actionable screen — never a
// spinner with no way out.
function AuthErrorScreen({ onRetry }) {
  const { logout } = useAuth()
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', gap:14 }}>
      <div style={{ color:'#F5F7FA', fontSize:16, fontWeight:600, maxWidth:320 }}>Não conseguimos concluir a entrada na tua conta.</div>
      <div style={{ color:'#7E8FA3', fontSize:13, maxWidth:320 }}>Isto pode ser temporário. Tenta novamente ou termina sessão.</div>
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        <button onClick={onRetry} style={{ background:'#B8A7FF', border:'none', borderRadius:10, padding:'10px 18px', color:'#0A141A', fontWeight:600, fontSize:13, cursor:'pointer' }}>Tentar novamente</button>
        <button onClick={() => logout().then(() => window.location.href = '/login')} style={{ background:'none', border:'1px solid #1E3340', borderRadius:10, padding:'10px 18px', color:'#AAB6C2', fontSize:13, cursor:'pointer' }}>Terminar sessão</button>
      </div>
      <div style={{ color:'#4A6B7A', fontSize:11, marginTop:4 }}>Se o problema persistir, contacta o suporte com esta referência: AUTH_ROUTE_UNRESOLVED</div>
    </div>
  )
}

function PrivateRoute({ children, requireProfile = true }) {
  const { user, loading, refreshUser } = useAuth()
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
  // Was `if (loading) return null` — rendered a genuinely blank page (not
  // even a spinner) for the entire duration of the initial /auth/me call.
  // Combined with no axios timeout (lib/api.js), a hung request here
  // looked exactly like "a aplicação fica permanentemente a pensar" with
  // nothing on screen to even suggest something was loading.
  if (loading) return <LoadingScreen />
  if (user) {
    const { route } = resolvePostLoginRoute(user)
    return <Navigate to={route} replace />
  }
  return children
}

function RootRedirect() {
  const { user, loading, refreshUser } = useAuth()
  if (loading) return <LoadingScreen />
  const { route, reason } = resolvePostLoginRoute(user)
  if (reason === 'NOT_AUTHENTICATED') return <Navigate to={route} replace />
  // Defensive: resolvePostLoginRoute is total (always returns a route for
  // any input), so this branch is unreachable in practice — kept as an
  // explicit safety net per the "nenhum estado válido deve produzir
  // loading infinito" requirement, not as the primary fix.
  if (!route) return <AuthErrorScreen onRetry={refreshUser} />
  return <Navigate to={route} replace />
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
