// 3.6 — Hard delete job
//
// auth.ts DELETE /account and admin.ts DELETE /users/:id both soft-delete
// (anonymise email/passwordHash/dateOfBirth, set status=DELETED) and tell
// the user "os teus dados serão removidos nos próximos 30 dias" — a promise
// nothing in the codebase kept before this. This job makes that promise
// real: after a grace period, it actually deletes the User row (which
// cascades to almost everything — Profile, Verification, UserConsent,
// BlockedContactHash, Subscription, PrivateRoomMember, Message, etc. — see
// the onDelete: Cascade relations in schema.prisma) plus the R2 objects
// nothing was ever cleaning up (profile photos, verification selfie if
// still present, avatar).
//
// A few User relations do NOT cascade and would otherwise abort the delete
// with a foreign key violation:
//   - Report.reportedUserId (nullable)   -> nulled, the report itself stays
//     (moderation history has value independent of the reported account
//     still existing)
//   - AdminAction.targetUserId (nullable) -> nulled, same reasoning
//   - BetaInvite.usedById (nullable)      -> nulled
//   - RoomMessage.senderUserId (NOT NULL, no cascade) -> the user's own
//     room messages are deleted outright (their own words, no independent
//     audit value the way a report or admin action has)
//   - AdminAction.adminId (NOT NULL) and BetaInvite.createdById (NOT NULL)
//     have no null-out option at all, so any user who ever performed an
//     admin action or issued a beta invite is SKIPPED rather than forced
//     through — deleting an admin's identity out from under the audit log
//     they authored is worse than leaving that one account soft-deleted
//     indefinitely. Flagged per-user in the job's output, not silent.
//
// Idempotent: every step is "delete rows matching X" or "set field to
// null/already-null" — safe to re-run after a partial failure (e.g. crash
// between the R2 deletes and the final user delete). deleteFile() on an
// already-missing R2 key does not error.
import prisma from './prisma'
import { deleteFile } from './storage'
import { extractStorageKey } from './mediaAccessService'

const GRACE_DAYS = Number(process.env.HARD_DELETE_GRACE_DAYS || 30)

export interface HardDeleteOutcome {
  userId: string
  email: string
  skipped: boolean
  reason?: string
  dryRun: boolean
  mediaKeysRemoved: number
  roomMessagesRemoved: number
  reportsAnonymised: number
  adminActionsAnonymised: number
  betaInviteUsageAnonymised: number
}

export const findEligibleUsers = async () => {
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000)
  return prisma.user.findMany({
    where: { status: 'DELETED', updatedAt: { lte: cutoff } },
    select: { id: true, email: true, updatedAt: true, avatarPath: true }
  })
}

const findSkipReason = async (userId: string): Promise<string | null> => {
  const [adminActionCount, betaInviteCount] = await Promise.all([
    prisma.adminAction.count({ where: { adminId: userId } }),
    prisma.betaInvite.count({ where: { createdById: userId } })
  ])
  if (adminActionCount > 0) {
    return `Tem ${adminActionCount} ação(ões) de administrador registada(s) (AdminAction.adminId é obrigatório e não tem cascade) — eliminar esta conta destruiria o histórico de auditoria dessas ações.`
  }
  if (betaInviteCount > 0) {
    return `Criou ${betaInviteCount} convite(s) beta (BetaInvite.createdById é obrigatório e não tem cascade).`
  }
  return null
}

const gatherMediaKeys = async (userId: string, avatarPath: string | null): Promise<string[]> => {
  const [profile, verification] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, include: { photos: true } }),
    prisma.verification.findUnique({ where: { userId } })
  ])
  const keys: string[] = []
  for (const photo of profile?.photos || []) {
    const cleanKey = extractStorageKey(photo.storagePath)
    if (cleanKey) keys.push(cleanKey)
    const blurredKey = extractStorageKey(photo.blurredPath)
    if (blurredKey) keys.push(blurredKey)
  }
  const selfieKey = extractStorageKey(verification?.selfieStoragePath || null)
  if (selfieKey) keys.push(selfieKey)
  const avatarKey = extractStorageKey(avatarPath)
  if (avatarKey) keys.push(avatarKey)
  return keys
}

const hardDeleteOne = async (
  user: { id: string; email: string; avatarPath: string | null },
  dryRun: boolean
): Promise<HardDeleteOutcome> => {
  const skipReason = await findSkipReason(user.id)
  if (skipReason) {
    return {
      userId: user.id, email: user.email, skipped: true, reason: skipReason, dryRun,
      mediaKeysRemoved: 0, roomMessagesRemoved: 0, reportsAnonymised: 0,
      adminActionsAnonymised: 0, betaInviteUsageAnonymised: 0
    }
  }

  const [mediaKeys, roomMessageCount, reportCount, adminActionCount, betaInviteUsageCount] = await Promise.all([
    gatherMediaKeys(user.id, user.avatarPath),
    prisma.roomMessage.count({ where: { senderUserId: user.id } }),
    prisma.report.count({ where: { reportedUserId: user.id } }),
    prisma.adminAction.count({ where: { targetUserId: user.id } }),
    prisma.betaInvite.count({ where: { usedById: user.id } })
  ])

  if (dryRun) {
    return {
      userId: user.id, email: user.email, skipped: false, dryRun: true,
      mediaKeysRemoved: mediaKeys.length, roomMessagesRemoved: roomMessageCount,
      reportsAnonymised: reportCount, adminActionsAnonymised: adminActionCount,
      betaInviteUsageAnonymised: betaInviteUsageCount
    }
  }

  // Order matters: clear/delete everything that would block the FK cascade
  // BEFORE the final user delete, so a crash mid-way is safely re-runnable.
  await Promise.all(mediaKeys.map(key => deleteFile(key).catch(() => {})))
  await prisma.roomMessage.deleteMany({ where: { senderUserId: user.id } })
  await prisma.report.updateMany({ where: { reportedUserId: user.id }, data: { reportedUserId: null } })
  await prisma.adminAction.updateMany({ where: { targetUserId: user.id }, data: { targetUserId: null } })
  await prisma.betaInvite.updateMany({ where: { usedById: user.id }, data: { usedById: null } })

  await prisma.user.delete({ where: { id: user.id } })

  return {
    userId: user.id, email: user.email, skipped: false, dryRun: false,
    mediaKeysRemoved: mediaKeys.length, roomMessagesRemoved: roomMessageCount,
    reportsAnonymised: reportCount, adminActionsAnonymised: adminActionCount,
    betaInviteUsageAnonymised: betaInviteUsageCount
  }
}

export const runHardDeleteJob = async (dryRun: boolean): Promise<HardDeleteOutcome[]> => {
  const users = await findEligibleUsers()
  const results: HardDeleteOutcome[] = []
  for (const user of users) {
    results.push(await hardDeleteOne(user, dryRun))
  }
  return results
}
