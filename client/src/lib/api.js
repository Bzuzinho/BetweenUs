import axios from 'axios'
import { reconnectSocketWithToken, disconnectSocket } from './socket'

const baseURL = import.meta.env.VITE_API_URL || '/api'

// BETA.2.5 — no timeout was configured at all before this: if a request
// hangs server-side (a route handler that never reaches res.json() for a
// specific malformed row, a stuck query, a dropped connection with no
// server-side response), the returned promise never settles, AuthContext's
// `loading` state never flips to false, and the UI shows a permanent
// spinner (or, on PublicRoute before this same fix, a blank screen) with
// no way out short of a hard refresh. This is a generic safety net (per
// the explicit instruction: timeout as safety net, not as the root-cause
// fix) — it does not address WHY a specific request might hang, only
// guarantees no request can hang the UI forever.
const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000
})

// Primary: localStorage (Safari ITP safe)
const getToken = () => localStorage.getItem('accessToken')

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => { if (error) p.reject(error); else p.resolve(token) })
  failedQueue = []
}

const clearSession = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  // Security follow-up — a dead session must also drop the socket
  // connection, not leave it retrying with a token we just discarded.
  disconnectSocket()
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    const status = err.response?.status

    // Don't retry refresh calls or non-401s
    if (status !== 401 || original._retry) return Promise.reject(err)

    // If already on a public page, just clear and reject silently
    const onPublicPage = ['/login', '/register', '/join', '/reset-password', '/forgot-password', '/verify-email']
      .some(p => window.location.pathname.startsWith(p))

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(tok => {
        original.headers.Authorization = `Bearer ${tok}`
        return api(original)
      }).catch(e => Promise.reject(e))
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        clearSession()
        if (!onPublicPage) window.location.href = '/login'
        return Promise.reject(err)
      }

      const res = await axios.post(
        `${baseURL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      )

      const { accessToken, refreshToken: newRT } = res.data
      localStorage.setItem('accessToken', accessToken)
      if (newRT) localStorage.setItem('refreshToken', newRT)
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
      // Security follow-up — a socket created with the OLD token (or one
      // that connect_error already gave up on) needs to pick up the new
      // one; otherwise it stays disconnected until a full page reload.
      reconnectSocketWithToken()
      processQueue(null, accessToken)
      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch {
      processQueue(null, null)
      clearSession()
      // Only hard-redirect if user is in the app (not on public pages)
      if (!onPublicPage) window.location.href = '/login'
      // Return a clean rejection without the ugly "Token inválido" message
      return Promise.reject({ response: { status: 401, data: {} } })
    } finally {
      isRefreshing = false
    }
  }
)

export default api
