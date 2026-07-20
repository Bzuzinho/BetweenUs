import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { rateLimit } from 'express-rate-limit'
import dotenv from 'dotenv'
import { initSentry, Sentry } from './lib/sentry'
import { resolveSocketUserId } from './lib/socketAuth'
import prisma from './lib/prisma'
import { isShadowModeEnabled, isIntelligentRecommendationsEnabled } from './lib/recommendationAbTestService'
import { HEURISTIC_MODEL_VERSION } from './lib/heuristicRecommendationRanker'

dotenv.config()

const app = express()
const httpServer = createServer(app)

app.set('trust proxy', 1)

initSentry(app)
app.use(Sentry.Handlers.requestHandler())

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '')
const isProd = process.env.NODE_ENV === 'production'

const ALLOWED_ORIGINS = isProd
  ? [CLIENT_URL, 'https://betweenus-production.up.railway.app'].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:4173', CLIENT_URL]

export const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET','POST'], credentials: true }
})
import('./lib/socketRegistry').then(({ setIo }) => setIo(io))

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
app.use('/api/auth/login', strictLimiter)
app.use('/api/auth/register', strictLimiter)
app.use('/api/auth/password', strictLimiter)

app.get('/health', (_, res) => res.json({
  status: 'ok', app: 'Between Us API', version: '2.6.0',
  environment: process.env.NODE_ENV, timestamp: new Date().toISOString(),
  sentry: !!process.env.SENTRY_DSN,
}))

app.get('/health/email', (_req, res) => {
  const hasSendgrid = !!process.env.SENDGRID_API_KEY
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  const provider: 'sendgrid' | 'smtp' | 'unknown' = hasSendgrid ? 'sendgrid' : hasSmtp ? 'smtp' : 'unknown'
  const fromConfigured = !!process.env.EMAIL_FROM
  const credentialsConfigured = hasSendgrid || hasSmtp
  const status: 'configured' | 'missing' | 'error' =
    provider === 'unknown' ? 'missing' : (credentialsConfigured && fromConfigured) ? 'configured' : 'error'

  res.json({
    status,
    provider,
    checks: { fromConfigured, credentialsConfigured },
  })
})

app.get('/health/recommendations', async (_req, res) => {
  const shadowModeEnabled = isShadowModeEnabled()
  const intelligentRecommendationsEnabled = isIntelligentRecommendationsEnabled()
  const retentionDays = Number(process.env.RECOMMENDATION_LOG_RETENTION_DAYS || 90)

  try {
    const logTableReachable = await (prisma as any).recommendationRankingLog.count().then(() => true).catch(() => false)
    res.json({
      status: 'ok',
      shadowModeEnabled,
      intelligentRecommendationsEnabled,
      modelVersion: HEURISTIC_MODEL_VERSION,
      logTableReachable,
      retentionDays,
      productionRecommendedConfig: { shadowModeEnabled: true, intelligentRecommendationsEnabled: false },
    })
  } catch (err: any) {
    console.error('[HEALTH/RECOMMENDATIONS]', err.message)
    res.json({ status: 'error', message: isProd ? 'Erro interno.' : err.message, shadowModeEnabled, intelligentRecommendationsEnabled })
  }
})

import authRouter from './routes/auth'
import profileRouter from './routes/profiles'
import discoveryRouter from './routes/discovery'
import matchRouter from './routes/matches'
import privacyRouter from './routes/privacy'
import reportsRouter from './routes/reports'
import adminOperationalOverridesRouter from './routes/adminOperationalOverrides'
import adminRouter from './routes/admin'
import subscriptionsRouter from './routes/subscriptions'
import couplesRouter from './routes/couples'
import photosRouter from './routes/photos'
import contactsRouter from './routes/contacts'
import verificationsRouter from './routes/verifications'
import travelRouter from './routes/travel'
import consentRouter from './routes/consent'
import safetyRouter from './routes/safety'
import roomsRouter from './routes/rooms'
import pushRouter from './routes/push'
import guideRouter from './routes/guide'
import betaRouter from './routes/beta'
import notificationsRouter from './routes/notifications'
import catalogRouter from './routes/catalog'
import groupsRouter from './routes/groups'
import referralsRouter from './routes/referrals'
import legalRouter from './routes/legal'
import privateInterestsRouter from './routes/privateInterests'
import agreementsRouter from './routes/agreements'
import eventsRouter from './routes/events'
import circlesRouter from './routes/circles'
import recommendationsRouter from './routes/recommendations'
import locationsRouter from './routes/locations'

