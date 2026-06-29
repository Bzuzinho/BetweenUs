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

// Strict whitelist in production
const ALLOWED_ORIGINS = isProd
  ? [CLIENT_URL, 'https://betweenus-production.up.railway.app'].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:4173', CLIENT_URL]

export const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true }
})

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // handled by frontend
}))
app.use(compression())
app.use(cors({
  origin: (origin, callback) => {
    // Block unknown origins in production
    if (!origin) return callback(null, true) // allow same-origin requests
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    if (isProd) {
      console.warn('[CORS] Blocked origin:', origin)
      return callback(new Error('Not allowed by CORS'))
    }
    callback(null, true) // permissive in dev
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// ⚠️ Stripe webhook needs raw body — BEFORE express.json()
import webhooksRouter from './routes/webhooks'
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { error: 'Demasiados pedidos. Tenta novamente em 15 minutos.' },
  standardHeaders: true, legacyHeaders: false
})
app.use('/api', globalLimiter)

// Strict rate limit for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' }
})
app.use('/api/auth/login', strictLimiter)
app.use('/api/auth/register', strictLimiter)
app.use('/api/auth/password', strictLimiter)

app.get('/health', (_, res) => {
  res.json({
    status: 'ok', app: 'Between Us API', version: '2.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
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

// Debug — only in development
if (!isProd) {
  app.get('/debug', (_req, res) => {
    res.json({ message: 'Debug mode — not available in production', env: process.env.NODE_ENV })
  })
}

// ─── WebSockets ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[WS] Connected:', socket.id)
  socket.on('join_conversation', (id: string) => socket.join('conversation:' + id))
  socket.on('leave_conversation', (id: string) => socket.leave('conversation:' + id))
  socket.on('typing', (data: any) =>
    socket.to('conversation:' + data.conversationId).emit('typing', data))
  socket.on('disconnect', () => console.log('[WS] Disconnected:', socket.id))
})

app.use((err: any, _req: express.Request, res: express.Response,
         _next: express.NextFunction) => {
  // Never leak stack traces in production
  if (isProd) {
    console.error('[ERROR]', err.message)
    return res.status(err.status || 500).json({ error: 'Erro interno. Tenta novamente.' })
  }
  console.error('[ERROR]', err)
  res.status(err.status || 500).json({ error: err.message })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log('[SERVER] Between Us API v2.0.0')
  console.log('[SERVER] Environment:', process.env.NODE_ENV)
  console.log('[SERVER] CORS whitelist:', ALLOWED_ORIGINS)
})

export default app
