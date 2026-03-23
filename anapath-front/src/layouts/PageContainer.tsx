import type { ReactNode } from 'react'

type PageContainerWidth = 'narrow' | 'default' | 'wide'

interface PageContainerProps {
  children: ReactNode
  maxWidth?: PageContainerWidth
}

export function PageContainer({ children, maxWidth = 'default' }: PageContainerProps) {
  return <div className={`page-container page-container--${maxWidth}`}>{children}</div>
}
