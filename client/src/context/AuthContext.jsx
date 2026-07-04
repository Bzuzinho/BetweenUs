import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import { registerPush } from '../lib/push'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  const fetchUser = useCallback(async () => {
    // Guard: only fetch once per mount to avoid refresh loops
    try {
      const token = localStorage.getItem('accessToken')
      // No token at all — skip the API call, go straight to unauthenticated
      if (!token) {
        setUser(null)
        return null
      }
      const res = await api.get('/auth/me')
      setUser(res.data)
      return res.data
    } catch {
      // Token invalid or expired and refresh failed — clear state
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchUser().finally(() => setLoading(false))
  }, [fetchUser])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    if (res.data.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
    }
    // Fetch full user object (includes profile, subscription, adminRole)
    const me = await api.get('/auth/me')
    setUser(me.data)
    return me.data
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    if (res.data.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken)
      if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken)
      setUser(res.data.user)
    }
    return res.data
  }

  const refreshUser = async () => fetchUser()

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
