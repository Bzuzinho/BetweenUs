// BETA.3 (Task 7) — npm run beta:gate
//
// Single go/no-go check before opening the closed beta to real users (or
// before any subsequent deploy while it's open). Every check below prints
// PASS/WARN/FAIL and a short reason — NEVER a secret value, only whether
// one is present. Exits non-zero if any hard FAIL is found so it can also
// be wired into CI as a gate, not just run by hand.
//
// This intentionally does NOT re-run the full Jest suite or hit a real
// database with destructive commands — `npm test` and `npm run
// db:seed:beta:validate` are separate, existing steps (see
// docs/product/CLOSED_BETA_GATE.md's validation checklist) that this
// script assumes are run alongside it, not instead of it.
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

type Status = 'PASS' | 'WARN' | 'FAIL'
interface CheckResult { name: string; status: Status; detail: string }

const results: CheckResult[] = []
const record = (name: string, status: Status, detail: string) => {
  results.push({ name, status, detail })
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌'
  console.log(`${icon} [${status}] ${name} — ${detail}`)
}

const root = path.resolve(__dirname, '..', '..') // server/

const run = (cmd: string): { ok: boolean; output: string } => {
  try {
    const output = execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
    return { ok: true, output }
  } catch (err: any) {
    return { ok: false, output: (err.stdout?.toString() || '') + (err.stderr?.toString() || err.message) }
  }
}

// ── 1. Prisma schema validity ───────────────────────────────────────────
{
  const r = run('npx prisma validate')
  record('prisma validate', r.ok ? 'PASS' : 'FAIL', r.ok ? 'schema.prisma is valid' : 'schema.prisma failed validation — see prisma validate output')
}

// ── 2. Prisma client generation ─────────────────────────────────────────
{
  const r = run('npx prisma generate')
  record('prisma generate', r.ok ? 'PASS' : 'FAIL', r.ok ? 'client generated' : 'failed to generate Prisma client')
}

// ── 3. Backend typecheck ────────────────────────────────────────────────
{
  const r = run('npx tsc --noEmit')
  record('tsc --noEmit', r.ok ? 'PASS' : 'FAIL', r.ok ? 'no type errors' : 'type errors present — run `npm run typecheck` for details')
}

// ── 4. Start command no longer runs db push ─────────────────────────────
// Strips comment lines first — start.sh's own explanatory header
// deliberately mentions "db push"/"--accept-data-loss" in prose (why they
// were removed), which would otherwise false-positive this check against
// its own documentation.
{
  const stripBashComments = (src: string) => src.split('\n').filter(l => !l.trim().startsWith('#')).join('\n')
  const startSh = path.join(root, 'start.sh')
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const startScript = String(pkg.scripts?.start || '')
  const startShContent = fs.existsSync(startSh) ? stripBashComments(fs.readFileSync(startSh, 'utf8')) : ''
  const hasDbPush = /db\s+push/.test(startScript) || /db\s+push/.test(startShContent)
  const hasAcceptDataLoss = /accept-data-loss/.test(startScript) || /accept-data-loss/.test(startShContent)
  if (hasDbPush || hasAcceptDataLoss) {
    record('start command safety', 'FAIL', '`db push` (or --accept-data-loss) found in package.json start / start.sh — must not run automatically on boot')
  } else {
    record('start command safety', 'PASS', 'start.sh / npm start do not run prisma db push')
  }
}

// ── 5. Migration history exists ─────────────────────────────────────────
{
  const migrationsDir = path.join(root, 'prisma', 'migrations')
  const exists = fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).some(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
  record('migration history', exists ? 'PASS' : 'WARN', exists
    ? 'prisma/migrations/ has at least one migration'
    : 'no prisma/migrations/ found — run `npm run migrate:baseline` and follow docs/product/CLOSED_BETA_GATE.md before relying on db:deploy')
}

