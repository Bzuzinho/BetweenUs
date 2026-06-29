import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Middleware admin — só admins acedem
const requireAdmin = async (req: AuthRequest, res: Response, next: any) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user || !adminEmails.includes(user.email)) {
    return res.status(403).json({ error: 'Acesso negado.' })
  }
  next()
}

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [users, profiles, matches, reports, subs] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.match.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { plan: { not: 'FREE' } } })
    ])

    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }
    })

    res.json({ users, profiles, matches, pendingReports: reports,
      premiumSubs: subs, newUsersToday })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { limit = 20, offset = 0, status } = req.query
  const where: any = {}
  if (status) where.status = status

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, take: Number(limit), skip: Number(offset),
      orderBy: { createdAt: 'desc' },
      select: { id:true, email:true, status:true, createdAt:true,
        profile: { select: { displayName:true, type:true, city:true } },
        subscription: { select: { plan:true } }
      }
    }),
    prisma.user.count({ where })
  ])

  res.json({ users, total })
})

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', requireAuth, requireAdmin,
  async (req: Request, res: Response) => {
  const { status } = req.body
  const valid = ['ACTIVE','SUSPENDED','BANNED']
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' })
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status }
  })
  res.json({ ok: true, user })
})

// GET /api/admin/reports
router.get('/reports', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { status = 'PENDING', limit = 20, offset = 0 } = req.query
  const reports = await prisma.report.findMany({
    where: { status: status as any },
    take: Number(limit), skip: Number(offset),
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { email:true } },
      reportedUser: { select: { email:true,
        profile: { select: { displayName:true } } } }
    }
  })
  res.json({ reports })
})

// PUT /api/admin/reports/:id
router.put('/reports/:id', requireAuth, requireAdmin,
  async (req: Request, res: Response) => {
  const { status } = req.body
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status, reviewedAt: new Date() }
  })
  res.json({ ok: true, report })
})

export default router
