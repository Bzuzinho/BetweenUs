import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import AdminAsyncState from './AdminAsyncState'
import { ADMIN_ACCOUNT_FILTERS, ADMIN_USER_STATUS_FILTERS, buildAdminUsersQuery } from './adminUserContracts'

export default function AdminUsersQueue({ colors, adminRole, onSelectUser, onCreateUser }) {
  const C = colors
  const { t, locale } = useI18n()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const query = buildAdminUsersQuery({ search, accountFilter, statusFilter })
    api.get(`/admin/users${query}`)
      .then(response => setUsers(response.data.users || []))
      .catch(errorResponse => setError(errorResponse.response?.data?.error || t('admin.users.loadError')))
      .finally(() => setLoading(false))
  }, [search, accountFilter, statusFilter, t])

  useEffect(() => { load() }, [load])

  const formatDate = value => value ? new Intl.DateTimeFormat(locale).format(new Date(value)) : '—'

  return (
    <section aria-label={t('admin.tabs.users.label')}>
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={t('admin.users.search')}
          aria-label={t('admin.users.search')}
          style={{ flex:'1 1 220px', minHeight:46, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 14px', color:C.text, fontSize:15 }}
        />
        <select value={accountFilter} onChange={event => setAccountFilter(event.target.value)} aria-label={t('admin.users.accountFilterLabel')} style={{ minHeight:46, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'0 12px', color:C.text }}>
          {ADMIN_ACCOUNT_FILTERS.map(value => <option key={value} value={value}>{t(`admin.users.accountFilters.${value}`)}</option>)}
        </select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label={t('admin.users.statusFilterLabel')} style={{ minHeight:46, background:C.input, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'0 12px', color:C.text }}>
          {ADMIN_USER_STATUS_FILTERS.map(value => <option key={value} value={value}>{t(`admin.users.statusFilters.${value}`)}</option>)}
        </select>
        {adminRole === 'SUPER_ADMIN' && (
          <button type="button" onClick={onCreateUser} style={{ background:C.primary, border:'none', borderRadius:12, padding:'0 14px', color:'#0A141A', fontWeight:600, fontSize:13, minHeight:46, cursor:'pointer' }}>
            + {t('admin.users.create')}
          </button>
        )}
      </div>

      {loading && <AdminAsyncState colors={C} state="loading" compact />}
      {!loading && error && <AdminAsyncState colors={C} state="error" message={error} onRetry={load} compact />}
      {!loading && !error && users.length === 0 && <AdminAsyncState colors={C} state="unavailable" message={t('admin.users.empty')} compact />}

      {!loading && !error && users.map(user => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelectUser?.(user.id)}
          style={{ width:'100%', textAlign:'left', background:C.surface, border:`1px solid ${user.status === 'DELETED' ? 'rgba(248,113,113,0.25)' : C.border}`, borderRadius:14, padding:14, marginBottom:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', color:'inherit' }}
        >
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>
              {user.email}
              {user.adminRole && <span style={{ color:C.primary, fontSize:11, marginLeft:8, background:C.primaryDim, borderRadius:4, padding:'1px 6px' }}>{user.adminRole}</span>}
              {user.isTestAccount && <span style={{ color:'#C9956B', fontSize:11, marginLeft:8, background:'rgba(201,149,107,0.15)', borderRadius:4, padding:'1px 6px', fontWeight:600 }}>{t('admin.users.testBadge')}</span>}
              {user.status === 'DELETED' && <span style={{ color:C.danger, fontSize:11, marginLeft:8, background:C.dangerDim, borderRadius:4, padding:'1px 6px', fontWeight:600 }}>{t('admin.users.deletedBadge')}</span>}
            </div>
            <div style={{ fontSize:12, color:C.muted }}>
              {user.profile?.displayName || t('admin.users.noProfile')} · {user.status}
              {user.riskScore > 30 && <span style={{ color:C.danger }}> · {t('admin.users.risk').replace('{score}', user.riskScore)}</span>}
            </div>
            {user.status === 'DELETED' && user.deletedAt && (
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                {t('admin.users.deletedDates').replace('{deletedAt}', formatDate(user.deletedAt)).replace('{hardDeleteAt}', formatDate(user.hardDeleteScheduledAt))}
              </div>
            )}
          </div>
          <span aria-hidden="true" style={{ color:C.muted, fontSize:18 }}>›</span>
        </button>
      ))}
    </section>
  )
}
