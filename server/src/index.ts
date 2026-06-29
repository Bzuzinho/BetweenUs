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
const ALLOWED_ORIGINS = [
  CLIENT_URL,
  'https://betweenus-production.up.railway.app',
  'http://localhost:3000',
  'http://localhost:4173'
]

export const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true }
})

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(compression())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true)
    else callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// ⚠️ Stripe webhook needs raw body — must be BEFORE express.json()
import webhooksRouter from './routes/webhooks'
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { error: 'Too many requests.' }
})
app.use('/api', limiter)

app.get('/health', (_, res) => {
  res.json({
    status: 'ok', app: 'Between Us API', version: '1.0.0',
    sprints: ['0.1','1.1','2.1','2.2','2.4','3.1','3.2',
              '3.3','4.1','5.1','5.2','5.3','5.4','6.1','7.1','7.1b','8.1','8.2','8.4','9.1'],
    beta: process.env.BETA_CLOSED === 'true' ? 'closed' : 'open',
    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'test-mode',
    timestamp: new Date().toISOString()
  })
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
import betaRouter from './routes/beta'
import checkinRouter from './routes/checkin'

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
app.use('/api/beta', betaRouter)
app.use('/api/checkin', checkinRouter)

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
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno. Tenta novamente.' : err.message
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log('[SERVER] Between Us API v1.0.0')
  console.log('[SERVER] Stripe:', process.env.STRIPE_SECRET_KEY ? '✅ Live' : '⚠️ Test mode')
})

export default app
