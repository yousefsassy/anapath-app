import { Archive, BookOpen, ClipboardList, LayoutDashboard, Settings, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NavItem } from './NavItem'

const navigation = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/archive', label: 'Archives', icon: Archive },
  { to: '/patients', label: 'Patients', icon: ClipboardList },
  { to: '/templates', label: 'Modèles', icon: BookOpen },
  { to: '/settings', label: 'Paramètres', icon: Settings },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const onLogout = async () => {
    await logout()
    onClose?.()
    navigate('/login')
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-head">
        <div className="brand-block">
          <span className="brand-block-kicker">Anatomopathologie</span>
          <h2>Anapath</h2>
          <p>Plateforme clinique de gestion des prélèvements et comptes rendus.</p>
        </div>

        <button
          type="button"
          className="sidebar-close"
          aria-label="Fermer la navigation"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <nav className="nav-menu" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            onNavigate={onClose}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-session-card">
          <span className="sidebar-session-label">Connecté</span>
          <strong>{user?.full_name ?? 'Médecin'}</strong>
          <p>{user?.email ?? 'Session laboratoire'}</p>
        </div>

        <button className="button secondary sidebar-logout-button" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
