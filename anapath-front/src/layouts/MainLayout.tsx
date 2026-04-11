import { Menu } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Accueil',
  archive: 'Archives',
  patients: 'Patients',
  exams: 'Prélèvements',
  templates: 'Modèles',
  settings: 'Paramètres',
}

export function MainLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const currentSection = useMemo(() => {
    const firstSegment = location.pathname.split('/').filter(Boolean)[0]
    return SECTION_LABELS[firstSegment] ?? 'Anapath'
  }, [location.pathname])

  return (
    <div className={`app-shell${isSidebarOpen ? ' app-shell--sidebar-open' : ''}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isSidebarOpen ? (
        <button
          type="button"
          className="app-shell-overlay"
          aria-label="Fermer la navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-leading">
            <button
              type="button"
              className="app-topbar-menu"
              aria-label="Ouvrir la navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            <div className="app-topbar-context">
              <span className="app-topbar-eyebrow">Plateforme laboratoire</span>
              <strong>{currentSection}</strong>
            </div>
          </div>

          <div className="app-topbar-session">
            <span className="app-topbar-session-label">Session active</span>
            <strong>{user?.full_name ?? user?.email ?? 'Médecin'}</strong>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
