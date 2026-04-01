import type { AuthUser, LoginPayload } from '../types/auth'
import { ApiClientError, apiClient } from './apiClient'
import { clearLegacyAuthStorage } from './authStorage'

export const authService = {
  login: async ({ email, password }: LoginPayload): Promise<AuthUser> => {
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Adresse e-mail et mot de passe obligatoires.')
    }

    const user = await apiClient.post<AuthUser>(
      '/auth/login',
      {
        email: cleanEmail,
        password: cleanPassword,
      },
      { skipAuth: true },
    )

    clearLegacyAuthStorage()
    return user
  },

  logout: async () => {
    try {
      await apiClient.post<null>('/auth/logout', undefined, { skipAuth: true })
    } finally {
      clearLegacyAuthStorage()
    }
  },

  getSession: async (): Promise<AuthUser | null> => {
    clearLegacyAuthStorage()

    try {
      return await apiClient.get<AuthUser>('/auth/session', { skipAuth: true })
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        return null
      }

      throw error
    }
  },
}
