import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction, roleHasPermission, ADMIN_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../middleware/admin'
import { recalculateRiskScore, recalculateAllRiskScores } from '../lib/riskScore'
import { evaluateAndActivateUser, canTransitionStatus } from '../lib/userActivationService'
import { getActiveMembers } from '../lib/profileMembershipService'
import { forUser as getEligibility } from '../lib/eligibilityService'
import { mergePhotosForViewer, signMediaUrl } from '../lib/mediaAccessService'
import { getKeyVersionStats, getActiveKeyVersion } from '../lib/contactHashService'
import { runHardDeleteJob, findEligibleUsers } from '../lib/hardDeleteJob'
import { signMediaUrl as signAvatarUrl } from '../lib/mediaAccessService'
import { getReportEvidenceForModerator } from '../lib/reportEvidenceService'
import { getLatestAssessment, computeAgreementStats, runModerationAssessment } from '../lib/moderationAssessmentService'
import { notifyAdmins as notifyAdminsWithPush } from '../lib/notify'
import { notifyProfileModerationDecision, notifyUserModerationDecision } from '../lib/moderationNotifications'

const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')

const router = Router()
router.use(requireAuth)

// ─── Dashboard ────────────────────────────────────────────────────────────────
// 3.5 — rotation progress: how many BlockedContactHash rows are on each
// HMAC key version. Migration after a rotation is "done" once only the
// active version has rows left.
router.get('/contacts/key-version-stats', requireAdmin('metrics'), async (req: AuthRequest, res: Response) => {
  const stats = await getKeyVersionStats()
  res.json({ activeVersion: getActiveKeyVersion(), stats })
})

// 3.6 — hard delete job, reachable from the admin UI as an alternative to
// the CLI script (npm run hard-delete). SUPER_ADMIN only: this is
// irreversible and the reachable-from-a-browser-button version of it
// deserves a narrower blast radius than the rest of the 'users' bucket.
router.get('/gdpr/hard-delete/preview', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN.' })
  const eligible = await findEligibleUsers()
  const preview = await runHardDeleteJob(true)
  res.json({ eligibleCount: eligible.length, preview })
})

router.post('/gdpr/hard-delete/run', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN.' })
  if (req.body.confirm !== 'HARD_DELETE') {
    return res.status(400).json({ error: 'Confirmação obrigatória: envia { "confirm": "HARD_DELETE" } no corpo do pedido.' })
  }
  const results = await runHardDeleteJob(false)
  const deleted = results.filter(r => !r.skipped)
  await logAdminAction(req.userId!, 'HARD_DELETE_USERS', 'gdpr', `batch-${Date.now()}`, {
    newData: { deletedCount: deleted.length, skippedCount: results.length - deleted.length, userIds: deleted.map(r => r.userId) },
    ipAddress: req.ip
  })
  res.json({ ok: true, results })
})

