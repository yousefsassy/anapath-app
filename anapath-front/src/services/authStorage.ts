import type { AuthUser } from '../types/auth'

export const AUTH_STORAGE_KEY = 'anapath_auth_user'

export function getStoredAuthUser(): AuthUser | null {
  const rawUser = localStorage.getItem(AUTH_STORAGE_KEY)
  return rawUser ? (JSON.parse(rawUser) as AuthUser) : null
}
