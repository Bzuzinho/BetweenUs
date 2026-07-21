import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminHeader from '../components/admin/AdminHeader'
import AdminServiceStatus from '../components/admin/AdminServiceStatus'
import AdminTabBar from '../components/admin/AdminTabBar'
import AdminDashboard from '../components/admin/AdminDashboard'
import AdminReportsQueue from '../components/admin/AdminReportsQueue'
import AdminReportDetail from '../components/admin/AdminReportDetail'
import AdminPhotos from '../components/admin/AdminPhotos'
import AdminProfilesQueue from '../components/admin/AdminProfilesQueue'
import AdminProfileDetail from '../components/admin/AdminProfileDetail'
import AdminUsersModule from '../components/admin/AdminUsersModule'
import AdminVerificationsQueue from '../components/admin/AdminVerificationsQueue'
import AdminConversations from '../components/admin/AdminConversations'
import AdminAudit from '../components/admin/AdminAudit'

export const ADMIN_COLORS = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36', border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)', text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)', warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

export const ADMIN_ROLE_TABS = {
  SUPER_ADMIN:['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta','configuracoes'],
  ADMIN:['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta'],
  MODERATOR:['dashboard','reports','photos','profiles','conversations'],
  SUPPORT:['dashboard','users','reports'],
  FINANCE:['dashboard','users'],
  CONTENT_REVIEWER:['dashboard','photos','profiles'],
}

export const MODULAR_ADMIN_TABS = ['dashboard','reports','photos','profiles','users','verifications','conversations','audit']

export default function AdminModularPage() {
  const C = ADMIN_COLORS
  const { tab = 'dashboard' } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)

  const allowedTabs = useMemo(() => ADMIN_ROLE_TABS[user?.adminRole] || ['dashboard'], [user?.adminRole])

  useEffect(() => {
    if (!allowedTabs.includes(tab)) navigate('/admin/dashboard', { replace:true })
    setSelectedReportId(null)
    setSelectedProfile(null)
  }, [tab, allowedTabs, navigate])

  const changeTab = nextTab => navigate(`/admin/${nextTab}`)
  const signOut = async () => { await logout(); navigate('/login', { replace:true }) }

  const content = () => {
    if (tab === 'dashboard') return <AdminDashboard colors={C} changeTab={changeTab} />
    if (tab === 'reports') return selectedReportId
      ? <AdminReportDetail colors={C} reportId={selectedReportId} onBack={() => setSelectedReportId(null)} onResolved={() => setSelectedReportId(null)} />
      : <AdminReportsQueue colors={C} onSelectReport={setSelectedReportId} />
    if (tab === 'photos') return <AdminPhotos colors={C} />
    if (tab === 'profiles') return selectedProfile
      ? <AdminProfileDetail colors={C} profile={selectedProfile} onBack={() => setSelectedProfile(null)} onResolved={() => setSelectedProfile(null)} />
      : <AdminProfilesQueue colors={C} onSelectProfile={setSelectedProfile} />
    if (tab === 'users') return <AdminUsersModule colors={C} currentAdminRole={user?.adminRole} />
    if (tab === 'verifications') return <AdminVerificationsQueue colors={C} />
    if (tab === 'conversations') return <AdminConversations colors={C} />
    if (tab === 'audit') return <AdminAudit colors={C} />
    return null
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text }}>
      <AdminHeader user={user} onLogout={signOut} colors={C} />
      <AdminServiceStatus role={user?.adminRole} colors={C} />
      <AdminTabBar tab={tab} changeTab={changeTab} allowedTabs={allowedTabs} colors={C} />
      <main style={{ width:'100%', maxWidth:960, margin:'0 auto', padding:'18px 16px calc(40px + env(safe-area-inset-bottom))', boxSizing:'border-box' }}>
        {content()}
      </main>
    </div>
  )
}
