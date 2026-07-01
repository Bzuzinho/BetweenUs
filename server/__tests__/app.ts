// Test-only Express app factory — does NOT call httpServer.listen()
// Import this in every test suite instead of importing src/index.ts

import express from 'express'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Disable rate limiting in tests
const noopLimiter = rateLimit({ windowMs: 1000, max: 10000 })
app.use('/api', noopLimiter)

import authRouter from '../src/routes/auth'
import profileRouter from '../src/routes/profiles'
import discoveryRouter from '../src/routes/discovery'
import matchRouter from '../src/routes/matches'
import adminRouter from '../src/routes/admin'
import couplesRouter from '../src/routes/couples'
import photosRouter from '../src/routes/photos'
import reportsRouter from '../src/routes/reports'
import consentRouter from '../src/routes/consent'
import betaRouter from '../src/routes/beta'
import subscriptionsRouter from '../src/routes/subscriptions'

app.use('/api/auth', authRouter)
app.use('/api/profiles', profileRouter)
app.use('/api/discovery', discoveryRouter)
app.use('/api/matches', matchRouter)
app.use('/api/admin', adminRouter)
app.use('/api/couples', couplesRouter)
app.use('/api/photos', photosRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/consent', consentRouter)
app.use('/api/beta', betaRouter)
app.use('/api/subscriptions', subscriptionsRouter)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ error: err.message })
})

export default app