// BETA.1 — real-metric dashboard excludes isTestAccount users by default
// (spec: "métricas reais devem poder excluí-las"). includeTestData=true is
// SUPER_ADMIN-only (same convention as recommendations.ts's wantsTestData)
// — ADMIN/others always see the production-honest numbers, with no way to
// silently blend seeded beta accounts into what looks like real traction.
// BETA.2.3 — was requireAdmin('metrics'), which only SUPER_ADMIN/ADMIN/
// FINANCE have. MODERATOR/SUPPORT/CONTENT_REVIEWER got a blanket 403 on
// this single endpoint and the frontend's silent .catch(() => {}) turned
// that into a permanent "A carregar..." spinner (DashboardTab never left
// `data === null`). Gate relaxed to "any authenticated admin role" — the
// response itself is now filtered per-section by filterDashboardForRole()
// below, so a MODERATOR still never receives revenue/subscription data,
// it just gets a 200 with only the sections it has permission for instead
// of a 403 with nothing.
router.get('/dashboard', requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const week  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
    const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const includeTestData = req.query.includeTestData === 'true' && (req as any).adminRole === 'SUPER_ADMIN'
    const userFilter = includeTestData ? {} : { isTestAccount: false }
    const viaUser = includeTestData ? {} : { user: { isTestAccount: false } }

    const [
      totalUsers, newToday, newWeek, newMonth,
      totalProfiles, pendingProfiles, approvedProfiles,
      totalPhotos, pendingPhotos,
      totalMatches, activeMatches,
      totalMessages, pendingReports,
      premiumSubs, coupleSubs,
      suspendedUsers, bannedUsers,
      pendingVerifications, highRiskUsers,
      testAccountCount
    ] = await Promise.all([
      prisma.user.count({ where: userFilter }),
      prisma.user.count({ where: { createdAt: { gte: today }, ...userFilter } }),
      prisma.user.count({ where: { createdAt: { gte: week }, ...userFilter } }),
      prisma.user.count({ where: { createdAt: { gte: month }, ...userFilter } }),
      prisma.profile.count({ where: viaUser }),
      prisma.profile.count({ where: { status: 'PENDING_REVIEW', ...viaUser } }),
      prisma.profile.count({ where: { status: 'APPROVED', ...viaUser } }),
      prisma.profilePhoto.count({ where: { profile: viaUser } }),
      prisma.profilePhoto.count({ where: { moderationStatus: 'PENDING', profile: viaUser } }),
      prisma.match.count({ where: includeTestData ? {} : { profileOne: viaUser, profileTwo: viaUser } }),
      prisma.match.count({ where: { status: 'ACTIVE', ...(includeTestData ? {} : { profileOne: viaUser, profileTwo: viaUser }) } }),
      prisma.message.count({ where: { deletedAt: null, ...(includeTestData ? {} : { sender: userFilter }) } }),
      prisma.report.count({ where: { status: 'PENDING', ...(includeTestData ? {} : { reporter: userFilter }) } }),
      prisma.subscription.count({ where: { plan: 'PREMIUM', status: 'ACTIVE', ...viaUser } }),
      prisma.subscription.count({ where: { plan: 'COUPLE_PREMIUM', status: 'ACTIVE', ...viaUser } }),
      prisma.user.count({ where: { status: 'SUSPENDED', ...userFilter } }),
      prisma.user.count({ where: { status: 'BANNED', ...userFilter } }),
      prisma.verification.count({ where: { status: 'PENDING', ...viaUser } }),
      prisma.user.count({ where: { riskScore: { gte: 50 }, ...userFilter } }),
      prisma.user.count({ where: { isTestAccount: true } }),
    ])

    const { filterDashboardForRole } = await import('../lib/adminWorkQueueService')
    const full = {
      includeTestData,
      testAccountCount,
      users: { total: totalUsers, newToday, newWeek, newMonth, suspended: suspendedUsers, banned: bannedUsers, highRisk: highRiskUsers },
      profiles: { total: totalProfiles, pending: pendingProfiles, approved: approvedProfiles },
      photos: { total: totalPhotos, pending: pendingPhotos },
      matches: { total: totalMatches, active: activeMatches },
      messages: { total: totalMessages },
      reports: { pending: pendingReports },
      subscriptions: { premium: premiumSubs, couple: coupleSubs, total: premiumSubs + coupleSubs },
      verifications: { pending: pendingVerifications }
    }
    res.json({
      includeTestData,
      testAccountCount,
      ...await filterDashboardForRole(full, (req as any).adminRole || null)
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Users list ───────────────────────────────────────────────────────────────
// BETA.1.32 — accountFilter: 'all' | 'real' | 'test' (default 'all' — this
// list is an admin support/ops tool, not a real-metrics surface, so unlike
// /dashboard there's no default exclusion here; the filter is opt-in so an
// admin can deliberately narrow to one or the other).
router.get('/users', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { limit = 20, offset = 0, status, search, sortByRisk, accountFilter } = req.query
  const where: any = {}
  // BETA.2.4 — deleted (anonymised) accounts stay in the users table forever
  // (soft-delete/retention, see hardDeleteJob.ts) but must not clutter the
  // default admin listing as if they were normal users. Explicit opt-in via
  // ?status=DELETED shows only deleted accounts; ?status=ALL removes the
  // filter entirely (audit/export use case). Any other explicit ?status=X
  // behaves exactly as before (exact match). No status param = default =
  // everything except DELETED.
  if (status === 'ALL') {
    // no filter
  } else if (status) {
    where.status = status
  } else {
    where.status = { not: 'DELETED' }
  }
  if (accountFilter === 'test') where.isTestAccount = true
  if (accountFilter === 'real') where.isTestAccount = false
  if (search) where.OR = [
    { email: { contains: search as string, mode: 'insensitive' } },
    { profile: { displayName: { contains: search as string, mode: 'insensitive' } } }
  ]

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, take: Number(limit), skip: Number(offset),
      orderBy: sortByRisk === 'true' ? { riskScore: 'desc' } : { createdAt: 'desc' },
      select: {
        id: true, email: true, status: true, adminRole: true, avatarPath: true,
        createdAt: true, lastSeenAt: true, riskScore: true, updatedAt: true,
        isTestAccount: true, testScenarioKey: true,
        profile: { select: { id: true, displayName: true, type: true, city: true, status: true } },
        subscription: { select: { plan: true, status: true } },
        verification: { select: { status: true } },
        _count: { select: { reportsMade: true, reportsReceived: true } }
      }
    }),
    prisma.user.count({ where })
  ])
  // 3.1 follow-up: avatarPath is now a private storage key, not a public
  // URL — sign it for the list view. (Was also never selected here before,
  // so u.avatarPath in AdminPage.jsx's user list was always undefined —
  // same class of dead-field bug as the discovery photos/score ones.)
  interface AdminUserListRow {
    id: string
    email: string
    status: string
    adminRole: string | null
    avatarPath: string | null
    createdAt: Date
    lastSeenAt: Date | null
    riskScore: number | null
    updatedAt: Date
    isTestAccount: boolean
    testScenarioKey: string | null
    profile: { id: string; displayName: string; type: string; city: string | null; status: string } | null
    subscription: { plan: string; status: string } | null
    verification: { status: string } | null
    _count: { reportsMade: number; reportsReceived: number }
  }
  // BETA.2.4 — for a DELETED (anonymised) account, expose when the
  // anonymisation happened and when hardDeleteJob.ts is scheduled to
  // permanently remove the row, so admin can distinguish "recently
  // deleted, still in retention window" from stale data — reuses
  // hardDeleteJob.ts's own GRACE_DAYS/updatedAt-cutoff logic rather than
  // inventing a second definition of the retention window.
  const HARD_DELETE_GRACE_DAYS = Number(process.env.HARD_DELETE_GRACE_DAYS || 30)
  const usersWithAvatars = await Promise.all((users as AdminUserListRow[]).map(async (u: AdminUserListRow) => ({
    ...u,
    avatarPath: await signAvatarUrl(u.avatarPath),
    ...(u.status === 'DELETED' ? {
      deletedAt: u.updatedAt,
      hardDeleteScheduledAt: new Date(u.updatedAt.getTime() + HARD_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000)
    } : {})
  })))
  res.json({ users: usersWithAvatars, total })
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

  // 6.10 — admin visibility into couple/group membership, ApprovalPolicy,
  // and Agreement status. Deliberately the SAME aggregate-only summary
  // member-facing routes get (getAgreementSummary) — per-member agreement
  // answers are NOT included here by default; that's the separate, always-
  // explicitly-logged GET /api/agreements/admin/:profileId/raw route.
  //
  // BETA.2 (FASE C) — user.profile is now ALWAYS this user's own
  // Individual Profile (Shared Profiles no longer carry userId — see
  // schema.prisma's Profile.userId comment), so `user.profile.type !==
  // 'INDIVIDUAL'` can never be true anymore and this block would silently
  // stop firing for every user post-backfill. Shared Profile membership is
  // now resolved via ProfileMember instead, independent of whether this
  // user also owns an Individual Profile — which is exactly the
  // ownership-vs-membership distinction this admin view needs to show.
  let coupleContext: any = null
  const sharedMembership = await (prisma as any).profileMember.findFirst({
    where: { userId: req.params.id, status: 'ACCEPTED' },
    include: { profile: true }
  })
  const sharedProfile = sharedMembership?.profile && sharedMembership.profile.type !== 'INDIVIDUAL'
    ? sharedMembership.profile
    : null
  if (sharedProfile) {
    const { getActiveMembers } = await import('../lib/profileMembershipService')
    const { getAgreementSummary } = await import('../lib/profileAgreementService')
    const [activeMembers, memberRows, agreementSummary] = await Promise.all([
      getActiveMembers(sharedProfile.id),
      (prisma as any).profileMember.findMany({
        where: { profileId: sharedProfile.id },
        include: { user: { select: { id: true, email: true, status: true } } },
        orderBy: { createdAt: 'asc' }
      }),
      getAgreementSummary(sharedProfile.id).catch(() => null),
    ])
    coupleContext = {
      profileId: sharedProfile.id,
      type: sharedProfile.type,
      displayName: sharedProfile.displayName,
      individualDiscoveryPolicy: sharedProfile.individualDiscoveryPolicy,
      approvalPolicy: sharedProfile.approvalPolicy,
      activeMemberCount: activeMembers.length,
      members: memberRows.map((m: any) => ({
        id: m.id, userId: m.userId, email: m.user?.email || m.invitedEmail,
        isCreator: m.isCreator, status: m.status, joinedAt: m.respondedAt, invitedAt: m.createdAt,
      })),
      agreement: agreementSummary ? {
        status: agreementSummary.status, version: agreementSummary.version,
        conflictCount: agreementSummary.conflictCount, missingCount: agreementSummary.missingCount,
        lockedAt: agreementSummary.lockedAt,
      } : null,
    }
  }

  // Strip sensitive fields before sending
  const { passwordHash, ...safeUser } = user as any
  // 3.1: admin support view is a moderation context — always resolve CLEAN,
  // signed fresh, regardless of the photo's own visibility tier.
  if (safeUser.profile?.photos?.length) {
    safeUser.profile = {
      ...safeUser.profile,
      photos: await mergePhotosForViewer(safeUser.profile.photos, {
        ownerUserId: req.params.id,
        viewerUserId: null,
        viewerProfileId: null,
        isAdminModeration: true
      })
    }
  }
  safeUser.avatarPath = await signAvatarUrl(safeUser.avatarPath)

  // BETA.2.7 — financial summary, computed only when a Subscription row
  // exists (a FREE-plan user with no subscription row has no payment
  // history to summarise, and hasLocalPaymentHistory:false covers it).
  let financials: any = null
  if (safeUser.subscription) {
    const { getSubscriptionFinancialSummary } = await import('../lib/subscriptionFinancialService')
    financials = await getSubscriptionFinancialSummary(
      req.params.id,
      safeUser.subscription.currentPeriodStart,
      safeUser.subscription.currentPeriodEnd
    )
  }

  res.json({
    ...safeUser,
    coupleContext,
    financials,
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
    const { email, status, adminRole, accountName, nif, reason, internalNote } = req.body
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

    const role = (req as any).adminRole
    const prev = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { email: true, status: true, adminRole: true, accountName: true, nif: true }
    })
    if (!prev) return res.status(404).json({ error: 'Utilizador não encontrado.' })

    // Only SUPER_ADMIN can change adminRole
    if (adminRole !== undefined && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode alterar roles.' })
    }

    // Sprint 2.5.4: NIF is financially/legally sensitive — restrict editing to
    // roles that would plausibly need it. Full field-level PermissionService
    // (2.5.11) is a larger follow-up; this is a minimal, explicit gate.
    if (nif !== undefined && !['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(role)) {
      return res.status(403).json({ error: 'Sem permissão para editar o NIF.' })
    }

    // Sprint 2.5.5: this endpoint used to accept `status` with zero validation,
    // bypassing the transition matrix entirely. No current caller sends it
    // through here (the dedicated PUT /users/:id/status does), but close the
    // gap defensively.
    if (status !== undefined && !canTransitionStatus(prev.status, status)) {
      return res.status(400).json({ error: `Transição ${prev.status} → ${status} não permitida aqui — usa a acção de estado dedicada.` })
    }

    const updateData: any = {}
    if (email !== undefined)       updateData.email = email
    if (status !== undefined)      updateData.status = status
    if (adminRole !== undefined)   updateData.adminRole = adminRole
    if (accountName !== undefined) updateData.accountName = accountName
    if (nif !== undefined)         updateData.nif = nif

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, status: true, adminRole: true, accountName: true, nif: true, avatarPath: true, dateOfBirth: true }
    })
    ;(updated as any).avatarPath = await signAvatarUrl(updated.avatarPath)

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

    // BETA.4 typecheck fix — updated.userId is string | null (a
    // COUPLE/GROUP profile has no single owner; see schema.prisma's
    // Profile.userId comment). Guarded explicitly rather than cast: for a
    // shared profile there is no single account to reactivate here at
    // all — its members' own accounts go through their own individual
    // approval/activation, independent of the shared profile's own
    // status. Not silently dropped: flagged here in case a future
    // "reactivate every member on shared-profile approval" requirement
    // shows up, which would need its own explicit product decision, not
    // an inferred one.
    if (updateData.status === 'APPROVED' && updated.userId) {
      await prisma.user.updateMany({
        where: { id: updated.userId, status: 'PENDING_VERIFICATION' },
        data: { status: 'ACTIVE' }
      })
    }

    await logAdminAction(req.userId!, 'EDIT_PROFILE', 'profile', req.params.id, {
      // AdminAction.targetUserId is String? (nullable) in schema — undefined
      // is the correct "no single target user" value for a shared profile,
      // not a cast/assertion papering over the null.
      targetUserId: updated.userId ?? undefined,
      reason,
      internalNote,
      previousData: prev,
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    if (prev.status === 'PENDING_REVIEW' && ['APPROVED', 'REJECTED'].includes(updated.status)) {
      await notifyProfileModerationDecision(
        updated.id,
        'profile',
        updated.status as 'APPROVED' | 'REJECTED',
        updated.rejectionReason,
      )
    }

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

// ─── Eligibility report (Sprint 2.5 audit) ────────────────────────────────────
// Read-only diagnostic — lets an admin see *why* a user isn't appearing in
// discovery etc, instead of having to reconstruct it by hand from status +
// profile + privacy settings.
router.get('/users/:id/eligibility', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const eligibility = await getEligibility(req.params.id)
  res.json({ eligibility })
})

// ─── User status ──────────────────────────────────────────────────────────────
// Sprint 2.5.5: manual transitions now go through an explicit state machine.
// PENDING_VERIFICATION → ACTIVE is intentionally not allowed here — "Reactivar"
// is for SUSPENDED → ACTIVE. Activating a still-pending user must go through
// POST /users/:id/evaluate-activation, which actually checks requirements.
router.put('/users/:id/status', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const { status, reason } = req.body
  if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
  if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

  const prev = await prisma.user.findUnique({ where: { id: req.params.id }, select: { status: true } })
  if (!prev) return res.status(404).json({ error: 'Utilizador não encontrado.' })

  if (!canTransitionStatus(prev.status, status)) {
    const hint = prev.status === 'PENDING_VERIFICATION' && status === 'ACTIVE'
      ? ' Usa "Avaliar activação" — este utilizador ainda não cumpre os requisitos ou precisa de passar pelo fluxo automático.'
      : ''
    return res.status(400).json({ error: `Transição ${prev.status} → ${status} não permitida.${hint}` })
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, email: true, status: true, adminRole: true, accountName: true }
  })

  await logAdminAction(req.userId!, `${status}_USER`, 'user', req.params.id, {
    targetUserId: req.params.id, reason,
    previousData: { status: prev.status }, newData: { status }, ipAddress: req.ip
  })
  res.json({ ok: true, user })
})

