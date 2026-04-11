import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="page-header-kicker">Navigation</span>
        <h1>Page introuvable</h1>
        <p>Cette adresse n'existe pas ou a été déplacée.</p>
        <Link to="/dashboard" className="button">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  )
}
