import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { recalculateRiskScore, recalculateAllRiskScores } from '../lib/riskScore'

const CLIENT_URL = process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app'

const router = Router()
router.use(requireAuth)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', requireAdmin('metrics'), async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const week  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
    const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, newToday, newWeek, newMonth,
      totalProfiles, pendingProfiles, approvedProfiles,
      totalPhotos, pendingPhotos,
      totalMatches, activeMatches,
      totalMessages, pendingReports,
      premiumSubs, coupleSubs,
      suspendedUsers, bannedUsers,
      pendingVerifications, highRiskUsers
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

// ─── Users list ───────────────────────────────────────────────────────────────
router.get('/users', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, status, search, sortByRisk } = req.query
  const where: any = {}
  if (status) where.status = status
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

// ─── User detail (customer support view) ─────────────────────────────────────
router.get('/users/:id', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      profile: {
        include: {
          photos: { orderBy: [{ isPrimary: 'desc' }] },
          intentions: { include: { intention: true } },
          boundaries: { include: { boundary: true } },
          privacySettings: true,
          coupleProfile: true,
        }
      },
      subscription: true,
      verification: true,
      consents: { orderBy: { acceptedAt: 'desc' } },
      reportsReceived: { take: 10, orderBy: { createdAt: 'desc' } },
      reportsMade: { take: 10, orderBy: { createdAt: 'desc' } },
    }
  })
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

  // Sprint 4: affiliate visibility — admin-only, per business requirement
  const referredAs = await (prisma as any).referralConversion.findUnique({
    where: { referredUserId: req.params.id },
    include: { referralCode: { include: { user: { select: { id: true, email: true } } } } }
  })
  const myReferralCode = await (prisma as any).referralCode.findUnique({ where: { userId: req.params.id } })
  const referredUsers = myReferralCode ? await (prisma as any).referralConversion.findMany({
    where: { referralCodeId: myReferralCode.id },
    include: { referredUser: { select: { id: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' }
  }) : []

  await logAdminAction(req.userId!, 'VIEW_USER', 'user', req.params.id, {
    targetUserId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent']
  })

  // Strip sensitive fields before sending
  const { passwordHash, ...safeUser } = user as any
  res.json({
    ...safeUser,
    referral: {
      invitedBy: referredAs?.referralCode?.user || null,
      invitedByAt: referredAs?.createdAt || null,
      invitedBySubscribed: !!referredAs?.subscribedAt,
      invited: referredUsers.map((r: any) => ({
        user: r.referredUser, subscribedAt: r.subscribedAt, creditGranted: r.creditGranted
      }))
    }
  })
})

// ─── Edit user (customer support) — with full audit trail ────────────────────
router.put('/users/:id', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, status, adminRole, reason, internalNote } = req.body
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

    const prev = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { email: true, status: true, adminRole: true }
    })
    if (!prev) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    // Only SUPER_ADMIN can change adminRole
    if (adminRole !== undefined && (req as any).adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode alterar roles.' })
    }

    const updateData: any = {}
    if (email !== undefined)     updateData.email = email
    if (status !== undefined)    updateData.status = status
    if (adminRole !== undefined) updateData.adminRole = adminRole

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, status: true, adminRole: true }
    })

    await logAdminAction(req.userId!, 'EDIT_USER', 'user', req.params.id, {
      targetUserId: req.params.id,
      reason,
      internalNote,
      previousData: prev,
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ ok: true, user: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Edit profile (customer support) — with full audit trail ─────────────────
router.put('/profiles/:id', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, bio, city, country, status, rejectionReason, moderationNotes, reason, internalNote } = req.body
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

    const prev = await prisma.profile.findUnique({
      where: { id: req.params.id },
      select: { displayName: true, bio: true, city: true, country: true, status: true, rejectionReason: true }
    })
    if (!prev) return res.status(404).json({ error: 'Perfil não encontrado.' })

    const updateData: any = {}
    if (displayName !== undefined)    updateData.displayName = displayName
    if (bio !== undefined)            updateData.bio = bio
    if (city !== undefined)           updateData.city = city
    if (country !== undefined)        updateData.country = country
    if (status !== undefined)         updateData.status = status
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason
    if (moderationNotes !== undefined) updateData.moderationNotes = moderationNotes

    const updated = await prisma.profile.update({
      where: { id: req.params.id },
      data: updateData
    })

    if (updateData.status === 'APPROVED') {
      await prisma.user.updateMany({
        where: { id: updated.userId, status: 'PENDING_VERIFICATION' },
        data: { status: 'ACTIVE' }
      })
    }

    await logAdminAction(req.userId!, 'EDIT_PROFILE', 'profile', req.params.id, {
      targetUserId: updated.userId,
      reason,
      internalNote,
      previousData: prev,
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ ok: true, profile: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Delete user (GDPR / customer request) — with full audit trail ───────────
router.delete('/users/:id', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason, internalNote } = req.body
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório para apagar utilizador.' })

    // Only SUPER_ADMIN can hard-delete
    if ((req as any).adminRole !== 'SUPER_ADMIN' && (req as any).adminRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { email: true, status: true, adminRole: true }
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    // Soft-delete: anonymise PII, mark as DELETED
    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status: 'DELETED',
        email: `deleted-${req.params.id}@deleted.betweenus`,
        passwordHash: 'DELETED',
        dateOfBirth: new Date('1900-01-01'),
        emailVerifiedAt: null,
        lastSeenAt: null,
      }
    })

    await logAdminAction(req.userId!, 'DELETE_USER', 'user', req.params.id, {
      targetUserId: req.params.id,
      reason,
      internalNote,
      previousData: { email: user.email, status: user.status },
      newData: { status: 'DELETED', anonymised: true },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ ok: true, message: 'Utilizador anonimizado. Dados eliminados em 30 dias.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── History: all admin actions for a specific user ───────────────────────────
router.get('/users/:id/history', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const history = await prisma.adminAction.findMany({
    where: { targetUserId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { admin: { select: { email: true, adminRole: true } } }
  })

  await logAdminAction(req.userId!, 'VIEW_USER_HISTORY', 'user', req.params.id, {
    targetUserId: req.params.id, ipAddress: req.ip
  })

  res.json({ history })
})

// ─── User status ──────────────────────────────────────────────────────────────
router.put('/users/:id/status', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { status, reason } = req.body
  if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
  if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

  const prev = await prisma.user.findUnique({ where: { id: req.params.id }, select: { status: true } })
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status } })

  await logAdminAction(req.userId!, `${status}_USER`, 'user', req.params.id, {
    targetUserId: req.params.id, reason,
    previousData: { status: prev?.status }, newData: { status }, ipAddress: req.ip
  })
  res.json({ ok: true, user })
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

  // Sprint 4: approving a profile shouldn't require a second manual step in
  // Users to reactivate the account — do it here if it's still pending.
  if (status === 'APPROVED') {
    await prisma.user.updateMany({
      where: { id: profile.userId, status: 'PENDING_VERIFICATION' },
      data: { status: 'ACTIVE' }
    })
  }

  await logAdminAction(req.userId!, `${status}_PROFILE`, 'profile', req.params.id, { reason, ipAddress: req.ip })
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
  const photo = await prisma.profilePhoto.update({
    where: { id: req.params.id },
    data: { moderationStatus, moderationNotes }
  })
  if (moderationStatus === 'REJECTED') {
    const full = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, include: { profile: true } })
    if (full) await recalculateRiskScore(full.profile.userId)
  }
  await logAdminAction(req.userId!, `${moderationStatus}_PHOTO`, 'photo', req.params.id, { reason: moderationNotes, ipAddress: req.ip })
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
  if (status === 'RESOLVED' && report.reportedUserId) await recalculateRiskScore(report.reportedUserId)
  await logAdminAction(req.userId!, `${status}_REPORT`, 'report', req.params.id, { internalNote: internalNotes, ipAddress: req.ip })
  res.json({ ok: true, report })
})