// ─── Evaluate / trigger activation for a PENDING_VERIFICATION user ───────────
// Read-only-safe: only moves status if requirements are met (email verified,
// OR identity verification approved, OR profile approved). Lets support/admin
// manually re-trigger evaluation instead of force-activating with "Reactivar".
router.post('/users/:id/evaluate-activation', requireAdmin('users'), async (req: AuthRequest, res: Response) => {
  const prev = await prisma.user.findUnique({ where: { id: req.params.id }, select: { status: true } })
  if (!prev) return res.status(404).json({ error: 'Utilizador não encontrado.' })

  const result = await evaluateAndActivateUser(req.params.id)

  if (result.activated) {
    await logAdminAction(req.userId!, 'ACTIVE_USER', 'user', req.params.id, {
      targetUserId: req.params.id,
      reason: 'Requisitos de activação cumpridos: ' + result.evaluation.satisfiedBy.join(', '),
      previousData: { status: prev.status }, newData: { status: 'ACTIVE' }, ipAddress: req.ip
    })
  }

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
  // 3.1: thumbnail per row — admin list view, moderation context (CLEAN)
  interface AdminProfileListRow {
    id: string
    userId: string
    photos: any[]
    [key: string]: any
  }
  const profilesWithPhotos = await Promise.all((profiles as AdminProfileListRow[]).map(async (p: AdminProfileListRow) => ({
    ...p,
    photos: await mergePhotosForViewer(p.photos, {
      ownerUserId: p.userId,
      viewerUserId: null,
      viewerProfileId: null,
      isAdminModeration: true
    })
  })))
  res.json({ profiles: profilesWithPhotos, total })
})

