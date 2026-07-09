// BETA.1.35 — deletes ONLY isTestAccount=true rows (and their associated
// seed data), never a real user. Mirrors hardDeleteJob.ts's exact
// non-cascading-relation handling (same schema, same exceptions) rather
// than re-deriving it independently — see that file's header comment for
// why each of these relations needs special handling before a User can
// be deleted:
//   - RoomMessage.senderUserId (NOT NULL, no cascade) -> deleted outright
//   - Report.reportedUserId / AdminAction.targetUserId / BetaInvite.usedById
//     (nullable, no cascade) -> nulled, the row itself stays
//   - AdminAction.adminId (NOT NULL, no cascade, no null-out option) ->
//     the account is SKIPPED entirely rather than forced through, exactly
//     like hardDeleteJob. The 6 admin test accounts are routinely used to
//     click around the real admin panel during manual QA, so it is
//     plausible one of them has performed a real AdminAction by the time
//     cleanup runs — that audit trail must not be destroyed just because
//     the actor was a test account.
//   - BetaInvite.createdById (NOT NULL, no cascade, no null-out option) ->
//     DELETED outright (not skipped like AdminAction). BETA.2.8's beta
//     invite scenarios are themselves fabricated by THIS seed with zero
//     audit value — unlike AdminAction, there is no "real admin work"
//     interpretation to preserve here. Skipping the creator account
//     instead (as an earlier version of this file did) would leave
//     individual_diogo permanently stuck across every reseed/cleanup
//     cycle, since it always re-creates the same 4 invites via upsert.
//   - RecommendationSignal (no FK/cascade at all) -> swept explicitly via
//     deleteAllSignalsForProfile, same as hardDeleteJob, for analytics
//     cleanliness even though it wouldn't block the delete either way.
//
// npm run db:seed:beta:cleanup
//
// Safety: assertCleanupAllowed() (guards.ts) requires BETA_SEED_ENABLED
// (+ BETA_SEED_ALLOW_PRODUCTION) exactly like the seed itself, PLUS, in
// production, an explicit BETA_SEED_CLEANUP_CONFIRM=DELETE_TEST_DATA typed
// confirmation. Never uses an email-domain heuristic alone to decide what
// to delete — isTestAccount=true is the only selector, matching BETA.1.2's
// explicit instruction not to rely on the email domain for identification.
// Set BETA_SEED_CLEANUP_DRY_RUN=true to print what would happen without
// deleting anything.
import prisma from '../../src/lib/prisma'
import { assertCleanupAllowed, printSeedTargetBanner } from './guards'
import { deleteAllSignalsForProfile } from '../../src/lib/recommendationSignalService'

interface CleanupOutcome {
  userId: string
  email: string
  skipped: boolean
  reason?: string
  dryRun: boolean
  roomMessagesRemoved: number
  reportsAnonymised: number
  adminActionsAnonymised: number
  betaInviteUsageAnonymised: number
  betaInvitesCreatedRemoved: number
  recommendationSignalsRemoved: number
}

const findSkipReason = async (userId: string): Promise<string | null> => {
  const adminActionCount = await prisma.adminAction.count({ where: { adminId: userId } })
  if (adminActionCount > 0) {
    return `Tem ${adminActionCount} ação(ões) de administrador registada(s) (AdminAction.adminId é obrigatório e não tem cascade) — apagar esta conta destruiria o histórico de auditoria dessas ações. Conta mantida (não apagada por este script).`
  }
  return null
}

