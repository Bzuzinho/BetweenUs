import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export interface AuthRequest extends Request {
  userId?: string
  user?: any
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, status: true }
    })

    if (!user || user.status === 'BANNED' || user.status === 'DELETED') {
      return res.status(401).json({ error: 'Unauthorized' })
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
