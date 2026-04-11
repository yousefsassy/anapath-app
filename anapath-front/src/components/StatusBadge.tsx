import type { ExamStatus } from '../types/domain'
import { getExamStatusLabel } from '../utils/domainMappings'

interface StatusBadgeProps {
  status: ExamStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const className = status.toLowerCase().replace(/[_\s]+/g, '-')
  const label = getExamStatusLabel(status)

  return (
    <span className={`status-badge ${className}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
