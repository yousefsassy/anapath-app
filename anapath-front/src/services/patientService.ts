import type { Exam, ExamWithReportSummary, NewPatientInput, Patient } from '../types/domain'
import { ApiClientError, apiClient } from './apiClient'
import { mapSexDisplayToBackend } from '../utils/domainMappings'

export interface UpdatePatientInput {
  first_name: string
  last_name: string
  age: number
  sex: 'Male' | 'Female'
  phone: string
  general_history: string
}

interface PatientExamsResponse {
  patient: Patient
  exams: Exam[]
  count: number
}

interface PatientExamsWithSummaryResponse {
  patient: Patient
  exams: ExamWithReportSummary[]
  count: number
}

export const patientService = {
  list: async (): Promise<Patient[]> => {
    return apiClient.get<Patient[]>('/patients')
  },

  getById: async (id: number | string): Promise<Patient | null> => {
    try {
      return await apiClient.get<Patient>(`/patients/${id}`)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null
      }
      throw error
    }
  },

  getExamsByPatientId: async (id: number | string): Promise<Exam[]> => {
    const response = await apiClient.get<PatientExamsResponse>(`/patients/${id}/exams`)
    return response.exams
  },

  getExamsWithReportSummary: async (id: number | string): Promise<ExamWithReportSummary[]> => {
    const response = await apiClient.get<PatientExamsWithSummaryResponse>(
      `/patients/${id}/exams?include=report_summary`
    )
    return response.exams
  },

  create: async (payload: NewPatientInput): Promise<Patient> => {
    return apiClient.post<Patient>('/patients', {
      ...payload,
      sex: mapSexDisplayToBackend(payload.sex),
    })
  },

  search: async (firstName: string, lastName: string, phone = ''): Promise<Patient[]> => {
    const params = new URLSearchParams({ first_name: firstName, last_name: lastName })
    if (phone.trim()) params.set('phone', phone.trim())
    try {
      return await apiClient.get<Patient[]>(`/patients/search?${params.toString()}`)
    } catch {
      return [] // fail open — never block creation due to a search error
    }
  },

  update: async (id: number | string, payload: UpdatePatientInput): Promise<Patient | null> => {
    try {
      return await apiClient.put<Patient>(`/patients/${id}`, {
        first_name: payload.first_name,
        last_name: payload.last_name,
        age: Number(payload.age),
        sex: mapSexDisplayToBackend(payload.sex),
        phone: payload.phone,
        general_history: payload.general_history,
      })
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null
      }
      throw error
    }
  },
}