// ── 6. Health endpoint safety (static check — no live HTTP call) ────────
// Strips `//` comment lines first — the fix's own explanatory comment
// mentions SMTP_HOST/SMTP_PASS/EMAIL_FROM/CLIENT_URL in prose (describing
// what used to leak), which would otherwise false-positive this check
// against its own documentation. Only flags the actual dangerous shape:
// one of these env vars used as a response VALUE (`: process.env.X`) or
// sliced (the old `SMTP_PASS.slice(0,8)` partial-secret leak).
{
  const stripTsComments = (src: string) => src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
  const indexTs = fs.readFileSync(path.join(root, 'src', 'index.ts'), 'utf8')
  const emailBlockMatch = indexTs.match(/app\.get\('\/health\/email'[\s\S]*?\n\}\)/)
  const emailBlock = emailBlockMatch ? stripTsComments(emailBlockMatch[0]) : ''
  const leaksSecretLikeValue = /:\s*process\.env\.(SMTP_HOST|SMTP_USER|SMTP_PASS|EMAIL_FROM|CLIENT_URL)\b|SMTP_PASS[^,\n]*\.slice\(/.test(emailBlock)
  record('/health/email safety', leaksSecretLikeValue ? 'FAIL' : 'PASS', leaksSecretLikeValue
    ? '/health/email appears to echo raw config/secret values — see docs/product/CLOSED_BETA_GATE.md'
    : '/health/email returns booleans only, no config values')
}

// ── 7. Required environment variables (presence only, never printed) ───
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CONTACT_HASH_SECRET', 'CLIENT_URL']
for (const key of requiredEnvVars) {
  const present = !!process.env[key] && process.env[key] !== ''
  record(`env: ${key}`, present ? 'PASS' : 'FAIL', present ? 'set' : 'MISSING — required')
}

// ── 8. VAPID (push notifications) ───────────────────────────────────────
{
  const vapidOk = !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT
  record('env: VAPID_*', vapidOk ? 'PASS' : 'WARN', vapidOk ? 'set' : 'not fully configured — push notifications will not work, non-blocking for closed beta')
}

// ── 9. Email provider (SendGrid primary, SMTP fallback) ─────────────────
{
  const hasSendgrid = !!process.env.SENDGRID_API_KEY
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  record('env: email provider', (hasSendgrid || hasSmtp) ? 'PASS' : 'FAIL', hasSendgrid ? 'SendGrid configured' : hasSmtp ? 'SMTP fallback configured' : 'MISSING — no email provider configured, registration/verification/safety emails will not send')
}

// ── 10. Sentry ───────────────────────────────────────────────────────────
{
  const present = !!process.env.SENTRY_DSN
  record('env: SENTRY_DSN', present ? 'PASS' : 'WARN', present ? 'set' : 'not set — error monitoring disabled, non-blocking but strongly recommended for closed beta')
}

// ── 11. BETA_CLOSED ──────────────────────────────────────────────────────
{
  const isClosed = process.env.BETA_CLOSED === 'true'
  record('env: BETA_CLOSED', isClosed ? 'PASS' : 'FAIL', isClosed ? 'true — invite-only registration enforced' : 'not "true" — registration is OPEN to anyone, must be "true" for closed beta')
}

// ── 12. Structural seed present (Intentions/Boundaries) ─────────────────
{
  const seedPath = path.join(root, 'prisma', 'seed.ts')
  const seedExists = fs.existsSync(seedPath)
  record('structural seed script', seedExists ? 'PASS' : 'FAIL', seedExists ? 'prisma/seed.ts present — run `npm run db:seed` before opening beta if not already applied' : 'prisma/seed.ts missing')
}

// ── 13. Beta seed validator (only if BETA_SEED_ENABLED) ─────────────────
if (process.env.BETA_SEED_ENABLED === 'true') {
  const r = run('npx ts-node --transpile-only prisma/betaSeed/validate.ts')
  record('db:seed:beta:validate', r.ok ? 'PASS' : 'FAIL', r.ok ? 'beta seed data validated' : 'beta seed validation failed — see output above')
} else {
  record('db:seed:beta:validate', 'WARN', 'BETA_SEED_ENABLED not "true" — skipped (expected once real invite flow replaces seeded beta accounts)')
}

// ── Summary ───────────────────────────────────────────────────────────────
const fails = results.filter(r => r.status === 'FAIL')
const warns = results.filter(r => r.status === 'WARN')
console.log('\n' + '─'.repeat(60))
console.log(`beta:gate — ${results.length} checks, ${fails.length} FAIL, ${warns.length} WARN, ${results.length - fails.length - warns.length} PASS`)
console.log('─'.repeat(60))
if (fails.length > 0) {
  console.log('\nBLOCKING failures:')
  fails.forEach(f => console.log(`  - ${f.name}: ${f.detail}`))
  process.exit(1)
} else {
  console.log('\nNo blocking failures. Review WARN items before opening to real users.')
  process.exit(0)
}
