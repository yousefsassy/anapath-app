import type { AuthUser, LoginPayload } from '../types/auth'
import { apiClient } from './apiClient'
import { AUTH_STORAGE_KEY, getStoredAuthUser } from './authStorage'

interface LoginResponse {
  id: number
  laboratory_id: number
  email: string
  role: string
  token: string
}

export const authService = {
  login: async ({ email, password }: LoginPayload): Promise<AuthUser> => {
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please provide email and password.')
    }

    const user = await apiClient.post<LoginResponse>(
      '/auth/login',
      {
        email: cleanEmail,
        password: cleanPassword,
      },
      { skipAuth: true },
    )

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))

    return user
  },

  logout: async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  },

  getCurrentUser: (): AuthUser | null => {
    return getStoredAuthUser()
  },
}