router.put('/profiles/:id/status', requireAdmin('profiles'), async (req: AuthRequest, res: Response) => {
  const { status, reason } = req.body
  const valid = ['APPROVED', 'REJECTED', 'HIDDEN', 'SUSPENDED', 'PENDING_REVIEW']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido.' })

  const previous = await prisma.profile.findUnique({ where: { id: req.params.id }, select: { status: true } })
  if (!previous) return res.status(404).json({ error: 'Perfil não encontrado.' })
  const profile = await prisma.profile.update({
    where: { id: req.params.id },
    data: { status, rejectionReason: reason, moderationNotes: reason }
  })

  // Sprint 4: approving a profile shouldn't require a second manual step in
  // Users to reactivate the account. Sprint 2.5.5: routed through the central
  // activation rule instead of an unconditional updateMany, so it's consistent
  // with email confirmation / identity verification approval.
  // BETA.2 (FASE C) — Profile.userId is null for Shared Profiles
  // (COUPLE/GROUP — see schema.prisma's comment), so approving one now
  // activates every active member instead of a single owner. `activation`
  // in the response keeps its old single-result shape for the Individual
  // Profile case (still the common path); Shared Profile approvals return
  // an array under `activations` instead.
  let activation = null
  let activations: any[] | null = null
  if (status === 'APPROVED') {
    if (profile.userId) {
      activation = await evaluateAndActivateUser(profile.userId)
      if (activation.activated) {
        await logAdminAction(req.userId!, 'ACTIVE_USER', 'user', profile.userId, {
          targetUserId: profile.userId,
          reason: 'Activação automática após aprovação de perfil.',
          newData: { status: 'ACTIVE' }, ipAddress: req.ip
        })
      }
    } else {
      const members = await getActiveMembers(profile.id)
      activations = await Promise.all(members.map(async (m) => {
        const result = await evaluateAndActivateUser(m.userId)
        if (result.activated) {
          await logAdminAction(req.userId!, 'ACTIVE_USER', 'user', m.userId, {
            targetUserId: m.userId,
            reason: 'Activação automática após aprovação de perfil (partilhado).',
            newData: { status: 'ACTIVE' }, ipAddress: req.ip
          })
        }
        return { userId: m.userId, ...result }
      }))
    }
  }

  await logAdminAction(req.userId!, `${status}_PROFILE`, 'profile', req.params.id, { reason, ipAddress: req.ip })
  if (previous.status === 'PENDING_REVIEW' && ['APPROVED', 'REJECTED'].includes(status)) {
    await notifyProfileModerationDecision(profile.id, 'profile', status as 'APPROVED' | 'REJECTED', reason)
  }
  res.json({ ok: true, profile, activation, activations })
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
  // 3.1: moderators must see the actual (unblurred) photo regardless of its
  // moderationStatus/visibilityLevel — that's the whole point of review.
  interface AdminPhotoListRow {
    storagePath: string
    [key: string]: any
  }
  const resolvedPhotos = await Promise.all((photos as AdminPhotoListRow[]).map(async (p: AdminPhotoListRow) => ({
    ...p,
    storagePath: (await signMediaUrl(p.storagePath)) || p.storagePath,
    blurredPath: undefined
  })))
  res.json({ photos: resolvedPhotos, total })
})

