export interface AuthUser {
  id: number
  laboratory_id: number
  email: string
  role: string
  full_name: string | null
}

export interface LoginPayload {
  email: string
  password: string
}
