// 3.8 Privacy Hardening: `vite preview` (the previous production start command)
// serves the built SPA with zero security headers — no CSP, no HSTS, no
// frame protection. This replaces it with a minimal static server that adds
// those headers while keeping the same SPA-fallback behaviour `vite preview`
// gave us. Kept dependency-light (express + helmet only) on purpose.
const path = require('path')
const express = require('express')
const helmet = require('helmet')

const app = express()
const isProd = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 4173
const DIST_DIR = path.join(__dirname, 'dist')

// API_ORIGIN should be the scheme+host of the backend (e.g.
// https://fearless-stillness-production-e5f6.up.railway.app), derived from
// VITE_API_URL at build/deploy time. Falls back to https: broadly so the app
// doesn't hard-break if it isn't set, but setting it is strongly recommended.
let apiOrigin = process.env.API_ORIGIN
if (!apiOrigin && process.env.VITE_API_URL) {
  try { apiOrigin = new URL(process.env.VITE_API_URL).origin } catch { /* ignore */ }
}
const connectSrc = apiOrigin
  ? ["'self'", apiOrigin, apiOrigin.replace(/^http/, 'ws')]
  : ["'self'", 'https:', 'wss:']

const cspReportOnly = process.env.CSP_REPORT_ONLY === 'true'
app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: cspReportOnly,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc,
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  },
  hsts: isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))

app.use(express.static(DIST_DIR, { index: false }))

// SPA fallback — everything not matched above returns index.html so
// react-router can handle client-side routes.
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.listen(PORT, () => {
  console.log('[CLIENT] Between Us static server — port', PORT)
  console.log('[CLIENT] CSP connect-src:', connectSrc.join(' '))
  if (!apiOrigin) console.warn('[CLIENT WARN] API_ORIGIN not set — CSP connect-src falls back to broad https:/wss:')
})
