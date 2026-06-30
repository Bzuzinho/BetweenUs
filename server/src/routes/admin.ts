import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { recalculateRiskScore, recalculateAllRiskScores } from '../lib/riskScore'

const router = Router()
router.use(requireAuth)

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard', requireAdmin('metrics'), async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()
    const today = new Date(now.setHours(0,0,0,0))
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, newToday, newWeek, newMonth,
      totalProfiles, pendingProfiles, approvedProfiles,
      totalPhotos, pendingPhotos,
      totalMatches, activeMatches,
      totalMessages, pendingReports,
      premiumSubs, coupleSubs,
      suspendedUsers, bannedUsers,
      pendingVerifications,
      highRiskUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({ where: { createdAt: { gte: month } } }),
      prisma.profile.count(),
      prisma.profile.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.profile.count({ where: { status: 'APPROVED' } }),
      prisma.profilePhoto.count(),
      prisma.profilePhoto.count({ where: { moderationStatus: 'PENDING' } }),
      prisma.match.count(),
      prisma.match.count({ where: { status: 'ACTIVE' } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { plan: 'PREMIUM', status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { plan: 'COUPLE_PREMIUM', status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.verification.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { riskScore: { gte: 50 } } })
    ])

    res.json({
      users: { total: totalUsers, newToday, newWeek, newMonth, suspended: suspendedUsers, banned: bannedUsers, highRisk: highRiskUsers },
      profiles: { total: totalProfiles, pending: pendingProfiles, approved: approvedProfiles },
      photos: { total: totalPhotos, pending: pendingPhotos },
      matches: { total: totalMatches, active: activeMatches },
      messages: { total: totalMessages },
      reports: { pending: pendingReports },
      subscriptions: { premium: premiumSubs, couple: coupleSubs, total: premiumSubs + coupleSubs },
      verifications: { pending: pendingVerifications }
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, status, search, role, sortByRisk } = req.query
  const where: any = {}
  if (status) where.status = status
  if (role) where.adminRole = role
  if (search) where.OR = [
    { email: { contains: search as string, mode: 'insensitive' } },
    { profile: { displayName: { contains: search as string, mode: 'insensitive' } } }
  ]

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, take: Number(limit), skip: Number(offset),
      orderBy: sortByRisk === 'true' ? { riskScore: 'desc' } : { createdAt: 'desc' },
      select: {
        id: true, email: true, status: true, adminRole: true,
        createdAt: true, lastSeenAt: true, riskScore: true,
        profile: { select: { id: true, displayName: true, type: true, city: true, status: true } },
        subscription: { select: { plan: true, status: true } },
        verification: { select: { status: true } },
        _count: { select: { reportsMade: true, reportsReceived: true } }
      }
    }),
    prisma.user.count({ where })
  ])

  res.json({ users, total })
})

router.get('/users/:id', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      profile: { include: { photos: true, intentions: { include: { intention: true } } } },
      subscription: true,
      verification: true,
      reportsReceived: { take: 5, orderBy: { createdAt: 'desc' } },
      reportsMade: { take: 5, orderBy: { createdAt: 'desc' } },
    }
  })
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

  await logAdminAction(req.userId!, 'VIEW_USER', 'user', req.params.id, {
    targetUserId: req.params.id, ipAddress: req.ip
  })

  res.json(user)
})

router.put('/users/:id/status', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { status, reason } = req.body
  const valid = ['ACTIVE', 'SUSPENDED', 'BANNED']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido.' })

  const prev = await prisma.user.findUnique({ where: { id: req.params.id }, select: { status: true } })
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status } })

  await logAdminAction(req.userId!, `${status}_USER`, 'user', req.params.id, {
    targetUserId: req.params.id, reason,
    previousData: { status: prev?.status }, newData: { status }, ipAddress: req.ip
  })

  res.json({ ok: true, user })
})

router.put('/users/:id/role', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode atribuir roles.' })
  }
  const { adminRole } = req.body
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { adminRole } })
  await logAdminAction(req.userId!, 'CHANGE_ROLE', 'user', req.params.id, {
    targetUserId: req.params.id, newData: { adminRole }, ipAddress: req.ip
  })
  res.json({ ok: true, user })
})

router.post('/users/:id/recalculate-risk', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const score = await recalculateRiskScore(req.params.id)
  await logAdminAction(req.userId!, 'RECALCULATE_RISK', 'user', req.params.id, {
    targetUserId: req.params.id, newData: { riskScore: score }, ipAddress: req.ip
  })
  res.json({ ok: true, riskScore: score })
})

router.post('/risk-scores/recalculate-all', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas SUPER_ADMIN.' })
  }
  const result = await recalculateAllRiskScores()
  await logAdminAction(req.userId!, 'RECALCULATE_ALL_RISK', 'system', 'all', {
    newData: result, ipAddress: req.ip
  })
  res.json({ ok: true, ...result })
})

