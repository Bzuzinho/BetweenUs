export const ADMIN_USER_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']
export const ADMIN_USER_STATUS_ACTIONS = {
  activate: 'ACTIVE',
  suspend: 'SUSPENDED',
  ban: 'BANNED',
}

export const canViewSensitiveTaxId = adminRole => ['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(adminRole)

export const availableAdminUserActions = status => ({
  canActivate: status === 'SUSPENDED',
  canEvaluateActivation: status === 'PENDING_VERIFICATION',
  canSuspend: status === 'ACTIVE',
  canBan: status !== 'BANNED',
  canResetPassword: status !== 'DELETED',
  canDelete: status !== 'DELETED',
})