router.put('/photos/:id', requireAdmin('photos'), async (req: AuthRequest, res: Response) => {
  const { moderationStatus, moderationNotes } = req.body
  if (!['APPROVED', 'REJECTED'].includes(moderationStatus)) return res.status(400).json({ error: 'Estado de moderação inválido.' })
  const previous = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, select: { moderationStatus: true, profileId: true } })
  if (!previous) return res.status(404).json({ error: 'Foto não encontrada.' })
  const photo = await prisma.profilePhoto.update({
    where: { id: req.params.id },
    data: { moderationStatus, moderationNotes }
  })
  if (moderationStatus === 'REJECTED') {
    const full = await prisma.profilePhoto.findUnique({ where: { id: req.params.id }, include: { profile: true } })
    if (full) {
      // BETA.2 (FASE C) — a Shared Profile's photo has no single owning
      // user (Profile.userId is null — see schema.prisma), so a rejected
      // photo's risk-score hit is applied to every active member instead
      // of just one.
      if (full.profile.userId) {
        await recalculateRiskScore(full.profile.userId)
      } else {
        const members = await getActiveMembers(full.profile.id)
        await Promise.all(members.map(m => recalculateRiskScore(m.userId)))
      }
    }
  }
  await logAdminAction(req.userId!, `${moderationStatus}_PHOTO`, 'photo', req.params.id, { reason: moderationNotes, ipAddress: req.ip })
  if (previous.moderationStatus === 'PENDING') {
    await notifyProfileModerationDecision(previous.profileId, 'photo', moderationStatus as 'APPROVED' | 'REJECTED', moderationNotes, { photoId: photo.id })
  }
  res.json({ ok: true, photo })
})

