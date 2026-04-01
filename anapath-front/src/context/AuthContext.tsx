import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services/authService'
import type { AuthUser, LoginPayload } from '../types/auth'
import { clearLegacyAuthStorage } from '../services/authStorage'
import { registerUnauthorizedHandler } from '../services/apiClient'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isChecking: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true
    clearLegacyAuthStorage()

    const unregisterUnauthorizedHandler = registerUnauthorizedHandler(() => {
      if (!isMounted) return
      setUser(null)
      setIsChecking(false)
    })

    const loadSession = async () => {
      setIsChecking(true)

      try {
        const sessionUser = await authService.getSession()
        if (!isMounted) return
        setUser(sessionUser)
      } catch {
        if (!isMounted) return
        setUser(null)
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    void loadSession()

    return () => {
      isMounted = false
      unregisterUnauthorizedHandler()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isChecking,
      login: async (payload) => {
        const loggedInUser = await authService.login(payload)
        setUser(loggedInUser)
        setIsChecking(false)
      },
      logout: async () => {
        await authService.logout()
        setUser(null)
        setIsChecking(false)
      },
    }),
    [isChecking, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
