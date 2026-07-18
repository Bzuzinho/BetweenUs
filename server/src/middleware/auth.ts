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

/**
 * Couple invitations are intentionally guarded here as a defence-in-depth
 * measure. The legacy join route is still mounted in routes/couples.ts, so
 * every authenticated call to it must satisfy the same product invariants:
 * the invited account owns an Individual Profile and uses the exact email
 * address the invitation was issued to.
 */
const enforceCoupleInviteJoinRules = async (req: AuthRequest, res: Response): Promise<boolean> => {
  const match = req.originalUrl.match(/^\/api\/couples\/join\/([^/?#]+)/)
  if (req.method !== 'POST' || !match) return true

  const token = decodeURIComponent(match[1])
  const couple = await prisma.coupleProfile.findUnique({
    where: { coupleInviteToken: token },
    select: {
      partnerOneUserId: true,
      partnerTwoInviteEmail: true,
      coupleStatus: true,
    }
  })

  if (!couple) {
    res.status(404).json({ error: 'Convite inválido ou expirado.', code: 'COUPLE_INVITE_INVALID' })
    return false
  }
  if (couple.coupleStatus === 'ACTIVE') {
    res.status(409).json({ error: 'Este convite já foi aceite.', code: 'COUPLE_INVITE_USED' })
    return false
  }
  if (couple.partnerOneUserId === req.userId) {
    res.status(400).json({ error: 'Não podes aceitar o teu próprio convite.', code: 'COUPLE_INVITE_SELF' })
    return false
  }

  const invitedEmail = couple.partnerTwoInviteEmail?.trim().toLowerCase()
  if (!invitedEmail || invitedEmail !== req.user!.email.trim().toLowerCase()) {
    res.status(403).json({
      error: 'Este convite está reservado para outro endereço de email.',
      code: 'COUPLE_INVITE_EMAIL_MISMATCH'
    })
    return false
  }

  const individualProfile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    select: { id: true, type: true, status: true }
  })
  if (!individualProfile || individualProfile.type !== 'INDIVIDUAL') {
    res.status(409).json({
      error: 'Antes de aceitares o convite tens de criar o teu perfil individual.',
      code: 'INDIVIDUAL_PROFILE_REQUIRED'
    })
    return false
  }

  return true
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

    if (!(await enforceCoupleInviteJoinRules(req, res))) return

    next()
  } catch (err: any) {
    console.error('[AUTH]', err?.message || err)
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