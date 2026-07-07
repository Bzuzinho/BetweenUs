// 7.8 — single shared Socket.IO client connection, authenticated the same
// way every HTTP request already is (accessToken from localStorage). The
// server's io.use() handshake middleware rejects any connection without a
// valid token — see server/src/index.ts.
import { io } from 'socket.io-client'

const apiUrl = import.meta.env.VITE_API_URL || '/api'
// VITE_API_URL points at .../api — Socket.IO needs the bare origin, not
// the REST path prefix. When apiUrl is relative ('/api', dev proxy), fall
// back to the page's own origin.
const socketUrl = apiUrl.startsWith('http')
  ? apiUrl.replace(/\/api\/?$/, '')
  : window.location.origin

let socket = null

export const getSocket = () => {
  if (socket) return socket
  const token = localStorage.getItem('accessToken')
  socket = io(socketUrl, {
    auth: { token },
    autoConnect: !!token,
    transports: ['websocket', 'polling'],
  })
  return socket
}

// Call after login/refresh so a socket created before the token existed
// (or with a now-stale token) reconnects with the current one.
export const reconnectSocketWithToken = () => {
  const token = localStorage.getItem('accessToken')
  if (!socket) return getSocket()
  socket.auth = { token }
  if (token && !socket.connected) socket.connect()
  return socket
}

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
}
