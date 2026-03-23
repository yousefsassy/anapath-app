import { createContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services/authService'
import type { AuthUser, LoginPayload } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getCurrentUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (payload) => {
        const loggedInUser = await authService.login(payload)
        setUser(loggedInUser)
      },
      logout: async () => {
        await authService.logout()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
