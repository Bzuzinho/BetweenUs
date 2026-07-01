import jwt from 'jsonwebtoken'

const isProd = process.env.NODE_ENV === 'production'

// T12: fail hard in production — dev fallbacks are insecure
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (isProd && !secret) throw new Error('JWT_SECRET is required in production')
  return secret || 'dev-secret-change-in-production'
}

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET
  if (isProd && !secret) throw new Error('JWT_REFRESH_SECRET is required in production')
  return secret || 'dev-refresh-secret-change-in-production'
}

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, getJwtSecret(), {
    // T12: 15 minutes for access token — not 7 days
    expiresIn: '15m'
  })
  const refreshToken = jwt.sign({ userId }, getRefreshSecret(), {
    expiresIn: '30d'
  })
  return { accessToken, refreshToken }
}

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, getJwtSecret()) as { userId: string }
}

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, getRefreshSecret()) as { userId: string }
}
