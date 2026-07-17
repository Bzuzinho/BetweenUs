import prisma from '../../src/lib/prisma'
import { captureSystemEvent } from '../../src/lib/reportEvidenceService'

const EXEMPT_REASONS = new Set(['FAKE_PROFILE', 'THREAT'])

async function main() {
  const reports = await prisma.report.findMany({
    where: {
      reporter: { isTestAccount: true },
      reported: { isTestAccount: true },
      reason: { notIn: Array.from(EXEMPT_REASONS) as any },
    },
    select: {
      id: true,
      reason: true,
      _count: { select: { evidence: true } },
    },
  })

  let repaired = 0
  for (const report of reports) {
    if (report._count.evidence > 0) continue
    await captureSystemEvent(report.id, 'BETA_SEED_EVIDENCE_REPAIR', {
      note: `Evidência sintética criada pelo beta seed para o cenário ${report.reason}.`,
      isTestData: true,
    })
    repaired++
  }

  console.log(`Beta report evidence repair: ${repaired} reparado(s)`)
}

main()
  .catch(err => {
    console.error('[BETA REPORT EVIDENCE REPAIR] Falhou:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
