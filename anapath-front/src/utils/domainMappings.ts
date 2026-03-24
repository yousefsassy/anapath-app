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
  registered: 'Enregistré',
  in_progress: 'En cours',
  completed: 'Validé',
  Pending: 'Enregistré',
  'In Progress': 'En cours',
  Completed: 'Validé',
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

/** Display-only: returns "Homme" or "Femme" regardless of the stored format. */
export function displaySexFrench(value: string): string {
  const s = String(value).trim().toUpperCase()
  if (s === 'M' || s === 'MALE') return 'Homme'
  if (s === 'F' || s === 'FEMALE') return 'Femme'
  return value
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
