// BETA.2.2/2.3 — Admin work queue + role-aware dashboard.
//
// Two related bugs this fixes:
//
// 1) GET /admin/dashboard was a single endpoint gated to the 'metrics'
//    permission. MODERATOR/SUPPORT/CONTENT_REVIEWER don't have 'metrics'
//    (see ROLE_PERMISSIONS in middleware/admin.ts) — they got a 403, the
//    frontend's `.catch(() => {})` swallowed it silently, and `data`
//    stayed null forever → permanent "A carregar..." spinner. Confirmed
//    by reading routes/admin.ts:59 + AdminPage.jsx's DashboardTab, not
//    assumed.
//
// 2) The admin notification bell (routes/admin.ts GET /notifications)
//    only ever showed event-driven Notification rows (created at the
//    moment notifyAdmins() ran) and only notifyAdmins() ever targets
//    SUPER_ADMIN/ADMIN (lib/notify.ts:32). Pre-existing pending work
//    (verifications/reports that existed before this admin session
//    started, or that were seeded directly into the DB) never produced a
//    Notification row, so the bell never reflected real backlog for
//    ANY role, including SUPER_ADMIN.
//
// Fix for both: derive "what needs attention" from the actual queues
// (Verification/Report/Profile/ProfilePhoto tables) instead of a separate
// event log, and gate each derived count behind the SAME permission
// string the corresponding admin route already requires — so this list
// can never drift out of sync with what the role can actually click into
// (WIDGET_PERMISSION below is not a second source of truth, it's a
// mirror of existing requireAdmin(...) calls in routes/verifications.ts,
// routes/reports.ts, routes/admin.ts, routes/photos.ts).
import prisma from './prisma'
import { roleHasPermission, AdminRole } from '../middleware/admin'
import { PRIORITY_TIER } from './reportPriorityService'

export interface AdminWorkQueueCounts {
  verificationsPending?: number
  profilesPendingReview?: number
  reportsPending?: number
  reportsCritical?: number
  photosPending?: number
}

type QueueKey = keyof AdminWorkQueueCounts

// routes/verifications.ts PUT/GET admin routes → requireAdmin('profiles')
// routes/admin.ts profile approval → requireAdmin('profiles')
// routes/reports.ts admin routes → requireAdmin('reports')
// routes/photos.ts moderation routes → requireAdmin('photos')
const WIDGET_PERMISSION: Record<QueueKey, string> = {
  verificationsPending: 'profiles',
  profilesPendingReview: 'profiles',
  reportsPending: 'reports',
  reportsCritical: 'reports',
  photosPending: 'photos',
}

const computeAllCounts = async (): Promise<Required<AdminWorkQueueCounts>> => {
  const [verificationsPending, profilesPendingReview, reportsPending, reportsCritical, photosPending] = await Promise.all([
    prisma.verification.count({ where: { status: 'PENDING' } }),
    prisma.profile.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    // 9.4's ReportPriorityService PRIORITY_TIER is the existing, single
    // definition of "critical" — reused here rather than picking a new
    // threshold, so "critical" means the same thing in the bell as it
    // does everywhere else reports are triaged.
    prisma.report.count({ where: { status: 'PENDING', priority: { gte: PRIORITY_TIER.HIGH } } }),
    prisma.profilePhoto.count({ where: { moderationStatus: 'PENDING' } }),
  ])
  return { verificationsPending, profilesPendingReview, reportsPending, reportsCritical, photosPending }
}

// Only includes keys the role actually has permission to act on — a
// MODERATOR dropdown never shows a count it can't do anything about, and
// SUPPORT/FINANCE (no 'profiles'/'reports'/'photos') get an empty queue
// object rather than a 403 or a misleading number.
export const getWorkQueueForRole = async (role: AdminRole | null): Promise<AdminWorkQueueCounts> => {
  const all = await computeAllCounts()
  const out: AdminWorkQueueCounts = {}
  for (const key of Object.keys(all) as QueueKey[]) {
    if (roleHasPermission(role, WIDGET_PERMISSION[key])) out[key] = all[key]
  }
  return out
}

export interface AdminNotificationSummary {
  unreadNotifications: Array<{ id: string; type: string; title: string; body: string; data: string | null; createdAt: Date }>
  workQueue: AdminWorkQueueCounts
  totalAttentionCount: number
}

export const getAdminNotificationSummary = async (userId: string, role: AdminRole | null): Promise<AdminNotificationSummary> => {
  const [unreadNotifications, workQueue] = await Promise.all([
    (prisma as any).notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    getWorkQueueForRole(role)
  ])
  // reportsCritical is a SUBSET of reportsPending (critical reports are
  // still PENDING), not an additional bucket — summing both here would
  // double-count the same reports. totalAttentionCount = unread event
  // notifications + each DISTINCT queue (critical excluded from the sum,
  // shown only as a breakdown/highlight in the dropdown).
  const queueTotal = (workQueue.verificationsPending || 0)
    + (workQueue.profilesPendingReview || 0)
    + (workQueue.reportsPending || 0)
    + (workQueue.photosPending || 0)
  return {
    unreadNotifications,
    workQueue,
    totalAttentionCount: unreadNotifications.length + queueTotal
  }
}

// ─── Role-aware dashboard widget filtering ─────────────────────────────────
// GET /admin/dashboard's underlying queries are unchanged (still one
// Promise.all, still one query per metric) — what's new is which TOP-LEVEL
// keys of that response actually reach a given role, mirrored against the
// same permission each metric's own admin surface already requires.
export type DashboardSection = 'users' | 'profiles' | 'photos' | 'matches' | 'messages' | 'reports' | 'subscriptions' | 'verifications'

const SECTION_PERMISSION: Record<DashboardSection, string> = {
  users: 'users',
  profiles: 'profiles',
  photos: 'photos',
  matches: 'profiles',       // no dedicated 'matches' permission exists — matches are profile-scoped moderation context
  messages: 'conversations',
  reports: 'reports',
  subscriptions: 'subscriptions',
  verifications: 'profiles', // same gate as routes/verifications.ts
}

export const filterDashboardForRole = <T extends Record<string, any>>(full: T, role: AdminRole | null): Partial<T> & { visibleSections: DashboardSection[] } => {
  const out: any = {}
  const visible: DashboardSection[] = []
  for (const [section, permission] of Object.entries(SECTION_PERMISSION) as [DashboardSection, string][]) {
    if (full[section] !== undefined && roleHasPermission(role, permission)) {
      out[section] = full[section]
      visible.push(section)
    }
  }
  out.visibleSections = visible
  return out
}