// ─── Verifications ────────────────────────────────────────────────────────────
router.get('/verifications', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const verifications = await prisma.verification.findMany({
    where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true, profile: { select: { displayName: true } } } } }
  })
  res.json({ verifications })
})

router.put('/verifications/:userId', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body
  await prisma.verification.update({ where: { userId: req.params.userId }, data: { status, reviewedAt: new Date() } })
  if (status === 'APPROVED') await recalculateRiskScore(req.params.userId)
  await logAdminAction(req.userId!, `${status}_VERIFICATION`, 'user', req.params.userId, { targetUserId: req.params.userId, ipAddress: req.ip })
  res.json({ ok: true })
})

// ─── Conversations ────────────────────────────────────────────────────────────
router.get('/conversations', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const conversations = await prisma.conversation.findMany({
    take: 30, orderBy: { updatedAt: 'desc' },
    include: {
      match: { include: {
        profileOne: { select: { displayName: true, userId: true } },
        profileTwo: { select: { displayName: true, userId: true } }
      }},
      _count: { select: { messages: true } }
    }
  })
  res.json({ conversations })
})

router.get('/conversations/:id', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.query
  if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.', code: 'REASON_REQUIRED' })
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      match: { include: {
        profileOne: { select: { displayName: true, userId: true } },
        profileTwo: { select: { displayName: true, userId: true } }
      }},
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { email: true, profile: { select: { displayName: true } } } } } }
    }
  })
  if (!conversation) return res.status(404).json({ error: 'Não encontrado.' })
  await logAdminAction(req.userId!, 'VIEW_CONVERSATION', 'conversation', req.params.id, { reason: reason as string, ipAddress: req.ip, userAgent: req.headers['user-agent'] })
  res.json(conversation)
})

