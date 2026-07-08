// BETA.1.5/1.6 — Safety guards + seed-run bookkeeping for the beta
// scenario dataset. Every guard here fails CLOSED (throws/aborts) rather
// than falling back to a permissive default — this script can create ~40
// accounts with real passwords and touch nearly every table in the
// schema, so silence is never an acceptable failure mode.
import prisma from '../../src/lib/prisma'

export const BETA_SEED_NAME = 'beta-seed'
export const BETA_SEED_VERSION = 'beta-v1'

// BETA.1.7 — reserved email namespace. Every account this seed creates
// uses this domain; nothing else in the schema is allowed to. Used by
// the validator/cleanup as a defense-in-depth sanity check ALONGSIDE
// isTestAccount (never as a substitute for it — see BETA.1.2's explicit
// "não identificar contas de teste apenas pelo domínio do email").
export const BETA_SEED_EMAIL_DOMAIN = 'betweenus.test'

export class BetaSeedAbortError extends Error {}

// BETA.1.5 — printable-only summary of DATABASE_URL: host + db name, never
// the full URL (which carries the password). Falls back to a generic
// placeholder if the URL doesn't parse (never throws here — this is a
// diagnostic print, not a guard).
export const describeDatabaseTarget = (): string => {
  const raw = process.env.DATABASE_URL || ''
  try {
    const url = new URL(raw)
    return `${url.hostname}${url.pathname}`
  } catch {
    return '(DATABASE_URL não interpretável — não impresso por segurança)'
  }
}

// BETA.1.5 — the mandatory guard sequence, run before ANY write. Order
// matters: ENABLED is checked first (cheapest, most common "forgot the
// flag" case), then the production-specific extra bar, then the
// password requirement (needed by every phase that creates a User).
export const assertSeedAllowed = (): void => {
  if (process.env.BETA_SEED_ENABLED !== 'true') {
    throw new BetaSeedAbortError(
      'BETA_SEED_ENABLED não está definida como "true" — a abortar. Este script cria dezenas de contas e dados relacionados; a variável tem de ser definida explicitamente para correr.'
    )
  }
  if (process.env.NODE_ENV === 'production' && process.env.BETA_SEED_ALLOW_PRODUCTION !== 'true') {
    throw new BetaSeedAbortError(
      'NODE_ENV=production requer também BETA_SEED_ALLOW_PRODUCTION=true — a abortar.'
    )
  }
  if (!process.env.BETA_SEED_PASSWORD) {
    throw new BetaSeedAbortError(
      'BETA_SEED_PASSWORD não está definida — a abortar. Não existe fallback de password nesta seed, mesmo em desenvolvimento.'
    )
  }
}

// BETA.1.35 — cleanup's own, stricter guard: same base checks PLUS an
// explicit typed confirmation phrase when running in production, so a
// stray script re-run or CI misconfiguration cannot silently delete real
// test-account rows without a human having typed the confirmation.
export const assertCleanupAllowed = (): void => {
  assertSeedAllowed()
  if (process.env.NODE_ENV === 'production' && process.env.BETA_SEED_CLEANUP_CONFIRM !== 'DELETE_TEST_DATA') {
    throw new BetaSeedAbortError(
      'Em produção, o cleanup exige BETA_SEED_CLEANUP_CONFIRM=DELETE_TEST_DATA — a abortar.'
    )
  }
}

export const printSeedTargetBanner = (label: string): void => {
  console.log('─'.repeat(60))
  console.log(`${label}`)
  console.log(`  Seed version: ${BETA_SEED_VERSION}`)
  console.log(`  NODE_ENV:     ${process.env.NODE_ENV || '(unset)'}`)
  console.log(`  DB target:    ${describeDatabaseTarget()}`)
  console.log('─'.repeat(60))
}

// BETA.1.6 — one TestSeedRun row per invocation. `finishRun` is always
// called from a try/finally by the caller so a mid-run crash still leaves
// a FAILED row (never a permanently-stuck RUNNING one with no trace of
// what happened).
export const startRun = async (seedName: string) => {
  return (prisma as any).testSeedRun.create({
    data: { seedName, version: BETA_SEED_VERSION, status: 'RUNNING' }
  })
}

export const finishRun = async (
  runId: string,
  status: 'COMPLETED' | 'FAILED',
  recordCounts?: Record<string, number>,
  errorMessage?: string
) => {
  await (prisma as any).testSeedRun.update({
    where: { id: runId },
    data: { status, completedAt: new Date(), recordCounts: recordCounts || undefined, errorMessage: errorMessage || undefined }
  })
}
