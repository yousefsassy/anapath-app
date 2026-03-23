export type SexBackend = 'M' | 'F'

export type SexDisplay = 'Male' | 'Female'

export type Sex = SexBackend | SexDisplay

export type ExamType = 'cytology' | 'histology' | string

export type ExamStatus =
  | 'registered'
  | 'in_progress'
  | 'completed'
  | 'Pending'
  | 'In Progress'
  | 'Completed'

export interface Patient {
  id: number | string
  laboratory_id: number
  first_name: string
  last_name: string
  age: number
  sex: SexBackend | SexDisplay
  phone: string
  birth_date: string | null
  general_history: string
  created_at: string
  updated_at: string
}

export interface Report {
  clinical_info: string
  macroscopy: string
  microscopy: string
  conclusion: string
}

export interface Exam {
  id: number | string
  laboratory_id: number
  patient_id: number | string
  exam_type: ExamType
  exam_number: string
  clinic_name: string
  requesting_doctor: string
  requested_date: string | null
  registered_date: string
  result_issued_date: string | null
  sample_nature: string
  exam_history: string
  diagnosis_keywords: string[] | string
  status: ExamStatus
  report?: Report
  created_at: string
  updated_at: string
}

export interface NewPatientInput {
  first_name: string
  last_name: string
  age: number
  sex: SexDisplay
  phone: string
  birth_date: string | null
  general_history: string
}

export interface NewExamInput {
  patient_id: number | string
  exam_type: ExamType
  clinic_name: string
  requesting_doctor: string
  requested_date: string
  registered_date: string
  result_issued_date: string
  sample_nature: string
  exam_history: string
  diagnosis_keywords: string
  status: ExamStatus
}

export type ReportInput = Report