// ─── Profiles ─────────────────────────────────────────────────────────────────
router.get('/profiles', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, status } = req.query
  const where: any = {}
  if (status) where.status = status

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where, take: Number(limit), skip: Number(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, status: true, riskScore: true } },
        photos: { take: 1, where: { isPrimary: true } },
        _count: { select: { matchesAsOne: true, matchesAsTwo: true } }
      }
    }),
    prisma.profile.count({ where })
  ])
  res.json({ profiles, total })
})

router.put('/profiles/:id/status', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const { status, reason } = req.body
  const valid = ['APPROVED', 'REJECTED', 'HIDDEN', 'SUSPENDED', 'PENDING_REVIEW']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido.' })

  const profile = await prisma.profile.update({
    where: { id: req.params.id },
    data: { status, rejectionReason: reason, moderationNotes: reason }
  })

  await logAdminAction(req.userId!, `${status}_PROFILE`, 'profile', req.params.id, {
    reason, ipAddress: req.ip
  })

  res.json({ ok: true, profile })
})

// ─── Photos ───────────────────────────────────────────────────────────────────
router.get('/photos', requireAdmin('photos'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, status = 'PENDING' } = req.query
  const photos = await prisma.profilePhoto.findMany({
    where: { moderationStatus: status as any },
    take: Number(limit), skip: Number(offset),
    orderBy: { createdAt: 'asc' },
    include: { profile: { select: { displayName: true, userId: true, user: { select: { email: true } } } } }
  })
  const total = await prisma.profilePhoto.count({ where: { moderationStatus: status as any } })
  res.json({ photos, total })
})

router.put('/photos/:id', requireAdmin('photos'), async (req: AuthRequest, res: Response) => {
  const { moderationStatus, moderationNotes } = req.body
  const valid = ['APPROVED', 'REJECTED', 'REMOVED']
  if (!valid.includes(moderationStatus)) return res.status(400).json({ error: 'Status inválido.' })

  const photo = await prisma.profilePhoto.update({
    where: { id: req.params.id },
    data: { moderationStatus, moderationNotes }
  })

  if (moderationStatus === 'REJECTED') {
    const fullPhoto = await prisma.profilePhoto.findUnique({
      where: { id: req.params.id }, include: { profile: true }
    })
    if (fullPhoto) await recalculateRiskScore(fullPhoto.profile.userId)
  }

  await logAdminAction(req.userId!, `${moderationStatus}_PHOTO`, 'photo', req.params.id, {
    reason: moderationNotes, ipAddress: req.ip
  })

  res.json({ ok: true, photo })
})

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports', requireAdmin('reports'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, status = 'PENDING' } = req.query
  const reports = await prisma.report.findMany({
    where: { status: status as any },
    take: Number(limit), skip: Number(offset),
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      reporter: { select: { email: true } },
      reportedUser: { select: { email: true, status: true, riskScore: true, profile: { select: { displayName: true } } } }
    }
  })
  const total = await prisma.report.count({ where: { status: status as any } })
  res.json({ reports, total })
})

router.put('/reports/:id', requireAdmin('reports'), async (req: AuthRequest, res: Response) => {
  const { status, internalNotes } = req.body
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status, internalNotes, reviewedAt: new Date() }
  })

  if (status === 'RESOLVED' && report.reportedUserId) {
    await recalculateRiskScore(report.reportedUserId)
  }

  await logAdminAction(req.userId!, `${status}_REPORT`, 'report', req.params.id, {
    internalNote: internalNotes, ipAddress: req.ip
  })
  res.json({ ok: true, report })
})

// ─── Verifications ────────────────────────────────────────────────────────────
router.get('/verifications', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const verifications = await prisma.verification.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true, profile: { select: { displayName: true } } } } }
  })
  res.json({ verifications })
})

router.put('/verifications/:userId', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body
  await prisma.verification.update({
    where: { userId: req.params.userId },
    data: { status, reviewedAt: new Date() }
  })

  if (status === 'APPROVED') await recalculateRiskScore(req.params.userId)

  await logAdminAction(req.userId!, `${status}_VERIFICATION`, 'user', req.params.userId, {
    targetUserId: req.params.userId, ipAddress: req.ip
  })
  res.json({ ok: true })
})

// ─── Audit log ────────────────────────────────────────────────────────────────
router.get('/audit', requireAdmin('audit'), async (req: AuthRequest, res: Response) => {
  const { limit = 50, offset = 0, adminId, action, targetType } = req.query
  const where: any = {}
  if (adminId) where.adminId = adminId
  if (action) where.action = { contains: action as string }
  if (targetType) where.targetType = targetType

  const logs = await prisma.adminAction.findMany({
    where, take: Number(limit), skip: Number(offset),
    orderBy: { createdAt: 'desc' },
    include: { admin: { select: { email: true, adminRole: true } } }
  })
  const total = await prisma.adminAction.count({ where })
  res.json({ logs, total })
})

