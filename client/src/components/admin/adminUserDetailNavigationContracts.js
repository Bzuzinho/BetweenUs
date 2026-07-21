export const ADMIN_USER_DETAIL_TABS = ['info', 'profile', 'couple', 'subscription', 'referrals', 'verification', 'privacy', 'history']

export const visibleAdminUserDetailTabs = ({ hasCoupleContext = false } = {}) =>
  ADMIN_USER_DETAIL_TABS.filter(tab => tab !== 'couple' || hasCoupleContext)
