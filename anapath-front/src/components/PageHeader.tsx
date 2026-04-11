import type { ReactNode } from 'react'
import { Breadcrumb } from './navigation'
import type { BreadcrumbItem } from './navigation'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function PageHeader({ title, subtitle, action, breadcrumbs = [] }: PageHeaderProps) {
  return (
    <div className="page-header page-section-header">
      <div className="page-header-content">
        {breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
        <span className="page-header-kicker">Espace de travail</span>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  )
}
