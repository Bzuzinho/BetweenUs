import { Router, Response } from 'express'
import { randomBytes } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { filterDashboardForRole } from '../lib/adminWorkQueueService'

const router = Router()
router.use(requireAuth)

const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Between Us <emailtemp02@gmail.com>'
const EMAIL_FROM_ADDRESS = EMAIL_FROM.match(/<(.+)>/)?.[1] || EMAIL_FROM
const EMAIL_FROM_NAME = EMAIL_FROM.replace(/\s*<.+>\s*/, '').trim() || 'Between Us'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

async function sendBetaInviteEmail(email: string, inviteUrl: string) {
  if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY is not configured')

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: EMAIL_FROM_ADDRESS, name: EMAIL_FROM_NAME },
      subject: 'O teu convite para o Between Us',
      content: [{
        type: 'text/html',
        value: `<!doctype html><html lang="pt"><body style="font-family:Arial,sans-serif;background:#0A141A;color:#F5F7FA;padding:24px"><div style="max-width:560px;margin:auto;background:#102129;border:1px solid #1E3340;border-radius:16px;padding:28px"><h2 style="margin-top:0">O teu acesso beta está disponível</h2><p>O pedido associado a <strong>${escapeHtml(email)}</strong> foi aprovado.</p><p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#B8A7FF;color:#0A141A;text-decoration:none;padding:13px 24px;border-radius:40px;font-weight:700">Aceitar convite</a></p><p style="color:#AAB6C2;font-size:12px;word-break:break-all">${escapeHtml(inviteUrl)}</p></div></body></html>`,
      }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`SendGrid ${response.status}: ${body.slice(0, 300)}`)
  }
}

// Operational dashboard: commercial totals keep excluding test accounts,
// while moderation queues intentionally include every pending item, matching
// the notification bell and the actual work that admins must process.
router.get('/dashboard', requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
      testAccountCount,
    ] = await Promise.all([
      prisma.user.count({ where: userFilter }),
      prisma.user.count({ where: { createdAt: { gte: today }, ...userFilter } }),
      prisma.user.count({ where: { createdAt: { gte: week }, ...userFilter } }),
      prisma.user.count({ where: { createdAt: { gte: month }, ...userFilter } }),
      prisma.profile.count({ where: viaUser }),
      prisma.profile.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.profile.count({ where: { status: 'APPROVED', ...viaUser } }),
      prisma.profilePhoto.count({ where: { profile: viaUser } }),
      prisma.profilePhoto.count({ where: { moderationStatus: 'PENDING' } }),
      prisma.match.count({ where: includeTestData ? {} : { profileOne: viaUser, profileTwo: viaUser } }),
      prisma.match.count({ where: { status: 'ACTIVE', ...(includeTestData ? {} : { profileOne: viaUser, profileTwo: viaUser }) } }),
      prisma.message.count({ where: { deletedAt: null, ...(includeTestData ? {} : { sender: userFilter }) } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { plan: 'PREMIUM', status: 'ACTIVE', ...viaUser } }),
      prisma.subscription.count({ where: { plan: 'COUPLE_PREMIUM', status: 'ACTIVE', ...viaUser } }),
      prisma.user.count({ where: { status: 'SUSPENDED', ...userFilter } }),
      prisma.user.count({ where: { status: 'BANNED', ...userFilter } }),
      prisma.verification.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { riskScore: { gte: 50 }, ...userFilter } }),
      prisma.user.count({ where: { isTestAccount: true } }),
    ])

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
      verifications: { pending: pendingVerifications },
    }

    res.json({
      includeTestData,
      testAccountCount,
      ...filterDashboardForRole(full, (req as any).adminRole || null),
    })
  } catch (err: any) {
    console.error('[ADMIN DASHBOARD OVERRIDE]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// Existing BetaTab already renders the invites array. Pending landing-page
// applications are exposed as synthetic inactive entries with code PEDIDO.
// Clicking “Activar” approves the request, creates the real invite and sends it.
router.get('/beta/invites', requireAdmin('beta'), async (_req: AuthRequest, res: Response) => {
  const [invites, applications] = await Promise.all([
    prisma.betaInvite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { email: true } }, usedBy: { select: { email: true } } },
    }),
    prisma.$queryRaw<Array<{ id: string; email: string; createdAt: Date }>>`
      SELECT "id", "email", "createdAt"
      FROM "beta_applications"
      WHERE "status" = 'PENDING'
      ORDER BY "createdAt" DESC
    `,
  ])

  const pendingApplications = applications.map(application => ({
    id: `application:${application.id}`,
    code: 'PEDIDO',
    email: application.email,
    active: false,
    useCount: 0,
    maxUses: 1,
    usedById: null,
    usedAt: null,
    createdAt: application.createdAt,
    isBetaApplication: true,
  }))

  res.json({
    invites: [...pendingApplications, ...invites].sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  })
})

router.put('/beta/invites/:id/toggle', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  if (!req.params.id.startsWith('application:')) return res.locals.next?.()

  const applicationId = req.params.id.slice('application:'.length)
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; email: string; status: string }>>`
      SELECT "id", "email", "status"
      FROM "beta_applications"
      WHERE "id" = ${applicationId}
      LIMIT 1
    `
    const application = rows[0]
    if (!application) return res.status(404).json({ error: 'Pedido não encontrado.' })
    if (application.status !== 'PENDING') return res.status(409).json({ error: 'Este pedido já foi processado.' })

    const code = randomBytes(6).toString('hex').toUpperCase()
    const invite = await prisma.betaInvite.create({
      data: { code, createdById: req.userId!, email: application.email, maxUses: 1 },
    })
    const inviteUrl = `${CLIENT_URL}/join/${code}`

    try {
      await sendBetaInviteEmail(application.email, inviteUrl)
    } catch (emailError) {
      await prisma.betaInvite.delete({ where: { id: invite.id } }).catch(() => {})
      throw emailError
    }

    await prisma.$executeRaw`
      UPDATE "beta_applications"
      SET "status" = 'INVITED', "updatedAt" = NOW()
      WHERE "id" = ${application.id}
    `
    await logAdminAction(req.userId!, 'INVITE_BETA_APPLICATION', 'beta_application', application.id, {
      newData: { email: application.email, inviteId: invite.id, code },
      ipAddress: req.ip,
    })

    return res.json({ ok: true, invite, inviteUrl })
  } catch (err: any) {
    console.error('[BETA APPLICATION INVITE]', err.message)
    return res.status(500).json({ error: 'Não foi possível enviar o convite.' })
  }
})

router.delete('/beta/invites/:id', requireAdmin('beta'), async (req: AuthRequest, res: Response) => {
  if (!req.params.id.startsWith('application:')) return res.locals.next?.()

  const applicationId = req.params.id.slice('application:'.length)
  const changed = await prisma.$executeRaw`
    UPDATE "beta_applications"
    SET "status" = 'REJECTED', "updatedAt" = NOW()
    WHERE "id" = ${applicationId} AND "status" = 'PENDING'
  `
  if (!changed) return res.status(404).json({ error: 'Pedido não encontrado ou já processado.' })

  await logAdminAction(req.userId!, 'REJECT_BETA_APPLICATION', 'beta_application', applicationId, { ipAddress: req.ip })
  return res.json({ ok: true })
})

export default router
