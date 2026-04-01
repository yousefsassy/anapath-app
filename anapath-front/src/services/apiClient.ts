const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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

let unauthorizedHandler: (() => void) | null = null

export class ApiClientError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

function getDefaultErrorMessage(status: number): string {
  if (status === 400) return 'Requête invalide.'
  if (status === 401) return 'Authentification requise.'
  if (status === 403) return 'Action non autorisée.'
  if (status === 404) return 'Ressource introuvable.'
  return 'Une erreur est survenue.'
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, headers, ...restOptions } = options

  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  })

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    credentials: 'include',
    headers: requestHeaders,
  })

  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    const status = response.ok ? 400 : response.status
    if (status === 401 && !skipAuth) {
      unauthorizedHandler?.()
    }
    const message =
      payload && !payload.success
        ? payload.message || getDefaultErrorMessage(status)
        : getDefaultErrorMessage(status)
    throw new ApiClientError(message, status)
  }

  return payload.data
}

export function registerUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null
    }
  }
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
