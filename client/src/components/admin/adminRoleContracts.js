export const ADMIN_ROLES = [
  null,
  'CONTENT_REVIEWER',
  'SUPPORT',
  'MODERATOR',
  'FINANCE',
  'ADMIN',
  'SUPER_ADMIN',
]

export const canManageAdminRoles = role => role === 'SUPER_ADMIN'
