export interface AuthUser {
  id: number
  laboratory_id: number
  email: string
  role: string
  token: string
}

export interface LoginPayload {
  email: string
  password: string
}
