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

export interface ReportSummary {
  conclusion: string
  updated_at: string
}

export interface ExamWithReportSummary extends Exam {
  report_summary: ReportSummary | null
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

export const defaultLabSettings: LabSettings = {
  doctorName: 'DOCTEUR SAMIA HANNACHI SASSI',
  doctorTitle: 'Ancienne Assistante Hospitalo-Universitaire\nInstitut Salah Azaiez',
  doctorPhone: '(+216) 98 315 221 - (+216) 24 315 221',
  doctorEmail: 'anapath.labo@gmail.com',
  labName: "LABORATOIRE D'ANATOMIE ET CYTOLOGIE PATHOLOGIQUES",
  labAddress: 'Immeuble Nour City, Bloc A, 2ème étage Appt. A2-1,\nCentre Urbain Nord, 1003 Tunis',
  labPhone: '(+216) 36 28 28 61',
}
