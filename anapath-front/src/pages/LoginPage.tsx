import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FORM_LIMITS } from '../utils/formLimits'

interface LocationState {
  from?: {
    pathname: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isChecking, login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isChecking) {
    return <p>Vérification de la session…</p>
  }

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
      const message = submissionError instanceof Error ? submissionError.message : 'Échec de la connexion.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Anapath</h1>
        <p>Connectez-vous avec votre adresse e-mail et votre mot de passe.</p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="medecin@anapath.local"
              autoComplete="email"
              maxLength={FORM_LIMITS.email}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={FORM_LIMITS.password}
            />
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </section>
  )
}
