import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/navigation'

export function MainLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
