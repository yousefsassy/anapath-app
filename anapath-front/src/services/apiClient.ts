import { getStoredAuthUser } from './authStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface ApiSuccessResponse<T> {
  success: true
  message?: string
  data: T
}

interface ApiErrorResponse {
  success: false
  message?: string
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }

  const { skipAuth = false, headers, ...restOptions } = options
  const authUser = getStoredAuthUser()

  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  })

  if (!skipAuth && authUser?.token) {
    requestHeaders.set('Authorization', `Bearer ${authUser.token}`)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  })

  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || !payload.success) {
    const message = payload.success ? 'Request failed' : payload.message || 'Request failed'
    throw new Error(message)
  }

  return payload.data
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, options),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
}
