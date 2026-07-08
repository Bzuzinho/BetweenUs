import { Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from './auth'

export type AdminRole =
  'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'FINANCE' | 'CONTENT_REVIEWER'

// 9.2 — moderation.evidence.view is intentionally its own granular
// permission, NOT folded into the broader 'reports' permission SUPPORT
// already has. SUPPORT can see and triage the report queue (status,
// reason, priority) but should not be able to read message-body
// snapshots, media references, or profile snapshots attached as
// evidence — that stays with SUPER_ADMIN ('*'), ADMIN, and MODERATOR
// only. FINANCE and CONTENT_REVIEWER never touch reports at all.
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN:      ['*'],
  ADMIN:            ['users','profiles','photos','reports','subscriptions','metrics','audit','beta','conversations','guide','catalog','legal','moderation.evidence.view','events','circle.manage','recommendations'],
  MODERATOR:        ['profiles','photos','reports','conversations','moderation.evidence.view','events'],
  SUPPORT:          ['users','reports'],
  FINANCE:          ['subscriptions','metrics'],
  CONTENT_REVIEWER: ['photos','profiles','guide'],
}

// 9.2 — exported so routes that need a SECOND, more granular check inside
// an already-`requireAdmin('reports')`-gated handler (e.g. "can this
// admin see evidence, not just the report shell") don't have to
// re-implement the prefix-match rule themselves.
export const roleHasPermission = (role: AdminRole | null, permission: string): boolean => {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role] || []
  return perms.includes('*') || perms.some(p => permission.startsWith(p) || p.startsWith(permission))
}

export const requireAdmin = (permission?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, email: true, adminRole: true, status: true }
      })

      if (!user || user.status === 'BANNED' || user.status === 'DELETED') {
        return res.status(401).json({ error: 'Não autenticado.' })
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
      const role = user.adminRole || (adminEmails.includes(user.email) ? 'ADMIN' : null)

      if (!role) return res.status(403).json({ error: 'Acesso negado.' })

      if (permission) {
        const perms = ROLE_PERMISSIONS[role as AdminRole] || []
        const hasPermission = perms.includes('*') || perms.some(p =>
          permission.startsWith(p) || p.startsWith(permission)
        )
        if (!hasPermission) {
          return res.status(403).json({ error: `Sem permissão para: ${permission}`, role })
        }
      }

      ;(req as any).adminRole = role
      next()
    } catch (err: any) {
      res.status(500).json({ error: 'Erro interno.' })
    }
  }
}

export const logAdminAction = async (
  adminUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: {
    targetUserId?: string
    reason?: string
    internalNote?: string
    previousData?: any
    newData?: any
    ipAddress?: string
    userAgent?: string
  } = {}
) => {
  try {
    await prisma.adminAction.create({
      data: {
        adminId: adminUserId,
        action,
        targetType,
        targetId,
        targetUserId: meta.targetUserId,
        reason:       meta.reason,
        internalNote: meta.internalNote,
        // Json columns — store the object directly, don't double-encode as a string
        previousData: meta.previousData ?? undefined,
        newData:      meta.newData      ?? undefined,
        ipAddress:    meta.ipAddress,
        userAgent:    meta.userAgent,
      }
    })
  } catch (e: any) {
    console.error('[AUDIT LOG]', e.message)
  }
}
