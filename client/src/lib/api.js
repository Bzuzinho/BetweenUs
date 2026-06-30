import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  // Point 6: send/receive httpOnly cookies cross-origin
  withCredentials: true
})

// Point 6: Authorization header is now a transitional fallback only.
// The backend issues httpOnly cookies on login/register/refresh, which the
// browser sends automatically (because of withCredentials above). We keep
// reading from localStorage here ONLY until every client is confirmed to be
// using the cookie flow, so existing sessions don't break mid-rollout.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        // Cookie-based refresh — refreshToken cookie is sent automatically
        const res = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
        // Keep localStorage in sync during the transitional period
        if (res.data.accessToken) localStorage.setItem('accessToken', res.data.accessToken)
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken)
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
