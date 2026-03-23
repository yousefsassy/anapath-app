import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/patients', label: 'Patients' },
  { to: '/patients/new', label: 'New Patient' },
]

export function MainLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <h2>Anapath</h2>
          <p>Anatomopathology Lab</p>
        </div>

        <nav className="nav-menu">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Connected: {user?.email ?? 'Doctor'}</p>
          <button className="button secondary" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </aside>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