// ─── Beta invites ─────────────────────────────────────────────────────────────
router.get('/beta/invites', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  const invites = await prisma.betaInvite.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { email: true } }, usedBy: { select: { email: true } } }
  })
  res.json({ invites })
})

router.post('/beta/invites', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  const { email, maxUses = 1, expiresAt } = req.body
  const code = Math.random().toString(36).substring(2, 10).toUpperCase()
  const invite = await prisma.betaInvite.create({
    data: { code, createdById: req.userId!, email, maxUses, expiresAt: expiresAt ? new Date(expiresAt) : null }
  })
  await logAdminAction(req.userId!, 'CREATE_BETA_INVITE', 'beta_invite', invite.id, { ipAddress: req.ip })
  res.json({ invite, inviteUrl: `${process.env.CLIENT_URL}/join/${code}` })
})

router.put('/beta/invites/:id/toggle', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  const invite = await prisma.betaInvite.findUnique({ where: { id: req.params.id } })
  if (!invite) return res.status(404).json({ error: 'Convite não encontrado.' })
  const updated = await prisma.betaInvite.update({ where: { id: req.params.id }, data: { active: !invite.active } })
  await logAdminAction(req.userId!, 'TOGGLE_BETA_INVITE', 'beta_invite', req.params.id, {
    newData: { active: updated.active }, ipAddress: req.ip
  })
  res.json({ ok: true, invite: updated })
})

// Point 3: DELETE endpoint was missing — frontend needs it
router.delete('/beta/invites/:id', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  const invite = await prisma.betaInvite.findUnique({ where: { id: req.params.id } })
  if (!invite) return res.status(404).json({ error: 'Convite não encontrado.' })
  if (invite.usedById) {
    return res.status(400).json({ error: 'Não é possível apagar um convite já utilizado. Desativa-o em vez disso.' })
  }
  await prisma.betaInvite.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_BETA_INVITE', 'beta_invite', req.params.id, {
    previousData: { code: invite.code }, ipAddress: req.ip
  })
  res.json({ ok: true })
})

// ─── Point 10: Conversations moderation ───────────────────────────────────────
router.get('/conversations', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, reported, profileId, matchStatus } = req.query
  const where: any = {}

  if (matchStatus) where.match = { status: matchStatus }

  if (reported === 'true') {
    // Conversations linked to matches whose participants have pending/resolved reports
    const reportedUserIds = await prisma.report.findMany({
      where: { reportedUserId: { not: null } },
      select: { reportedUserId: true }
    })
    const ids = reportedUserIds.map(r => r.reportedUserId).filter(Boolean) as string[]
    const reportedProfiles = await prisma.profile.findMany({
      where: { userId: { in: ids } }, select: { id: true }
    })
    const profileIds = reportedProfiles.map(p => p.id)
    where.match = { ...where.match, OR: [
      { profileOneId: { in: profileIds } },
      { profileTwoId: { in: profileIds } }
    ]}
  }

  if (profileId) {
    where.match = { ...where.match, OR: [
      { profileOneId: profileId as string },
      { profileTwoId: profileId as string }
    ]}
  }

  const conversations = await prisma.conversation.findMany({
    where, take: Number(limit), skip: Number(offset),
    orderBy: { updatedAt: 'desc' },
    include: {
      match: {
        include: {
          profileOne: { select: { displayName: true, userId: true } },
          profileTwo: { select: { displayName: true, userId: true } }
        }
      },
      _count: { select: { messages: true } }
    }
  })

  const total = await prisma.conversation.count({ where })
  res.json({ conversations, total })
})

// Requires a reason — auditable access to conversation content
router.get('/conversations/:id', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.query
  if (!reason) {
    return res.status(400).json({ error: 'Motivo obrigatório para aceder a uma conversa.', code: 'REASON_REQUIRED' })
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      match: {
        include: {
          profileOne: { select: { displayName: true, userId: true } },
          profileTwo: { select: { displayName: true, userId: true } }
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { email: true, profile: { select: { displayName: true } } } } }
      }
    }
  })

  if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada.' })

  // Mandatory audit log for sensitive access
  await logAdminAction(req.userId!, 'VIEW_CONVERSATION', 'conversation', req.params.id, {
    reason: reason as string, ipAddress: req.ip, userAgent: req.headers['user-agent']
  })

  res.json(conversation)
})

router.put('/conversations/:id/block', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } })
  if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada.' })

  await prisma.match.update({ where: { id: conversation.matchId }, data: { status: 'BLOCKED' } })

  await logAdminAction(req.userId!, 'BLOCK_CONVERSATION', 'conversation', req.params.id, {
    reason, ipAddress: req.ip
  })
  res.json({ ok: true })
})

router.put('/messages/:id/remove', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const message = await prisma.message.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), removedByAdmin: true }
  })

  await logAdminAction(req.userId!, 'REMOVE_MESSAGE', 'message', req.params.id, {
    reason, targetUserId: message.senderUserId, ipAddress: req.ip
  })
  res.json({ ok: true })
})

export default router
