import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import AdminUsersQueue from './AdminUsersQueue'
import AdminCreateUserModal from './AdminCreateUserModal'
import AdminUserDetailNavigator from './AdminUserDetailNavigator'
import AdminUserAccountDetail from './AdminUserAccountDetail'
import AdminUserProfilePanel from './AdminUserProfilePanel'
import AdminUserSubscriptionPanel from './AdminUserSubscriptionPanel'
import AdminUserReferralsPanel from './AdminUserReferralsPanel'
import AdminUserVerificationPanel from './AdminUserVerificationPanel'
import AdminUserPrivacyPanel from './AdminUserPrivacyPanel'
import AdminUserHistoryPanel from './AdminUserHistoryPanel'
import AdminCoupleContextPanel from './AdminCoupleContextPanel'

function AdminSelectedUser({ colors, userId, currentAdminRole, onBack }) {
  const C = colors
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    Promise.all([
      api.get(`/admin/users/${userId}`),
      api.get(`/admin/users/${userId}/history`).catch(() => ({ data:{ history:[] } })),
    ]).then(([userResponse, historyResponse]) => {
      setData(userResponse.data)
      setHistory(historyResponse.data.history || [])
    }).catch(() => setError(t('admin.users.detail.loadError'))).finally(() => setLoading(false))
  }, [userId, t])

  useEffect(() => { load() }, [load])

  const panels = useMemo(() => data ? {
    info:<AdminUserAccountDetail colors={C} userId={userId} currentAdminRole={currentAdminRole} onBack={onBack} onDeleted={onBack} />,
    profile:<AdminUserProfilePanel colors={C} profile={data.profile} onSaved={load} />,
    couple:data.coupleContext ? <AdminCoupleContextPanel colors={C} context={data.coupleContext} profileId={data.coupleContext.profileId} /> : null,
    subscription:<AdminUserSubscriptionPanel colors={C} subscription={data.subscription} financials={data.financials} isTestAccount={data.isTestAccount} />,
    referrals:<AdminUserReferralsPanel colors={C} referral={data.referral} />,
    verification:<AdminUserVerificationPanel colors={C} userId={userId} verification={data.verification} ageVerifiedAt={data.ageVerifiedAt} onChanged={load} />,
    privacy:<AdminUserPrivacyPanel colors={C} privacySettings={data.profile?.privacySettings} />,
    history:<AdminUserHistoryPanel colors={C} history={history} />,
  } : {}, [C, data, history, currentAdminRole, load, onBack, userId])

  if (loading) return <AdminAsyncState colors={C} state="loading" />
  if (error) return <AdminAsyncState colors={C} state="error" message={error} onRetry={load} />
  if (!data) return <AdminAsyncState colors={C} state="unavailable" />

  return (
    <div>
      <button type="button" onClick={onBack} aria-label={t('admin.users.detail.back')} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', marginBottom:12 }}>←</button>
      <AdminUserDetailNavigator colors={C} hasCoupleContext={Boolean(data.coupleContext)} panels={panels} />
    </div>
  )
}

export default function AdminUsersModule({ colors, currentAdminRole }) {
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (selectedUserId) return <AdminSelectedUser colors={colors} userId={selectedUserId} currentAdminRole={currentAdminRole} onBack={() => { setSelectedUserId(null); setRefreshKey(value => value + 1) }} />

  return (
    <>
      {showCreate && <AdminCreateUserModal colors={colors} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setRefreshKey(value => value + 1) }} />}
      <AdminUsersQueue key={refreshKey} colors={colors} adminRole={currentAdminRole} onSelectUser={setSelectedUserId} onCreateUser={() => setShowCreate(true)} />
    </>
  )
}
