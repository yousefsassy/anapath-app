import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface NavItemProps {
  to: string
  label: string
  icon: LucideIcon
}

export function NavItem({ to, label, icon: Icon }: NavItemProps) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}
