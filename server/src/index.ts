import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { rateLimit } from 'express-rate-limit'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'
const isProd = process.env.NODE_ENV === 'production'

const ALLOWED_ORIGINS = isProd
  ? [CLIENT_URL, 'https://betweenus-production.up.railway.app'].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:4173', CLIENT_URL]

export const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET','POST'], credentials: true }
})

// 3.8: real CSP + hardened headers. API is JSON-only (no HTML views), so we
// lock content sources down hard; CSP_REPORT_ONLY lets ops flip to audit mode
// without a redeploy if something unexpected breaks in production.
const cspReportOnly = process.env.CSP_REPORT_ONLY === 'true'
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    reportOnly: cspReportOnly,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    }
  },
  hsts: isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginOpenerPolicy: { policy: 'same-origin' }
}))
app.use(compression())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    if (isProd) { console.warn('[CORS] Blocked:', origin); return cb(new Error('Not allowed by CORS')) }
    cb(null, true)
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}))

import webhooksRouter from './routes/webhooks'
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true })
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiadas tentativas. Tenta em 15 minutos.' } })

app.use('/api', globalLimiter)
app.use('/api/auth/login',    strictLimiter)
app.use('/api/auth/register', strictLimiter)
app.use('/api/auth/password', strictLimiter)

app.get('/health', (_, res) => res.json({
  status: 'ok', app: 'Between Us API', version: '2.5.1',
  environment: process.env.NODE_ENV, timestamp: new Date().toISOString()
}))

// Email diagnostic endpoint — for debugging SMTP config
app.get('/health/email', async (req, res) => {
  const config = {
    SMTP_HOST:  process.env.SMTP_HOST  || null,
    SMTP_PORT:  process.env.SMTP_PORT  || '465',
    SMTP_USER:  process.env.SMTP_USER  || 'resend',
    SMTP_PASS:  process.env.SMTP_PASS  ? `set (${process.env.SMTP_PASS.slice(0,8)}…)` : null,
    EMAIL_FROM: process.env.EMAIL_FROM || null,
    CLIENT_URL: process.env.CLIENT_URL || null,
  }

  const missing = Object.entries(config).filter(([,v]) => !v).map(([k]) => k)

  if (missing.length > 0) {
    return res.json({
      status: 'misconfigured',
      missing,
      config,
      fix: 'Set missing variables in Railway → Service → Variables'
    })
  }

  // Try to connect
  try {
    const nodemailer = require('nodemailer')
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER || 'resend', pass: process.env.SMTP_PASS },
    })
    await t.verify()
    res.json({ status: 'ok', message: 'SMTP connection verified ✅', config })
  } catch (err: any) {
    res.json({ status: 'error', message: err.message, config,
      hint: 'Check Resend dashboard → API Keys → SMTP credentials' })
  }
})

import authRouter          from './routes/auth'
import profileRouter       from './routes/profiles'
import discoveryRouter     from './routes/discovery'
import matchRouter         from './routes/matches'
import privacyRouter       from './routes/privacy'
import reportsRouter       from './routes/reports'
import adminRouter         from './routes/admin'
import subscriptionsRouter from './routes/subscriptions'
import couplesRouter       from './routes/couples'
import photosRouter        from './routes/photos'
import contactsRouter      from './routes/contacts'
import verificationsRouter from './routes/verifications'
import travelRouter        from './routes/travel'
import consentRouter       from './routes/consent'
import safetyRouter        from './routes/safety'
import roomsRouter          from './routes/rooms'
import pushRouter           from './routes/push'
import guideRouter          from './routes/guide'
import betaRouter          from './routes/beta'
import notificationsRouter  from './routes/notifications'
import catalogRouter         from './routes/catalog'
import groupsRouter           from './routes/groups'
import referralsRouter        from './routes/referrals'

app.use('/api/auth',          authRouter)
app.use('/api/profiles',      profileRouter)
app.use('/api/discovery',     discoveryRouter)
app.use('/api/matches',       matchRouter)
app.use('/api/privacy',       privacyRouter)
app.use('/api/reports',       reportsRouter)
app.use('/api/admin',         adminRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/couples',       couplesRouter)
app.use('/api/photos',        photosRouter)
app.use('/api/contacts',      contactsRouter)
app.use('/api/verifications', verificationsRouter)
app.use('/api/travel',        travelRouter)
app.use('/api/consent',       consentRouter)
app.use('/api/safety',        safetyRouter)
app.use('/api/rooms',          roomsRouter)
app.use('/api/push',           pushRouter)
app.use('/api/guide',          guideRouter)
app.use('/api/beta',          betaRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/catalog',       catalogRouter)
app.use('/api/groups',        groupsRouter)
app.use('/api/referrals',     referralsRouter)

io.on('connection', socket => {
  socket.on('join_conversation',  (id: string) => socket.join('conversation:' + id))
  socket.on('leave_conversation', (id: string) => socket.leave('conversation:' + id))
  socket.on('typing', (data: any) => socket.to('conversation:' + data.conversationId).emit('typing', data))
  socket.on('join_room',  (id: string) => socket.join('room:' + id))
  socket.on('leave_room', (id: string) => socket.leave('room:' + id))
})

// 3.8: explicit JSON 404 instead of Express's default text/html fallback
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' })
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({ error: isProd ? 'Erro interno.' : err.message })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log('[SERVER] Between Us API v2.5.0 — port', PORT)
  console.log('[SERVER] Environment:', process.env.NODE_ENV)
  if (isProd && !process.env.SMTP_PASS) console.warn('[WARN] SMTP_PASS not set — emails will not send')
  import('./lib/safetyAlertCron').then(({ startSafetyAlertCron }) => startSafetyAlertCron())
})

export default app
