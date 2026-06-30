import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
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
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true }
})

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }))
app.use(compression())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    if (isProd) { console.warn('[CORS] Blocked:', origin); return callback(new Error('Not allowed by CORS')) }
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

import webhooksRouter from './routes/webhooks'
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true })
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' } })

app.use('/api', globalLimiter)
app.use('/api/auth/login', strictLimiter)
app.use('/api/auth/register', strictLimiter)
app.use('/api/auth/password', strictLimiter)

app.get('/health', (_, res) => {
  res.json({ status: 'ok', app: 'Between Us API', version: '2.1.0',
    environment: process.env.NODE_ENV, timestamp: new Date().toISOString() })
})

import authRouter from './routes/auth'
import profileRouter from './routes/profiles'
import discoveryRouter from './routes/discovery'
import matchRouter from './routes/matches'
import privacyRouter from './routes/privacy'
import reportsRouter from './routes/reports'
import adminRouter from './routes/admin'
import subscriptionsRouter from './routes/subscriptions'
import couplesRouter from './routes/couples'
import photosRouter from './routes/photos'
import contactsRouter from './routes/contacts'
import verificationsRouter from './routes/verifications'
import travelRouter from './routes/travel'
import consentRouter from './routes/consent'
import safetyRouter from './routes/safety'
import betaRouter from './routes/beta'

app.use('/api/auth', authRouter)
app.use('/api/profiles', profileRouter)
app.use('/api/discovery', discoveryRouter)
app.use('/api/matches', matchRouter)
app.use('/api/privacy', privacyRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/couples', couplesRouter)
app.use('/api/photos', photosRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/verifications', verificationsRouter)
app.use('/api/travel', travelRouter)
app.use('/api/consent', consentRouter)
app.use('/api/safety', safetyRouter)
app.use('/api/beta', betaRouter)

if (!isProd) {
  app.get('/debug-info', (_req, res) => res.json({ env: process.env.NODE_ENV }))
}

io.on('connection', (socket) => {
  console.log('[WS] Connected:', socket.id)
  socket.on('join_conversation', (id: string) => socket.join('conversation:' + id))
  socket.on('leave_conversation', (id: string) => socket.leave('conversation:' + id))
  socket.on('typing', (data: any) => socket.to('conversation:' + data.conversationId).emit('typing', data))
  socket.on('disconnect', () => console.log('[WS] Disconnected:', socket.id))
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({ error: isProd ? 'Erro interno. Tenta novamente.' : err.message })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log('[SERVER] Between Us API v2.1.0 — beta routes active')
  console.log('[SERVER] Environment:', process.env.NODE_ENV)
})

export default app
