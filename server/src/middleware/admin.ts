import { Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from './auth'

export type AdminRole = 
  'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'FINANCE' | 'CONTENT_REVIEWER'

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['users', 'profiles', 'photos', 'reports', 'subscriptions', 'metrics', 'audit', 'beta'],
  MODERATOR: ['profiles', 'photos', 'reports', 'conversations'],
  SUPPORT: ['users', 'reports'],
  FINANCE: ['subscriptions', 'metrics.revenue'],
  CONTENT_REVIEWER: ['photos', 'profiles.bio']
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

      // Check admin role in DB or fallback to ADMIN_EMAILS env
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
      const isAdminByEmail = adminEmails.includes(user.email)
      const role = user.adminRole || (isAdminByEmail ? 'ADMIN' : null)

      if (!role) {
        return res.status(403).json({ error: 'Acesso negado.' })
      }

      // Check specific permission
      if (permission) {
        const perms = ROLE_PERMISSIONS[role as AdminRole] || []
        const hasPermission = perms.includes('*') || perms.some(p => 
          permission.startsWith(p) || p.startsWith(permission)
        )
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Sem permissão para: ${permission}`,
            role 
          })
        }
      }

      ;(req as any).adminRole = role
      next()
    } catch (err: any) {
      res.status(500).json({ error: 'Erro interno.' })
    }
  }
}

// Log admin action
export const logAdminAction = async (
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  options: {
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
        adminId,
        action,
        targetType,
        targetId,
        ...options,
        previousData: options.previousData ? options.previousData : undefined,
        newData: options.newData ? options.newData : undefined
      }
    })
  } catch (err: any) {
    console.error('[ADMIN LOG ERROR]', err.message)
  }
}
