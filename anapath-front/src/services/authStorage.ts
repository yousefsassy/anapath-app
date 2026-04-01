export const AUTH_STORAGE_KEY = 'anapath_auth_user'

export function clearLegacyAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