router.put('/messages/:id/remove', requireAdmin('conversations'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const message = await prisma.message.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), removedByAdmin: true } })
  await logAdminAction(req.userId!, 'REMOVE_MESSAGE', 'message', req.params.id, { reason, targetUserId: message.senderUserId, ipAddress: req.ip })
  res.json({ ok: true })
})

// ─── Audit log ────────────────────────────────────────────────────────────────
router.get('/audit', requireAdmin('audit'), async (req: AuthRequest, res: Response) => {
  const { limit = 50, offset = 0, targetUserId, action } = req.query
  const where: any = {}
  if (targetUserId) where.targetUserId = targetUserId
  if (action) where.action = { contains: action as string }

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
  res.json({ invite, inviteUrl: `${CLIENT_URL}/join/${code}` })
})

router.put('/beta/invites/:id/toggle', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  const invite = await prisma.betaInvite.findUnique({ where: { id: req.params.id } })
  if (!invite) return res.status(404).json({ error: 'Não encontrado.' })
  const updated = await prisma.betaInvite.update({ where: { id: req.params.id }, data: { active: !invite.active } })
  res.json({ ok: true, invite: updated })
})

router.delete('/beta/invites/:id', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  const invite = await prisma.betaInvite.findUnique({ where: { id: req.params.id } })
  if (!invite) return res.status(404).json({ error: 'Não encontrado.' })
  if (invite.usedById) return res.status(400).json({ error: 'Convite já utilizado. Desativa-o em vez de apagar.' })
  await prisma.betaInvite.delete({ where: { id: req.params.id } })
  await logAdminAction(req.userId!, 'DELETE_BETA_INVITE', 'beta_invite', req.params.id, { ipAddress: req.ip })
  res.json({ ok: true })
})

// ─── Risk scores ──────────────────────────────────────────────────────────────
router.post('/users/:id/recalculate-risk', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const score = await recalculateRiskScore(req.params.id)
  await logAdminAction(req.userId!, 'RECALCULATE_RISK', 'user', req.params.id, { newData: { riskScore: score }, ipAddress: req.ip })
  res.json({ ok: true, riskScore: score })
})

router.post('/risk-scores/recalculate-all', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN.' })
  const result = await recalculateAllRiskScores()
  res.json({ ok: true, ...result })
})


