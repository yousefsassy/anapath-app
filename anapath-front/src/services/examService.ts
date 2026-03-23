import type { Exam, ExamStatus, NewExamInput, ReportInput } from '../types/domain'
import { apiClient } from './apiClient'
import { authService } from './authService'
import { mapExamStatusToBackend } from '../utils/domainMappings'

interface CreateExamPayload {
  laboratory_id: number
  patient_id: number
  exam_type: string
  clinic_name: string
  requesting_doctor: string
  requested_date: string | null
  registered_date: string | null
  result_issued_date: string | null
  sample_nature: string
  exam_history: string
  diagnosis_keywords: string[]
  status: 'registered' | 'in_progress' | 'completed'
}

interface UpdateExamPayload {
  exam_type?: string
  clinic_name?: string
  requesting_doctor?: string
  requested_date?: string | null
  registered_date?: string | null
  result_issued_date?: string | null
  sample_nature?: string
  exam_history?: string
  diagnosis_keywords?: string[]
  status?: 'registered' | 'in_progress' | 'completed'
}

export interface UpdateExamInput {
  exam_type: string
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

const toNullableDate = (value: string) => (value.trim() ? value : null)

const toDiagnosisKeywordsArray = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

function toReportInput(value: Partial<ReportInput> | null | undefined): ReportInput {
  return {
    clinical_info: value?.clinical_info ?? '',
    macroscopy: value?.macroscopy ?? '',
    microscopy: value?.microscopy ?? '',
    conclusion: value?.conclusion ?? '',
  }
}

export const examService = {
  list: async (): Promise<Exam[]> => {
    return apiClient.get<Exam[]>('/exams')
  },

  listByPatientId: async (patientId: number | string): Promise<Exam[]> => {
    const response = await apiClient.get<{ patient: unknown; exams: Exam[]; count: number }>(
      `/patients/${patientId}/exams`,
    )
    return response.exams
  },

  getById: async (id: number | string): Promise<Exam | null> => {
    try {
      return await apiClient.get<Exam>(`/exams/${id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('not found')) {
        return null
      }
      throw error
    }
  },

  create: async (payload: NewExamInput): Promise<Exam> => {
    const authUser = authService.getCurrentUser()

    if (!authUser) {
      throw new Error('Authentication required')
    }

    const requestBody: CreateExamPayload = {
      laboratory_id: authUser.laboratory_id,
      patient_id: Number(payload.patient_id),
      exam_type: payload.exam_type,
      clinic_name: payload.clinic_name,
      requesting_doctor: payload.requesting_doctor,
      requested_date: toNullableDate(payload.requested_date),
      registered_date: toNullableDate(payload.registered_date),
      result_issued_date: toNullableDate(payload.result_issued_date),
      sample_nature: payload.sample_nature,
      exam_history: payload.exam_history,
      diagnosis_keywords: toDiagnosisKeywordsArray(payload.diagnosis_keywords),
      status: mapExamStatusToBackend(payload.status),
    }

    return apiClient.post<Exam>('/exams', requestBody)
  },

  update: async (id: number | string, payload: UpdateExamInput): Promise<Exam | null> => {
    try {
      const requestBody: UpdateExamPayload = {
        exam_type: payload.exam_type,
        clinic_name: payload.clinic_name,
        requesting_doctor: payload.requesting_doctor,
        requested_date: toNullableDate(payload.requested_date),
        registered_date: toNullableDate(payload.registered_date),
        result_issued_date: toNullableDate(payload.result_issued_date),
        sample_nature: payload.sample_nature,
        exam_history: payload.exam_history,
        diagnosis_keywords: toDiagnosisKeywordsArray(payload.diagnosis_keywords),
        status: mapExamStatusToBackend(payload.status),
      }

      return await apiClient.put<Exam>(`/exams/${id}`, requestBody)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('not found')) {
        return null
      }
      throw error
    }
  },

  updateReport: async (id: number | string, report: ReportInput): Promise<Exam | null> => {
    try {
      await apiClient.put<ReportInput>(`/reports/${id}`, report)
      return await examService.getById(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('not found')) {
        return null
      }
      throw error
    }
  },

  getReportByExamId: async (id: number | string): Promise<ReportInput | null> => {
    try {
      const response = await apiClient.get<Partial<ReportInput>>(`/reports/${id}`)
      return toReportInput(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('not found')) {
        return null
      }
      throw error
    }
  },

  saveReportByExamId: async (id: number | string, report: ReportInput): Promise<ReportInput | null> => {
    try {
      const response = await apiClient.put<Partial<ReportInput>>(`/reports/${id}`, report)
      return toReportInput(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('not found')) {
        return null
      }
      throw error
    }
  },
}
