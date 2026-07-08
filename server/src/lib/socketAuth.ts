// Security follow-up — extracted from index.ts's io.use() so the socket
// handshake auth logic is a plain, testable function instead of only
// existing as an inline closure never reachable outside a live socket.io
// connection. Same JWT verification (and therefore same rotation
// behavior) as requireAuth for HTTP: a token signed with an old/rotated
// JWT_SECRET fails verifyAccessToken here exactly the same way.
import { verifyAccessToken } from '../utils/jwt'

interface MinimalHandshake {
  auth?: { token?: string }
  headers: { authorization?: string }
}

// Throws on any failure (missing token, expired, wrong signature —
// including a token signed with a rotated-out JWT_SECRET). Callers decide
// how to surface that as a socket.io `next(new Error(...))` rejection.
export const resolveSocketUserId = (handshake: MinimalHandshake): string => {
  const token = handshake.auth?.token || (handshake.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) throw new Error('Unauthorized')
  const payload = verifyAccessToken(token)
  return payload.userId
}
