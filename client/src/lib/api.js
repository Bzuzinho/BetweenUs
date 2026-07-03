import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
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
