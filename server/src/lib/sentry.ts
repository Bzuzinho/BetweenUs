// 3.7 — Sentry error monitoring, with sanitization.
//
// Nothing in this project reported errors anywhere before this — 63+
// console.error() calls scattered across routes/lib, all going nowhere but
// stdout (Railway logs, which roll off and aren't searchable/alertable).
// This wires up Sentry for the ones that matter most to catch automatically
// (any unhandled route error, via the Express middleware in index.ts) plus
// a few high-value manual capture points (safety-alert cron, hard-delete
// job, Stripe webhooks) where a silent failure would be genuinely bad and
// console.error alone wouldn't get anyone's attention.
//
// No-ops entirely if SENTRY_DSN isn't set — this is intentionally NOT a
// hard requirement, unlike CONTACT_HASH_SECRET, because monitoring being
// absent degrades observability, not user safety or data confidentiality.
import * as Sentry from '@sentry/node'

const isConfigured = !!process.env.SENTRY_DSN

// Field names that must never leave the process, wherever they show up in
// an event: request bodies, extra context, breadcrumbs.
const SENSITIVE_KEYS = [
  'password', 'passwordhash', 'token', 'accesstoken', 'refreshtoken',
  'authorization', 'cookie', 'selfie', 'selfiestoragepath', 'contacthash',
  'contact_hash_secret', 'storage_secret_key', 'sendgrid_api_key', 'smtp_pass',
  'nif', 'datebirth', 'dateofbirth',
]

const redactDeep = (value: any, depth = 0): any => {
  if (depth > 6 || value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(v => redactDeep(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '')
      if (SENSITIVE_KEYS.some(k => normalizedKey.includes(k))) {
        out[key] = '[REDACTED]'
      } else {
        out[key] = redactDeep(val, depth + 1)
      }
    }
    return out
  }
  return value
}

export const initSentry = (app?: any) => {
  if (!isConfigured) {
    console.warn('[SENTRY] SENTRY_DSN not set — error monitoring disabled (console.error only)')
    return
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    // Belt-and-suspenders: Sentry's own default PII scrubbing catches most
    // of this already, but we redact explicitly rather than relying only
    // on defaults for a dataset this sensitive (identity/relationship app).
    beforeSend(event) {
      if (event.request) {
        if (event.request.data) event.request.data = redactDeep(event.request.data)
        if (event.request.headers) {
          const { authorization, cookie, Authorization, Cookie, ...safeHeaders } = event.request.headers as any
          event.request.headers = safeHeaders
        }
      }
      if (event.extra) event.extra = redactDeep(event.extra)
      if (event.contexts) event.contexts = redactDeep(event.contexts)
      // Never send email as PII in the user context — id only.
      if (event.user) event.user = { id: event.user.id }
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) breadcrumb.data = redactDeep(breadcrumb.data)
      return breadcrumb
    },
  })

  console.log('[SENTRY] Initialized (' + (process.env.NODE_ENV || 'development') + ')')
}

// Manual capture for the handful of spots that aren't inside an Express
// route (cron jobs, background jobs) and so never reach the Express error
// handler. Always also logs to console — Sentry being unconfigured must
// never mean an error goes completely unlogged.
export const captureError = (err: unknown, context?: Record<string, any>) => {
  console.error('[ERROR]', err instanceof Error ? err.message : err, context ? redactDeep(context) : '')
  if (!isConfigured) return
  Sentry.captureException(err, context ? { extra: redactDeep(context) } : undefined)
}

export { Sentry }