// ─── Create user directly (admin) ────────────────────────────────────────────
router.post('/users', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, adminRole, reason } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e password obrigatórios.' })
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

    // Only SUPER_ADMIN can create admin users
    if (adminRole && (req as any).adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode criar utilizadores com role de admin.' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email já registado.' })

    const bcrypt = require('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        dateOfBirth: new Date('1990-01-01'), // placeholder — user updates on first login
        emailVerifiedAt: new Date(), // admin-created accounts are pre-verified
        status: 'ACTIVE',
        adminRole: adminRole || null,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        subscription: { create: { plan: 'FREE', status: 'ACTIVE' } }
      },
      select: { id: true, email: true, status: true, adminRole: true, createdAt: true }
    })

    await logAdminAction(req.userId!, 'CREATE_USER', 'user', user.id, {
      targetUserId: user.id,
      reason,
      newData: { email, adminRole: adminRole || null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.status(201).json({ ok: true, user })
  } catch (err: any) {
    console.error('[CREATE USER]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Assign / remove admin role ───────────────────────────────────────────────
router.put('/users/:id/role', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  try {
    const { adminRole, reason } = req.body
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

    // Only SUPER_ADMIN can assign roles
    if ((req as any).adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode atribuir roles de administrador.' })
    }

    const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT_REVIEWER', null]
    if (!VALID_ROLES.includes(adminRole)) {
      return res.status(400).json({ error: `Role inválido. Válidos: ${VALID_ROLES.filter(Boolean).join(', ')}` })
    }

    const prev = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { email: true, adminRole: true }
    })
    if (!prev) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    // Prevent removing own SUPER_ADMIN role
    if (prev.adminRole === 'SUPER_ADMIN' && req.userId === req.params.id && adminRole !== 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'Não podes remover o teu próprio role de SUPER_ADMIN.' })
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { adminRole: adminRole || null },
      select: { id: true, email: true, adminRole: true }
    })

    await logAdminAction(req.userId!, adminRole ? 'ASSIGN_ADMIN_ROLE' : 'REMOVE_ADMIN_ROLE', 'user', req.params.id, {
      targetUserId: req.params.id,
      reason,
      previousData: { adminRole: prev.adminRole },
      newData: { adminRole: adminRole || null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ ok: true, user: updated })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})


// ─── POST /api/admin/users/:id/reset-password ─────────────────────────────────
// Sends password reset email to user
router.post('/users/:id/reset-password', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    const { randomBytes } = await import('crypto')
    const { createHash } = await import('crypto')
    const resetToken = randomBytes(32).toString('hex')
    const hash = createHash('sha256').update(resetToken).digest('hex')

    let redis: any = null
    try { redis = (await import('../lib/redis')).default; if (!redis.isOpen) await redis.connect() } catch {}
    if (redis) {
      await redis.del(`pwd_reset:${user.id}`)
      await redis.setEx(`pwd_reset:${user.id}`, 3600, hash)
    }

    import('../lib/email').then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(user.email, user.id, resetToken)
        .then(() => console.log('[ADMIN] Password reset sent to', user.email))
        .catch(e => console.error('[ADMIN RESET]', e.message))
    })

    await logAdminAction(req.userId!, 'RESET_PASSWORD_EMAIL', 'user', req.params.id, {
      targetUserId: req.params.id,
      reason: req.body.reason || 'Admin reset',
      ipAddress: req.ip,
    })

    res.json({ ok: true, message: 'Email de reset enviado para ' + user.email })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── POST /api/admin/users/:id/set-password ───────────────────────────────────
