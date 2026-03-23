import type { Exam, NewPatientInput, Patient } from '../types/domain'
import { apiClient } from './apiClient'
import { authService } from './authService'
import { mapSexDisplayToBackend } from '../utils/domainMappings'

interface PatientExamsResponse {
  patient: Patient
  exams: Exam[]
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
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('not found')) {
        return null
      }
      throw error
    }
  },

  getExamsByPatientId: async (id: number | string): Promise<Exam[]> => {
    const response = await apiClient.get<PatientExamsResponse>(`/patients/${id}/exams`)
    return response.exams
  },

  create: async (payload: NewPatientInput): Promise<Patient> => {
    const authUser = authService.getCurrentUser()

    if (!authUser) {
      throw new Error('Authentication required')
    }

    return apiClient.post<Patient>('/patients', {
      ...payload,
      sex: mapSexDisplayToBackend(payload.sex),
      laboratory_id: authUser.laboratory_id,
    })
  },
}
