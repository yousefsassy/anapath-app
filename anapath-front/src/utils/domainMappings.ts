import type { ExamStatus, SexBackend, SexDisplay } from '../types/domain'

const sexDisplayToBackendMap: Record<SexDisplay, SexBackend> = {
  Male: 'M',
  Female: 'F',
}

const sexBackendToDisplayMap: Record<SexBackend, SexDisplay> = {
  M: 'Male',
  F: 'Female',
}

const examStatusLabelMap: Record<ExamStatus, string> = {
  registered: 'Registered',
  in_progress: 'In Progress',
  completed: 'Completed',
  Pending: 'Pending',
  'In Progress': 'In Progress',
  Completed: 'Completed',
}

export function mapSexDisplayToBackend(value: SexDisplay): SexBackend {
  return sexDisplayToBackendMap[value]
}

export function mapSexBackendToDisplay(value: SexBackend | SexDisplay): SexDisplay {
  if (value === 'Male' || value === 'Female') {
    return value
  }

  return sexBackendToDisplayMap[value]
}

export function getExamStatusLabel(status: ExamStatus): string {
  return examStatusLabelMap[status] ?? status
}

export function mapExamStatusToBackend(status: ExamStatus): 'registered' | 'in_progress' | 'completed' {
  if (status === 'Pending') {
    return 'registered'
  }

  if (status === 'In Progress') {
    return 'in_progress'
  }

  if (status === 'Completed') {
    return 'completed'
  }

  return status
}
