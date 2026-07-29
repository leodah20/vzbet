import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearToken,
  getToken,
  setToken as persistToken,
  setUnauthorizedHandler,
} from '../api/client'
import { decodeJwtPayload } from '../lib/jwt'
import type { AuthUser } from '../types/api'

type SessionUser = Pick<AuthUser, 'id' | 'role'>

interface AuthContextValue {
  user: SessionUser | null
  login: (accessToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function userFromToken(token: string): SessionUser {
  const payload = decodeJwtPayload(token)
  return { id: payload.sub, role: payload.role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const token = getToken()
    return token ? userFromToken(token) : null
  })

  const logout = () => {
    clearToken()
    setUser(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [])

  const login = (accessToken: string) => {
    persistToken(accessToken)
    setUser(userFromToken(accessToken))
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
