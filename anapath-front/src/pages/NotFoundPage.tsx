import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Page Not Found</h1>
        <p>The route you requested does not exist.</p>
        <Link to="/dashboard" className="button">
          Go to Dashboard
        </Link>
      </div>
    </section>
  )
}
