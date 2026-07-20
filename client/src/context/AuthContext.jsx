import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import { reconnectSocketWithToken, disconnectSocket } from '../lib/socket'
import { useI18n } from '../i18n/I18nContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { setLanguage } = useI18n()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  const applyUser = useCallback(async nextUser => {
    let resolvedUser = nextUser
    try {
      const languageResponse = await api.get('/push/language')
      const preferredLanguage = languageResponse.data?.preferredLanguage || 'pt-PT'
      setLanguage(preferredLanguage)
      resolvedUser = { ...nextUser, preferredLanguage }
    } catch {
      if (nextUser?.preferredLanguage) setLanguage(nextUser.preferredLanguage)
    }
    setUser(resolvedUser)
    return resolvedUser
  }, [setLanguage])

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setUser(null)
        return null
      }
      const response = await api.get('/auth/me')
      return applyUser(response.data)
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      return null
    }
  }, [applyUser])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchUser().finally(() => setLoading(false))
  }, [fetchUser])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      reconnectSocketWithToken()
    }
    const me = await api.get('/auth/me')
    return applyUser(me.data)
  }

  const register = async data => {
    const response = await api.post('/auth/register', data)
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken)
      if (response.data.refreshToken) localStorage.setItem('refreshToken', response.data.refreshToken)
      reconnectSocketWithToken()
      if (data.preferredLanguage) {
        await api.put('/push/language', { preferredLanguage:data.preferredLanguage }).catch(() => {})
      }
      await applyUser({ ...response.data.user, preferredLanguage:data.preferredLanguage })
    }
    return response.data
  }

  const refreshUser = async () => fetchUser()

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    disconnectSocket()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
