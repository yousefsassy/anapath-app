import { ClipboardList, LayoutDashboard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NavItem } from './NavItem'

const navigation = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: ClipboardList },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <h2>Anapath</h2>
        <p>Laboratoire d'Anatomopathologie</p>
      </div>

      <nav className="nav-menu" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Connecté : {user?.email ?? 'Médecin'}</p>
        <button className="button secondary" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
