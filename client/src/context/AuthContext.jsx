import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
      return res.data
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    // Point 6: always attempt /auth/me — the httpOnly accessToken cookie
    // may be the only thing carrying the session (no localStorage entry),
    // so we can't gate this on localStorage existing anymore.
    fetchUser().finally(() => setLoading(false))
  }, [fetchUser])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    // localStorage kept only as a transitional fallback — cookies are primary
    if (res.data.accessToken) localStorage.setItem('accessToken', res.data.accessToken)
    if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken)
    setUser(res.data.user)
    await fetchUser()
    return res.data
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    if (res.data.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      setUser(res.data.user)
    }
    return res.data
  }

  const refreshUser = async () => {
    return await fetchUser()
  }

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