// Directly set a new password (SUPER_ADMIN only — emergency use)
router.post('/users/:id/set-password', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  try {
    if ((req as any).adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode definir password directamente.' })
    }
    const { password, reason } = req.body
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password inválida (mín. 8 caracteres).' })
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

    const bcrypt = require('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } })

    // Revoke all sessions
    let redis: any = null
    try { redis = (await import('../lib/redis')).default; if (!redis.isOpen) await redis.connect() } catch {}
    if (redis) await redis.del(`refresh:${req.params.id}`)

    await logAdminAction(req.userId!, 'SET_PASSWORD_DIRECT', 'user', req.params.id, {
      targetUserId: req.params.id,
      reason,
      ipAddress: req.ip,
    })

    res.json({ ok: true, message: 'Password definida. Sessões revogadas.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})


// ─── POST /api/admin/test-email — send test email (SUPER_ADMIN only) ──────────
router.post('/test-email', requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    if ((req as any).adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode testar o email.' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    const to = req.body.to || user.email

    const { sendVerificationEmail } = await import('../lib/email')
    const { randomBytes } = await import('crypto')
    const testToken = randomBytes(16).toString('hex')

    try {
      await sendVerificationEmail(to, 'test-user-id', testToken)
      res.json({ ok: true, message: `Email enviado para ${to}` })
    } catch (err: any) {
      res.status(500).json({
        error: 'Falha ao enviar email',
        detail: err.message,
        code: err.code,
        hint: 'Verifica Configurações → Email para diagnóstico completo'
      })
    }
  } catch (err: any) {
    console.error('[TEST EMAIL]', err.message)
    res.status(500).json({
      error: 'Falha ao enviar email de teste',
      detail: err.message,
      hint: 'Verifica /health/email para diagnóstico da configuração SMTP'
    })
  }
})


// ─── GET /api/admin/email-config — SMTP diagnostic ────────────────────────────
router.get('/email-config', requireAdmin(), async (req: AuthRequest, res: Response) => {
  const { getEmailConfig } = await import('../lib/email')
  const config = getEmailConfig()
  const missing = Object.entries(config)
    .filter(([k, v]) => !v && !['port', 'configured'].includes(k))
    .map(([k]) => k)

  if (!config.configured) {
    return res.json({
      status: 'misconfigured', missing, config,
      fix: 'No Railway → serviço backend → Variables, define: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=emailtemp02@gmail.com, SMTP_PASS=<Gmail App Password de 16 caracteres>, EMAIL_FROM=Between Us <emailtemp02@gmail.com>. A App Password gera-se em myaccount.google.com/apppasswords (precisa de 2FA ativa nessa conta Gmail).'
    })
  }

  // Test actual send connection — Gmail SMTP on 587 uses STARTTLS, not implicit SSL
  try {
    const nodemailer = require('nodemailer')
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      family: 4,
      connectionTimeout: 15000,
    } as any)
    await t.verify()
    res.json({ status: 'ok', message: '✅ SMTP ligado e pronto', config })
  } catch (err: any) {
    res.json({
      status: 'error',
      message: err.message,
      code: err.code,
      config,
      hints: [
        'SMTP_HOST deve ser smtp.gmail.com',
        'SMTP_USER deve ser o email completo (emailtemp02@gmail.com)',
        'SMTP_PASS deve ser uma Gmail App Password de 16 caracteres, não a password normal da conta',
        'A conta Gmail precisa de verificação em 2 passos ativa para gerar App Passwords',
        'Gera a App Password em myaccount.google.com/apppasswords',
        'SMTP_PORT deve ser 587 (STARTTLS), não 465',
        err.code === 'EAUTH' ? '⚠️ Erro de autenticação — a App Password está errada, expirou, ou foi revogada' : null,
        (err.code === 'ETIMEDOUT' || /timeout/i.test(err.message)) ? '⚠️ Timeout de ligação — se persistir depois de forçar IPv4, o Railway pode estar a bloquear a porta 587 de saída; tenta mudar SMTP_PORT para 465 no Railway, ou considera um provedor por API HTTP (Resend, SendGrid) que não depende de portas SMTP' : null,
      ].filter(Boolean)
    })
  }
})

// ─── Referral / affiliate rule (Sprint 4) — editable, never hardcoded ─────────
router.get('/referral-rule', requireAdmin(), async (_req: AuthRequest, res: Response) => {
  const rule = await (prisma as any).referralRule.findFirst() || await (prisma as any).referralRule.create({ data: {} })
  res.json({ rule })
})

router.put('/referral-rule', requireAdmin('configuracoes'), async (req: AuthRequest, res: Response) => {
  const { referralsRequired, rewardMonths } = req.body
  if (!Number.isInteger(referralsRequired) || referralsRequired < 1) {
    return res.status(400).json({ error: 'Número de convites obrigatório deve ser um inteiro ≥ 1.' })
  }
  if (!Number.isInteger(rewardMonths) || rewardMonths < 1) {
    return res.status(400).json({ error: 'Meses de recompensa deve ser um inteiro ≥ 1.' })
  }
  const existing = await (prisma as any).referralRule.findFirst()
  const rule = existing
    ? await (prisma as any).referralRule.update({ where: { id: existing.id }, data: { referralsRequired, rewardMonths, updatedByUserId: req.userId } })
    : await (prisma as any).referralRule.create({ data: { referralsRequired, rewardMonths, updatedByUserId: req.userId } })
  await logAdminAction(req.userId!, 'UPDATE_REFERRAL_RULE', 'referral_rule', rule.id, { newData: { referralsRequired, rewardMonths }, ipAddress: req.ip })
  res.json({ ok: true, rule })
})

export default router
// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', requireAdmin(), async (req: AuthRequest, res: Response) => {
  const notifs = await (prisma as any).notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50
  }).catch(() => [])
  res.json({ notifications: notifs })
})

