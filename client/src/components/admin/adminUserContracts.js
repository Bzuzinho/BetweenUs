export const ADMIN_ACCOUNT_FILTERS = ['all', 'real', 'test']
export const ADMIN_USER_STATUS_FILTERS = ['active', 'DELETED', 'ALL']

export const buildAdminUsersQuery = ({ search = '', accountFilter = 'all', statusFilter = 'active' } = {}) => {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  if (accountFilter !== 'all') params.set('accountFilter', accountFilter)
  if (statusFilter !== 'active') params.set('status', statusFilter)
  const query = params.toString()
  return query ? `?${query}` : ''
}
