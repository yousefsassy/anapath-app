import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface LocationState {
  from?: {
    pathname: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const state = location.state as LocationState | null
  const nextRoute = state?.from?.pathname ?? '/dashboard'

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(form)
      navigate(nextRoute, { replace: true })
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Login failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Anapath Login</h1>
        <p>Use your backend email and password.</p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="doctor@anapath.local"
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="********"
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </section>
  )
}
