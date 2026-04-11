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
  phone: string | null
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

export type ReportRevisionReason = 'save' | 'validation' | 'restore'

export interface ReportRevisionSummary {
  id: number
  created_at: string
  snapshot_reason: ReportRevisionReason
  actor_user_id: number | null
  actor_full_name: string | null
}

export interface ReportRevisionDetail extends ReportRevisionSummary, Report {
  exam_id: number
  report_id: number
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
  urgent: boolean
  created_at: string
  updated_at: string
  // Joined fields from exam list endpoint
  patient_first_name?: string
  patient_last_name?: string
}

export interface NewPatientInput {
  first_name: string
  last_name: string
  age: number
  sex: SexDisplay
  phone: string
  birth_date: string
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
  urgent: boolean
}

export type ReportInput = Report

export interface ExamWorkspaceData {
  exam: Exam
  report: ReportInput
}

export interface ReportSummary {
  conclusion: string
  updated_at: string
}

export interface ExamWithReportSummary extends Exam {
  report_summary: ReportSummary | null
}

export type CaseArchiveMatchedSection =
  | 'clinical_info'
  | 'macroscopy'
  | 'microscopy'
  | 'conclusion'
  | 'sample_nature'
  | 'exam_history'
  | 'diagnosis_keywords'

export type CaseArchiveMatchReason =
  | 'same_exam_type'
  | 'shared_keyword'

export type CaseArchiveSection =
  | 'all'
  | 'clinical_info'
  | 'macroscopy'
  | 'microscopy'
  | 'conclusion'

export interface CaseArchiveQuery {
  q?: string
  section?: CaseArchiveSection
  exam_type?: 'histology' | 'cytology'
  date_from?: string
  date_to?: string
  source_exam_id?: number | string
  limit?: number
}

export interface CaseArchiveResult {
  exam_id: number
  exam_number: string
  exam_type: ExamType
  sample_nature: string
  result_issued_date: string | null
  patient_age: number
  patient_sex: SexBackend
  diagnosis_keywords: string[]
  status: Extract<ExamStatus, 'completed' | 'in_progress' | 'registered'>
  matched_section: CaseArchiveMatchedSection | null
  matched_excerpt: string | null
  conclusion_preview: string | null
  match_reasons?: CaseArchiveMatchReason[]
}

export interface CaseArchivePreview {
  exam: Exam
  report: ReportInput
}

export interface ReportTemplate {
  id: number
  laboratory_id: number
  name: string
  clinical_info: string
  macroscopy: string
  microscopy: string
  conclusion: string
  created_at: string
  updated_at: string
}

export interface PrintSettings {
  sectionSpacing: 'compact' | 'normal' | 'spacious'
  labelStyle: 'underline-bold' | 'bold' | 'normal'
  conclusionStyle: 'boxed' | 'plain'
  fontSize: 'small' | 'normal' | 'large'
}

export const defaultPrintSettings: PrintSettings = {
  sectionSpacing: 'normal',
  labelStyle: 'underline-bold',
  conclusionStyle: 'boxed',
  fontSize: 'normal',
}

export interface LabSettings {
  doctorName: string
  doctorTitle: string  // newline-separated lines (title, affiliation, etc.)
  doctorPhone: string
  doctorEmail: string
  labName: string
  labAddress: string   // newline-separated lines
  labPhone: string
}

export interface ExamStats {
  registered_count: number
  in_progress_count: number
  completed_this_month: number
}

export const defaultLabSettings: LabSettings = {
  doctorName: 'DOCTEUR SAMIA HANNACHI SASSI',
  doctorTitle: 'Ancienne Assistante Hospitalo-Universitaire\nInstitut Salah Azaiez',
  doctorPhone: '(+216) 98 315 221 - (+216) 24 315 221',
  doctorEmail: 'anapath.labo@gmail.com',
  labName: "LABORATOIRE D'ANATOMIE ET CYTOLOGIE PATHOLOGIQUES",
  labAddress: 'Immeuble Nour City, Bloc A, 2ème étage Appt. A2-1,\nCentre Urbain Nord, 1003 Tunis',
  labPhone: '(+216) 36 28 28 61',
}