router.put('/notifications/:id/read', requireAdmin(), async (req: AuthRequest, res: Response) => {
  await (prisma as any).notification.updateMany({
    where: { id: req.params.id, userId: req.userId! },
    data: { readAt: new Date() }
  }).catch(() => {})
  res.json({ ok: true })
})

router.delete('/notifications/:id', requireAdmin(), async (req: AuthRequest, res: Response) => {
  await (prisma as any).notification.deleteMany({
    where: { id: req.params.id, userId: req.userId! }
  }).catch(() => {})
  res.json({ ok: true })
})

router.delete('/notifications', requireAdmin(), async (req: AuthRequest, res: Response) => {
  await (prisma as any).notification.deleteMany({ where: { userId: req.userId! } }).catch(() => {})
  res.json({ ok: true })
})

// ─── Service sessions ─────────────────────────────────────────────────────────
router.post('/service/start', requireAdmin(), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { adminRole: true } })
  const role = user?.adminRole || 'MODERATOR'

  // End any open session
  const open = await (prisma as any).serviceSession.findFirst({
    where: { userId: req.userId!, endedAt: null }
  }).catch(() => null)
  if (open) {
    const dur = Math.round((Date.now() - new Date(open.startedAt).getTime()) / 60000)
    await (prisma as any).serviceSession.update({
      where: { id: open.id },
      data: { endedAt: new Date(), durationMin: dur }
    }).catch(() => {})
  }

  const session = await (prisma as any).serviceSession.create({
    data: { userId: req.userId!, role }
  }).catch(() => null)

  // Notify all SUPER_ADMIN / ADMIN
  await notifyAdmins(`${role} entrou ao serviço`, `${user?.adminRole} iniciou sessão de moderação`, req.userId!)

  res.json({ ok: true, session })
})

router.post('/service/end', requireAdmin(), async (req: AuthRequest, res: Response) => {
  const { notes } = req.body
  const open = await (prisma as any).serviceSession.findFirst({
    where: { userId: req.userId!, endedAt: null }
  }).catch(() => null)

  if (!open) return res.status(404).json({ error: 'Sem sessão activa.' })

  const dur = Math.round((Date.now() - new Date(open.startedAt).getTime()) / 60000)
  const session = await (prisma as any).serviceSession.update({
    where: { id: open.id },
    data: { endedAt: new Date(), durationMin: dur, notes }
  }).catch(() => null)

  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { adminRole: true } })
  await notifyAdmins(`${user?.adminRole} saiu do serviço`, `Sessão de ${dur} minutos terminada`, req.userId!)

  res.json({ ok: true, session })
})

router.get('/service/status', requireAdmin(), async (req: AuthRequest, res: Response) => {
  const open = await (prisma as any).serviceSession.findFirst({
    where: { userId: req.userId!, endedAt: null }
  }).catch(() => null)
  res.json({ active: !!open, session: open })
})

router.get('/service/sessions', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { userId, limit = 30 } = req.query
  const where: any = {}
  if (userId) where.userId = userId
  const sessions = await (prisma as any).serviceSession.findMany({
    where, take: Number(limit),
    orderBy: { startedAt: 'desc' }
  }).catch(() => [])
  res.json({ sessions })
})

// Helper: create notification for all admins
async function notifyAdmins(title: string, body: string, excludeUserId?: string) {
  const admins = await prisma.user.findMany({
    where: { adminRole: { in: ['SUPER_ADMIN', 'ADMIN'] as any[] }, NOT: excludeUserId ? { id: excludeUserId } : undefined },
    select: { id: true }
  })
  const notifs = admins.map(a => ({
    userId: a.id, type: 'service_event', title, body,
    data: JSON.stringify({ tab: 'audit' })
  }))
  if (notifs.length) {
    await (prisma as any).notification.createMany({ data: notifs }).catch(() => {})
  }
}