const cleanupOne = async (user: { id: string; email: string }, dryRun: boolean): Promise<CleanupOutcome> => {
  const skipReason = await findSkipReason(user.id)
  if (skipReason) {
    return {
      userId: user.id, email: user.email, skipped: true, reason: skipReason, dryRun,
      roomMessagesRemoved: 0, reportsAnonymised: 0, adminActionsAnonymised: 0,
      betaInviteUsageAnonymised: 0, betaInvitesCreatedRemoved: 0, recommendationSignalsRemoved: 0,
    }
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { id: true } })

  const [roomMessageCount, reportCount, adminActionCount, betaInviteUsageCount, betaInviteCreatedCount] = await Promise.all([
    prisma.roomMessage.count({ where: { senderUserId: user.id } }),
    prisma.report.count({ where: { reportedUserId: user.id } }),
    prisma.adminAction.count({ where: { targetUserId: user.id } }),
    prisma.betaInvite.count({ where: { usedById: user.id } }),
    prisma.betaInvite.count({ where: { createdById: user.id } }),
  ])
  const signalCount = profile
    ? await (prisma as any).recommendationSignal.count({ where: { OR: [{ actorProfileId: profile.id }, { targetProfileId: profile.id }] } })
    : 0

  if (dryRun) {
    return {
      userId: user.id, email: user.email, skipped: false, dryRun: true,
      roomMessagesRemoved: roomMessageCount, reportsAnonymised: reportCount,
      adminActionsAnonymised: adminActionCount, betaInviteUsageAnonymised: betaInviteUsageCount,
      betaInvitesCreatedRemoved: betaInviteCreatedCount, recommendationSignalsRemoved: signalCount,
    }
  }

  // Same ordering discipline as hardDeleteJob: clear/delete everything
  // that would otherwise block the FK cascade BEFORE the final user
  // delete, so a crash mid-way is safely re-runnable (cleanup can just be
  // invoked again — every step here is idempotent on an already-cleared
  // relation, and deleteMany on already-deleted rows is a no-op).
  await prisma.roomMessage.deleteMany({ where: { senderUserId: user.id } })
  await prisma.report.updateMany({ where: { reportedUserId: user.id }, data: { reportedUserId: null } })
  await prisma.adminAction.updateMany({ where: { targetUserId: user.id }, data: { targetUserId: null } })
  await prisma.betaInvite.updateMany({ where: { usedById: user.id }, data: { usedById: null } })
  await prisma.betaInvite.deleteMany({ where: { createdById: user.id } })
  if (profile) await deleteAllSignalsForProfile(profile.id)

  await prisma.user.delete({ where: { id: user.id } })

  return {
    userId: user.id, email: user.email, skipped: false, dryRun: false,
    roomMessagesRemoved: roomMessageCount, reportsAnonymised: reportCount,
    adminActionsAnonymised: adminActionCount, betaInviteUsageAnonymised: betaInviteUsageCount,
    betaInvitesCreatedRemoved: betaInviteCreatedCount, recommendationSignalsRemoved: signalCount,
  }
}

const main = async () => {
  assertCleanupAllowed()
  const dryRun = process.env.BETA_SEED_CLEANUP_DRY_RUN === 'true'
  printSeedTargetBanner(dryRun ? 'BETA SEED CLEANUP (dry-run)' : 'BETA SEED CLEANUP')

  // isTestAccount=true is the ONLY selector — never the email domain
  // alone (BETA.1.2/1.35), even though every seeded account also happens
  // to be on the betweenus.test domain. A stray real account could never
  // be picked up by this query even if it somehow used that domain,
  // because isTestAccount is never set true anywhere except this seed.
  const users = await prisma.user.findMany({
    where: { isTestAccount: true },
    select: { id: true, email: true },
  })

  console.log(`\nContas de teste encontradas: ${users.length}`)
  if (users.length === 0) {
    console.log('Nada para limpar.')
    return
  }
  console.log(dryRun ? 'Modo dry-run — nada será apagado.\n' : 'A apagar...\n')

  const outcomes: CleanupOutcome[] = []
  for (const user of users) {
    outcomes.push(await cleanupOne(user, dryRun))
  }

  const deleted = outcomes.filter(o => !o.skipped)
  const skipped = outcomes.filter(o => o.skipped)

  console.log('─'.repeat(70))
  console.log(`${dryRun ? 'Seriam apagadas' : 'Apagadas'}: ${deleted.length}`)
  console.log(`Mantidas (skip — auditoria de admin associada): ${skipped.length}`)
  if (skipped.length > 0) {
    console.log('\nContas mantidas:')
    for (const s of skipped) console.log(`  - ${s.email}: ${s.reason}`)
  }
  const totals = deleted.reduce((acc, o) => ({
    roomMessagesRemoved: acc.roomMessagesRemoved + o.roomMessagesRemoved,
    reportsAnonymised: acc.reportsAnonymised + o.reportsAnonymised,
    adminActionsAnonymised: acc.adminActionsAnonymised + o.adminActionsAnonymised,
    betaInviteUsageAnonymised: acc.betaInviteUsageAnonymised + o.betaInviteUsageAnonymised,
    betaInvitesCreatedRemoved: acc.betaInvitesCreatedRemoved + o.betaInvitesCreatedRemoved,
    recommendationSignalsRemoved: acc.recommendationSignalsRemoved + o.recommendationSignalsRemoved,
  }), { roomMessagesRemoved: 0, reportsAnonymised: 0, adminActionsAnonymised: 0, betaInviteUsageAnonymised: 0, betaInvitesCreatedRemoved: 0, recommendationSignalsRemoved: 0 })
  console.log('\nEfeitos colaterais:')
  console.log(`  RoomMessage removidas: ${totals.roomMessagesRemoved}`)
  console.log(`  Report.reportedUserId anonimizados: ${totals.reportsAnonymised}`)
  console.log(`  AdminAction.targetUserId anonimizados: ${totals.adminActionsAnonymised}`)
  console.log(`  BetaInvite.usedById anonimizados: ${totals.betaInviteUsageAnonymised}`)
  console.log(`  BetaInvite (criados por conta apagada) removidos: ${totals.betaInvitesCreatedRemoved}`)
  console.log(`  RecommendationSignal removidos: ${totals.recommendationSignalsRemoved}`)
  console.log('─'.repeat(70))
}

main()
  .catch(e => { console.error('[CLEANUP BETA SEED] Falhou:', e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
