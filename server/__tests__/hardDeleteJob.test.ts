// 3.9 — tests for 3.6's hard-delete job: grace period, dry-run vs real run,
// the skip-list for accounts with admin/beta-invite history, and that a
// non-cascading relation (Report.reportedUserId) survives as null rather
// than blocking the delete.
import { prisma, createTestUser, createTestProfile } from './helpers'
import { runHardDeleteJob, findEligibleUsers } from '../src/lib/hardDeleteJob'

const backdateSoftDelete = async (userId: string, daysAgo: number) => {
  await prisma.user.update({ where: { id: userId }, data: { status: 'DELETED' } })
  const backdated = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  // updatedAt is @updatedAt (Prisma-managed) — can't set it through a normal
  // .update() call, so this goes around Prisma with raw SQL, same as any
  // grace-period test for an @updatedAt field would have to.
  await prisma.$executeRawUnsafe('UPDATE "users" SET "updatedAt" = $1 WHERE id = $2', backdated, userId)
}

describe('findEligibleUsers', () => {
  it('only returns DELETED users past the grace period', async () => {
    const recent = await createTestUser({ email: 'recent-delete@test.com' })
    await backdateSoftDelete(recent.id, 5) // well within the 30-day default grace period

    const old = await createTestUser({ email: 'old-delete@test.com' })
    await backdateSoftDelete(old.id, 45) // past it

    const stillActive = await createTestUser({ email: 'still-active@test.com' })

    const eligible = await findEligibleUsers()
    const ids = eligible.map(u => u.id)
    expect(ids).toContain(old.id)
    expect(ids).not.toContain(recent.id)
    expect(ids).not.toContain(stillActive.id)
  })
})

describe('runHardDeleteJob — dry run', () => {
  it('reports what would happen without deleting anything', async () => {
    const user = await createTestUser({ email: 'dryrun@test.com' })
    await createTestProfile(user.id)
    await backdateSoftDelete(user.id, 45)

    const results = await runHardDeleteJob(true)
    const mine = results.find(r => r.userId === user.id)
    expect(mine).toBeDefined()
    expect(mine!.dryRun).toBe(true)
    expect(mine!.skipped).toBe(false)

    // still there — dry run must not touch anything
    const stillThere = await prisma.user.findUnique({ where: { id: user.id } })
    expect(stillThere).not.toBeNull()
  })
})

describe('runHardDeleteJob — real run', () => {
  it('actually deletes the user past the grace period', async () => {
    const user = await createTestUser({ email: 'realdelete@test.com' })
    await backdateSoftDelete(user.id, 45)

    await runHardDeleteJob(false)

    const gone = await prisma.user.findUnique({ where: { id: user.id } })
    expect(gone).toBeNull()
  })

  it('nulls Report.reportedUserId instead of blocking the delete (non-cascading FK)', async () => {
    const reporter = await createTestUser({ email: 'reporter@test.com' })
    const reported = await createTestUser({ email: 'reported@test.com' })
    const report = await prisma.report.create({
      data: { reporterUserId: reporter.id, reportedUserId: reported.id, reason: 'FAKE_PROFILE', status: 'PENDING' }
    })

    await backdateSoftDelete(reported.id, 45)
    await runHardDeleteJob(false)

    const gone = await prisma.user.findUnique({ where: { id: reported.id } })
    expect(gone).toBeNull()

    // the report itself must survive, just anonymised
    const survivingReport = await prisma.report.findUnique({ where: { id: report.id } })
    expect(survivingReport).not.toBeNull()
    expect(survivingReport!.reportedUserId).toBeNull()
  })

  it('skips (does not delete) a user who has performed an admin action', async () => {
    const admin = await createTestUser({ email: 'admin-history@test.com', adminRole: 'ADMIN' })
    await prisma.adminAction.create({
      data: { adminId: admin.id, targetType: 'user', targetId: 'someone', action: 'TEST_ACTION' }
    })
    await backdateSoftDelete(admin.id, 45)

    const results = await runHardDeleteJob(false)
    const mine = results.find(r => r.userId === admin.id)
    expect(mine?.skipped).toBe(true)

    // still there — must NOT have been deleted
    const stillThere = await prisma.user.findUnique({ where: { id: admin.id } })
    expect(stillThere).not.toBeNull()
  })

  it('is idempotent — running twice does not error on an already-deleted user', async () => {
    const user = await createTestUser({ email: 'idempotent@test.com' })
    await backdateSoftDelete(user.id, 45)

    await runHardDeleteJob(false)
    // second run should simply find nothing eligible for this user, not throw
    await expect(runHardDeleteJob(false)).resolves.toBeDefined()
  })
})
