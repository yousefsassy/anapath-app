import type { UpdateExamInput } from '../../services/examService'
import type { CaseArchiveSection, Exam, ReportInput } from '../../types/domain'
import { mapExamStatusToBackend } from '../../utils/domainMappings'

export function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

function toDiagnosisKeywordsString(value: Exam['diagnosis_keywords']): string {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

function toDiagnosisKeywordsArray(value: Exam['diagnosis_keywords']): string[] {
  if (Array.isArray(value)) {
    return value
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  }

  return String(value ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function toArchiveSearchToken(value: string): string {
  const sanitized = value.replace(/"/g, ' ').trim()
  if (!sanitized) return ''
  return sanitized.includes(' ') ? `"${sanitized}"` : sanitized
}

const ARCHIVE_CONTEXT_STOP_WORDS = new Set([
  'avec',
  'chez',
  'dans',
  'des',
  'du',
  'elle',
  'elles',
  'entre',
  'est',
  'les',
  'leur',
  'leurs',
  'mais',
  'meme',
  'nous',
  'notre',
  'par',
  'pas',
  'pour',
  'que',
  'qui',
  'sans',
  'ses',
  'sur',
  'une',
  'vous',
])

function tokenizeArchiveContext(value: string | null | undefined, maxTerms: number): string[] {
  if (!value) return []

  return [...new Set(
    value
      .toLowerCase()
      .split(/[^A-Za-zÀ-ÿ0-9]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 4 && !ARCHIVE_CONTEXT_STOP_WORDS.has(term))
  )].slice(0, maxTerms)
}

export function buildArchiveContextQuery(exam: Exam): string {
  const diagnosisKeywords = toDiagnosisKeywordsArray(exam.diagnosis_keywords)
    .flatMap((keyword) => tokenizeArchiveContext(keyword, 2))

  const sampleNatureTerms = tokenizeArchiveContext(exam.sample_nature, 2)
  const historyTerms = tokenizeArchiveContext(exam.exam_history, 1)

  return [...new Set([
    ...diagnosisKeywords,
    ...sampleNatureTerms,
    ...historyTerms,
  ])]
    .slice(0, 4)
    .map(toArchiveSearchToken)
    .join(' ')
}

export function toExamEditForm(exam: Exam): UpdateExamInput {
  return {
    exam_type: exam.exam_type,
    clinic_name: exam.clinic_name ?? '',
    requesting_doctor: exam.requesting_doctor ?? '',
    requested_date: toDateInputValue(exam.requested_date),
    registered_date: toDateInputValue(exam.registered_date),
    result_issued_date: toDateInputValue(exam.result_issued_date),
    sample_nature: exam.sample_nature ?? '',
    exam_history: exam.exam_history ?? '',
    diagnosis_keywords: toDiagnosisKeywordsString(exam.diagnosis_keywords),
    status: mapExamStatusToBackend(exam.status),
    urgent: exam.urgent ?? false,
  }
}

export const emptyReport: ReportInput = {
  clinical_info: '',
  macroscopy: '',
  microscopy: '',
  conclusion: '',
}

export const emptyExamForm: UpdateExamInput = {
  exam_type: 'histology',
  clinic_name: '',
  requesting_doctor: '',
  requested_date: '',
  registered_date: '',
  result_issued_date: '',
  sample_nature: '',
  exam_history: '',
  diagnosis_keywords: '',
  status: 'registered',
  urgent: false,
}

export const STATUS_NEXT: Record<string, { label: string; next: 'in_progress' | 'completed' }> = {
  registered: { label: 'Mettre en cours', next: 'in_progress' },
  in_progress: { label: 'Valider', next: 'completed' },
}

export const ARCHIVE_SECTION_OPTIONS: { value: CaseArchiveSection; label: string }[] = [
  { value: 'all', label: 'Toutes sections' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'microscopy', label: 'Microscopie' },
  { value: 'macroscopy', label: 'Macroscopie' },
  { value: 'clinical_info', label: 'RC' },
]

export const SIMILAR_CASES_CONTEXT_HINT =
  "Ajoutez une nature du prélèvement, un mot-clé diagnostique ou un renseignement clinique pour obtenir des cas similaires."
