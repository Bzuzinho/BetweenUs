import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { verifyAccessToken } from '../utils/jwt'

export interface AuthRequest extends Request {
  userId?: string
  user?: {
    id: string
    email: string
    status: string
    adminRole: string | null
    emailVerifiedAt: Date | null
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  // Point 6: also accept token from httpOnly cookie (transitional — supports both)
  const cookieToken = (req as any).cookies?.accessToken
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : cookieToken

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Security follow-up — was directly reading process.env.JWT_SECRET
    // here, duplicating the secret-resolution logic already centralized
    // in utils/jwt.ts (which also has the dev-fallback + prod-required
    // guard). Functionally identical today, but two independent readers
    // of the same secret is exactly the kind of drift that makes a
    // rotation harder to reason about — now there is one source of truth
    // for "how do we verify an access token".
    const payload = verifyAccessToken(token)

    // Point 15: load adminRole + emailVerifiedAt + status in one query
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, status: true,
        adminRole: true, emailVerifiedAt: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    // Point 15: also block SUSPENDED, not just BANNED/DELETED
    if (user.status === 'BANNED' || user.status === 'DELETED' || user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: user.status === 'SUSPENDED'
          ? 'A tua conta está temporariamente suspensa.'
          : 'Esta conta foi banida.',
        code: `ACCOUNT_${user.status}`
      })
    }

    req.userId = user.id
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export const requirePremium = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.userId! }
  })

  if (!subscription || subscription.plan === 'FREE') {
    return res.status(403).json({ error: 'Premium subscription required' })
  }

  next()
}
