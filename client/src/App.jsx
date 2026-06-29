import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreateProfilePage from './pages/CreateProfilePage'
import CouplePage, { CoupleInvitePage } from './pages/CouplePage'
import CoupleLinkPage, { CoupleJoinPage } from './pages/CoupleLinkPage'
import PhotosPage from './pages/PhotosPage'
import ContactsBlockPage from './pages/ContactsBlockPage'
import VerificationPage from './pages/VerificationPage'
import PremiumPage from './pages/PremiumPage'
import TravelPage from './pages/TravelPage'
import CheckInPage from './pages/CheckInPage'
import AdminPage from './pages/AdminPage'
import DebugPage from './pages/DebugPage'
import AppShell from './AppShell'

function PrivateRoute({ children, requireProfile = true }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0E0818', display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#C9956B', fontFamily:"'Playfair Display',serif",
        fontSize:28, fontStyle:'italic' }}>Between Us</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (requireProfile && !user.profile) return <Navigate to="/create-profile" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={user.profile ? '/explore' : '/create-profile'} replace />
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0E0818', display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#C9956B', fontFamily:"'Playfair Display',serif",
        fontSize:28, fontStyle:'italic' }}>Between Us</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
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
        <Route path="/couple-invite/:token" element={<CoupleInvitePage />} />
        <Route path="/couple-join/:token" element={<CoupleJoinPage />} />
        <Route path="/create-profile" element={
          <PrivateRoute requireProfile={false}><CreateProfilePage /></PrivateRoute>
        } />
        <Route path="/couple" element={<PrivateRoute><CouplePage /></PrivateRoute>} />
        <Route path="/couple-link" element={<PrivateRoute><CoupleLinkPage /></PrivateRoute>} />
        <Route path="/photos" element={<PrivateRoute><PhotosPage /></PrivateRoute>} />
        <Route path="/contacts/block" element={
          <PrivateRoute><ContactsBlockPage /></PrivateRoute>
        } />
        <Route path="/verify" element={
          <PrivateRoute><VerificationPage /></PrivateRoute>
        } />
        <Route path="/premium" element={
          <PrivateRoute><PremiumPage /></PrivateRoute>
        } />
        <Route path="/travel" element={
          <PrivateRoute><TravelPage /></PrivateRoute>
        } />
        <Route path="/checkin" element={
          <PrivateRoute><CheckInPage /></PrivateRoute>
        } />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/explore" element={
          <PrivateRoute><AppShell screen="explore" /></PrivateRoute>
        } />
        <Route path="/matches" element={
          <PrivateRoute><AppShell screen="matches" /></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><AppShell screen="profile" /></PrivateRoute>
        } />
        <Route path="/guide" element={
          <PrivateRoute><AppShell screen="guide" /></PrivateRoute>
        } />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
