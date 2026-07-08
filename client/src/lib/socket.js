// 7.8 — single shared Socket.IO client connection, authenticated the same
// way every HTTP request already is (accessToken from localStorage). The
// server's io.use() handshake middleware rejects any connection without a
// valid token — see server/src/index.ts.
//
// Security follow-up (JWT rotation) — socket.io-client's default
// reconnection behavior retries indefinitely using whatever `socket.auth`
// currently holds. Before this fix, nothing ever updated `socket.auth`
// after the initial connection and nothing ever reacted to a
// 'connect_error', so an access token that goes bad mid-session (normal
// 15-minute expiry, or — the case that matters right now — a token
// signed with a rotated-out JWT_SECRET) caused an infinite reconnect loop
// hammering the server with the same rejected token forever. Two changes
// close this:
//   1. connect_error handling below stops automatic reconnection once a
//      handshake is rejected with the token currently in use, instead of
//      retrying with the same doomed token forever.
//   2. reconnectSocketWithToken() is now actually called (see api.js's
//      interceptor and AuthContext's login()) whenever a fresh access
//      token becomes available, which re-enables reconnection with the
//      new token.
import { io } from 'socket.io-client'

const apiUrl = import.meta.env.VITE_API_URL || '/api'
// VITE_API_URL points at .../api — Socket.IO needs the bare origin, not
// the REST path prefix. When apiUrl is relative ('/api', dev proxy), fall
// back to the page's own origin.
const socketUrl = apiUrl.startsWith('http')
  ? apiUrl.replace(/\/api\/?$/, '')
  : window.location.origin

let socket = null
// Tracks the token that was rejected, so we only stop retrying once (and
// so a DIFFERENT (fresher) token showing up later is still worth trying).
let lastRejectedToken = null

const wireAuthFailureHandling = (s) => {
  s.on('connect_error', (err) => {
    if (err?.message !== 'Unauthorized') return // not an auth issue — let default reconnection behavior handle it (network blip, etc.)

    const attemptedToken = s.auth?.token || null
    if (attemptedToken && attemptedToken === lastRejectedToken) return // already stopped for this exact token
    lastRejectedToken = attemptedToken

    // Stop hammering the server with a token that is known-bad. This does
    // NOT log the user out by itself — the axios interceptor (api.js) is
    // the single source of truth for "the session is dead, clear state
    // and redirect to /login". This just stops the socket-specific retry
    // storm; reconnectSocketWithToken() re-arms reconnection once (and
    // only if) a fresh token shows up.
    s.io.opts.reconnection = false
    s.disconnect()
  })
}

export const getSocket = () => {
  if (socket) return socket
  const token = localStorage.getItem('accessToken')
  socket = io(socketUrl, {
    auth: { token },
    autoConnect: !!token,
    transports: ['websocket', 'polling'],
  })
  wireAuthFailureHandling(socket)
  return socket
}

// Call after login/refresh so a socket created before the token existed
// (or with a now-stale token — expired naturally, or invalidated by a
// JWT_SECRET rotation) reconnects with the current one. Re-enables
// reconnection (in case connect_error had turned it off for the old
// token) before connecting.
export const reconnectSocketWithToken = () => {
  const token = localStorage.getItem('accessToken')
  if (!socket) return token ? getSocket() : null
  socket.auth = { token }
  if (!token) return socket
  lastRejectedToken = null
  socket.io.opts.reconnection = true
  if (!socket.connected) socket.connect()
  return socket
}

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
  lastRejectedToken = null
}