// ─── Reports / Moderation Dashboard (9.12) ─────────────────────────────────────
// 9.12 — queue, already sorted by priority desc / age asc (oldest of the
// highest-priority reports first). Deliberately does NOT include evidence
// here (9.2: "não incluir evidence em listagens comuns de admin") — only
// a lightweight AI badge (hasAssessment + severity), never the full
// ModerationAssessment.result blob.
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

  const assessments = await (prisma as any).moderationAssessment.findMany({
    where: { reportId: { in: reports.map((r: any) => r.id) } },
    orderBy: { createdAt: 'desc' }
  })
  const latestByReport = new Map<string, any>()
  for (const a of assessments) if (!latestByReport.has(a.reportId)) latestByReport.set(a.reportId, a)

  const withBadge = reports.map((r: any) => {
    const a = latestByReport.get(r.id)
    return { ...r, aiAssessment: a ? { severity: a.confidence, recommendedPriority: a.result?.recommendedPriority ?? null } : null }
  })

  res.json({ reports: withBadge, total })
})

// 9.2/9.12 — detail view: report + evidence (only if the caller has
// moderation.evidence.view — SUPPORT can open this route via 'reports'
// but gets evidence: null) + previous reports against the same target +
// minimal account/profile context + latest AI summary. Never the full
// account (9.12: "não mostrar tudo da conta sem permission").
router.get('/reports/:id', requireAdmin('reports'), async (req: AuthRequest, res: Response) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: {
      reporter: { select: { id: true, email: true } },
      reportedUser: { select: { id: true, email: true, status: true, riskScore: true, createdAt: true, profile: { select: { displayName: true, type: true, city: true } } } }
    }
  })
  if (!report) return res.status(404).json({ error: 'Report não encontrado.' })

  const canViewEvidence = roleHasPermission((req as any).adminRole || null, 'moderation.evidence.view', (req as any).adminPermissions)
  const evidence = canViewEvidence ? await getReportEvidenceForModerator(report.id, req.userId!) : null

  const previousReports = report.reportedUserId
    ? await prisma.report.findMany({
        where: { reportedUserId: report.reportedUserId, id: { not: report.id } },
        select: { id: true, reason: true, status: true, priority: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 10
      })
    : []

  const aiAssessment = await getLatestAssessment(report.id)

  res.json({
    report, evidence, previousReports,
    aiAssessment: aiAssessment ? { ...aiAssessment, result: aiAssessment.result } : null,
    evidenceRestricted: !canViewEvidence,
  })
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

// 9.8 — manual re-run (e.g. after new evidence arrives, or the flag was
// just turned on). No-ops cleanly if AI_MODERATION_ENABLED is off.
router.post('/reports/:id/assess', requireAdmin('reports'), async (req: AuthRequest, res: Response) => {
  const result = await runModerationAssessment(req.params.id)
  if (!result.assessment) return res.status(200).json({ ok: true, assessment: null, reason: result.reason })
  res.json({ ok: true, assessment: result.assessment })
})

// 9.11 — human-in-the-loop measurement: AI recommendation vs human
// decision agreement rate, overrides, approximate false-positive count.
router.get('/moderation/stats', requireAdmin('reports'), async (req: AuthRequest, res: Response) => {
  const stats = await computeAgreementStats()
  res.json({ stats, aiEnabled: process.env.AI_MODERATION_ENABLED === 'true' })
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
  const { status, reason } = req.body
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' })
  if (status === 'REJECTED' && !reason) return res.status(400).json({ error: 'Motivo obrigatório para rejeitar uma verificação.' })

  const prev = await prisma.verification.findUnique({ where: { userId: req.params.userId }, select: { status: true } })
  await prisma.verification.update({ where: { userId: req.params.userId }, data: { status, reviewedAt: new Date() } })

  let activation = null
  if (status === 'APPROVED') {
    await prisma.user.update({ where: { id: req.params.userId }, data: { ageVerifiedAt: new Date() } })
    await recalculateRiskScore(req.params.userId)
    // Sprint 2.5.5: this used to only touch Verification/ageVerifiedAt and never
    // reactivated a still-PENDING_VERIFICATION account — now routed through the
    // same central rule as email confirmation / profile approval.
    activation = await evaluateAndActivateUser(req.params.userId)
  }

  await logAdminAction(req.userId!, `${status}_VERIFICATION`, 'user', req.params.userId, {
    targetUserId: req.params.userId, reason,
    previousData: { status: prev?.status }, newData: { status },
    ipAddress: req.ip
  })
  if (prev?.status === 'PENDING') {
    await notifyUserModerationDecision(req.params.userId, 'verification', status as 'APPROVED' | 'REJECTED', reason)
  }
  res.json({ ok: true, activation })
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

    // BETA.2 fix — authorization must be checked before payload
    // validation, not after. This used to validate `reason` first, so a
    // non-SUPER_ADMIN caller who simply omitted `reason` got a generic
    // 400 "Motivo obrigatório" instead of the 403 that actually explains
    // why the request is rejected — and, worse, a non-SUPER_ADMIN who DID
    // include a reason would sail past this check into the SUPER_ADMIN
    // gate below anyway, so the ordering only ever hid the real error.
    if ((req as any).adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode atribuir roles de administrador.' })
    }

    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório.' })

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

    const { sendProviderTestEmail } = await import('../lib/email')

    try {
      await sendProviderTestEmail(to)
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

// ─── Admin role configuration (fixed roles, editable labels/policy) ───────────
const adminRoleConfigSchema = z.object({
  label: z.string().trim().min(2).max(60),
  description: z.string().trim().max(240).optional().nullable(),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS as unknown as [string, ...string[]])),
})
const ADMIN_ROLES = ['SUPER_ADMIN','ADMIN','MODERATOR','SUPPORT','FINANCE','CONTENT_REVIEWER'] as const

router.get('/my-role-config', requireAdmin(), async (req: AuthRequest, res: Response) => {
  const role = (req as any).adminRole as typeof ADMIN_ROLES[number]
  const config = await (prisma as any).adminRoleConfig.findUnique({ where: { role } }).catch(() => null)
  res.json({
    role,
    label: config?.label || role,
    description: config?.description || null,
    permissions: Array.isArray(config?.permissions) ? config.permissions : DEFAULT_ROLE_PERMISSIONS[role],
  })
})

router.get('/role-configs', requireAdmin(), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode gerir roles.' })
  const stored = await (prisma as any).adminRoleConfig.findMany()
  const byRole = new Map(stored.map((c: any) => [c.role, c]))
  const configs = ADMIN_ROLES.map(role => byRole.get(role) || {
    role, label: role, description: null, permissions: DEFAULT_ROLE_PERMISSIONS[role],
  })
  res.json({ configs, availablePermissions: ADMIN_PERMISSIONS })
})

router.put('/role-configs/:role', requireAdmin(), async (req: AuthRequest, res: Response) => {
  if ((req as any).adminRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode gerir roles.' })
  if (!ADMIN_ROLES.includes(req.params.role as any)) return res.status(400).json({ error: 'Role desconhecida.' })
  try {
    const data = adminRoleConfigSchema.parse(req.body)
    const role = req.params.role as typeof ADMIN_ROLES[number]
    // SUPER_ADMIN must always retain full access; only its presentation is editable.
    const permissions = role === 'SUPER_ADMIN' ? ['*'] : [...new Set(data.permissions)]
    const previous = await (prisma as any).adminRoleConfig.findUnique({ where: { role } })
    const config = await (prisma as any).adminRoleConfig.upsert({
      where: { role },
      update: { label: data.label, description: data.description, permissions },
      create: { role, label: data.label, description: data.description, permissions },
    })
    await logAdminAction(req.userId!, 'UPDATE_ADMIN_ROLE_CONFIG', 'admin_role_config', role, {
      previousData: previous, newData: config, ipAddress: req.ip,
    })
    res.json(config)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[ADMIN ROLE CONFIG]', err)
    res.status(500).json({ error: 'Não foi possível guardar o role.' })
  }
})


// ─── GET /api/admin/email-config — SMTP diagnostic ────────────────────────────
router.get('/email-config', requireAdmin('configuracoes'), async (req: AuthRequest, res: Response) => {
  const { getEmailConfig } = await import('../lib/email')
  const config = getEmailConfig()
  if (!config.configured) {
    return res.json({
      status: 'misconfigured', config,
      fix: 'Configura SENDGRID_API_KEY e EMAIL_FROM no serviço backend do Railway.'
    })
  }

  // SendGrid — test the API key itself (no way to "ping" without sending an email)
  if (config.provider === 'sendgrid') {
    try {
      const r = await fetch('https://api.sendgrid.com/v3/scopes', {
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` }
      })
      if (!r.ok) {
        const body = await r.text().catch(() => '')
        return res.json({
          status: 'error', message: `SendGrid respondeu ${r.status}`, config,
          hints: [
            'Confirma que a API Key está correta e activa em app.sendgrid.com/settings/api_keys',
            'A API Key precisa da permissão "Mail Send" pelo menos',
            body.slice(0, 200),
          ]
        })
      }
      return res.json({ status: 'ok', message: '✅ SendGrid API ligado e pronto', config })
    } catch (err: any) {
      return res.json({ status: 'error', message: err.message, config, hints: ['Falha de rede a contactar api.sendgrid.com — verifica ligação do serviço.'] })
    }
  }

  // Generic SMTP fallback test (local/dev only in the current deployment)
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
        'Confirma SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS nas variáveis do serviço.',
        'Na produção BetweenUs deve ser usado SendGrid através de SENDGRID_API_KEY.',
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
// BETA.2.2 — the bell used to ONLY show event-driven Notification rows
// (never anything for pre-existing/seeded pending work, and never anything
// at all for MODERATOR/SUPPORT/FINANCE/CONTENT_REVIEWER — notifyAdmins()
// only targets SUPER_ADMIN/ADMIN). This endpoint is additive: unread
// Notification rows (unchanged) PLUS a role-filtered, derived work queue
// (adminWorkQueueService.ts) computed fresh from the actual pending
// tables every call — no new Notification rows are created for this, per
// the explicit instruction not to fabricate seed notifications when the
// information can be derived from real queues.
router.get('/notifications/summary', requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { getAdminNotificationSummary } = await import('../lib/adminWorkQueueService')
    const summary = await getAdminNotificationSummary(req.userId!, ((req as any).adminRole || null))
    res.json(summary)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

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
  await notifyAdminsWithPush('service_event', title, body, { tab:'admin/audit' }, excludeUserId)
}