app.use('/api/auth', authRouter)
app.use('/api/profiles', profileRouter)
app.use('/api/discovery', discoveryRouter)
app.use('/api/matches', matchRouter)
app.use('/api/privacy', privacyRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/admin', adminOperationalOverridesRouter)
app.use('/api/admin', adminRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/couples', couplesRouter)
app.use('/api/photos', photosRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/verifications', verificationsRouter)
app.use('/api/travel', travelRouter)
app.use('/api/consent', consentRouter)
app.use('/api/safety', safetyRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/push', pushRouter)
app.use('/api/guide', guideRouter)
app.use('/api/beta', betaRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/catalog', catalogRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/referrals', referralsRouter)
app.use('/api/legal', legalRouter)
app.use('/api/private-interests', privateInterestsRouter)
app.use('/api/agreements', agreementsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/circles', circlesRouter)
app.use('/api/admin/recommendations', recommendationsRouter)
app.use('/api/locations', locationsRouter)

io.use((socket, next) => {
  try {
    ;(socket.data as any).userId = resolveSocketUserId(socket.handshake)
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', socket => {
  const userId = (socket.data as any).userId as string

  socket.on('join_conversation', async (id: string) => {
    const { resolveConversationMembership } = await import('./lib/conversationAuthorizationService')
    const auth = await resolveConversationMembership(id, userId)
    if (!auth.ok) return socket.emit('room:error', { conversationId: id, error: auth.reason })
    socket.join('conversation:' + id)
  })
  socket.on('leave_conversation', (id: string) => socket.leave('conversation:' + id))
  socket.on('typing', async (data: any) => {
    const { resolveConversationMembership } = await import('./lib/conversationAuthorizationService')
    const auth = await resolveConversationMembership(data?.conversationId, userId)
    if (!auth.ok) return
    socket.to('conversation:' + data.conversationId).emit('typing', data)
  })

  socket.on('room:join', async (roomId: string) => {
    const { resolveRoomMembership } = await import('./lib/roomAuthorizationService')
    const auth = await resolveRoomMembership(roomId, userId)
    if (!auth.ok) return socket.emit('room:error', { roomId, error: auth.reason })
    socket.join('room:' + roomId)
  })

  socket.on('room:leave', (roomId: string) => socket.leave('room:' + roomId))

  socket.on('message:send', async (payload: { roomId: string; body?: string; messageType?: string; mediaId?: string; ttl?: string }) => {
    const { sendRoomMessage } = await import('./lib/roomMessageService')
    const result = await sendRoomMessage(payload.roomId, userId, payload)
    if (!result.ok) return socket.emit('room:error', { roomId: payload.roomId, error: result.error })
    io.to('room:' + payload.roomId).emit('message:created', result.message)
  })

  socket.on('message:delete', async (payload: { roomId: string; messageId: string }) => {
    const { deleteRoomMessage } = await import('./lib/roomMessageService')
    const result = await deleteRoomMessage(payload.roomId, payload.messageId, userId)
    if (!result.ok) return socket.emit('room:error', { roomId: payload.roomId, error: result.error })
    io.to('room:' + payload.roomId).emit('message:delete', { messageId: payload.messageId })
  })

  socket.on('typing:start', async (roomId: string) => {
    const { resolveRoomMembership } = await import('./lib/roomAuthorizationService')
    const auth = await resolveRoomMembership(roomId, userId)
    if (!auth.ok) return
    socket.to('room:' + roomId).emit('typing:start', { roomId, userId })
  })
  socket.on('typing:stop', async (roomId: string) => {
    const { resolveRoomMembership } = await import('./lib/roomAuthorizationService')
    const auth = await resolveRoomMembership(roomId, userId)
    if (!auth.ok) return
    socket.to('room:' + roomId).emit('typing:stop', { roomId, userId })
  })

  socket.on('rules:approval', async (payload: { roomId: string; action: 'accept' | 'revoke' }) => {
    const { acceptRuleSet, revokeRuleAcceptance } = await import('./lib/roomRuleService')
    const { resolveRoomMembership } = await import('./lib/roomAuthorizationService')
    const auth = await resolveRoomMembership(payload.roomId, userId)
    if (!auth.ok) return socket.emit('room:error', { roomId: payload.roomId, error: auth.reason })
    const result = payload.action === 'revoke'
      ? await revokeRuleAcceptance(payload.roomId, userId)
      : await acceptRuleSet(payload.roomId, userId)
    if (!result.ok) return socket.emit('room:error', { roomId: payload.roomId, error: result.error })
    io.to('room:' + payload.roomId).emit('consent:updated', { roomId: payload.roomId, roomStatus: result.roomStatus })
    if (result.roomStatus === 'ACTIVE') io.to('room:' + payload.roomId).emit('room:status', { roomId: payload.roomId, status: 'ACTIVE' })
  })
})

app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' })
})

app.use(Sentry.Handlers.errorHandler())

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({ error: isProd ? 'Erro interno.' : err.message })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log('[SERVER] Between Us API v2.5.0 — port', PORT)
  console.log('[SERVER] Environment:', process.env.NODE_ENV)
  if (isProd && !process.env.SMTP_PASS) console.warn('[WARN] SMTP_PASS not set — emails will not send')
  import('./jobs/safetyCheckinJobs').then(({ startSafetyCheckinJobs }) => startSafetyCheckinJobs())
  import('./jobs/cleanupExpiredMessages').then(({ startRoomMessageCleanupCron }) => startRoomMessageCleanupCron())
  import('./jobs/expireConsentChecks').then(({ startExpireConsentChecksCron }) => startExpireConsentChecksCron())
  import('./jobs/recommendationLogCleanupJob').then(({ startRecommendationLogCleanupCron }) => startRecommendationLogCleanupCron())
})

export default app
