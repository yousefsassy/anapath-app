import type { ReportTemplate } from '../types/domain'
import { apiClient } from './apiClient'
import { authService } from './authService'

interface TemplatePayload {
  name: string
  clinical_info: string
  macroscopy: string
  microscopy: string
  conclusion: string
}

export const reportTemplateService = {
  list: async (): Promise<ReportTemplate[]> => {
    const authUser = authService.getCurrentUser()
    const labId = authUser?.laboratory_id ?? 1
    return apiClient.get<ReportTemplate[]>(`/report-templates?laboratory_id=${labId}`)
  },

  create: async (payload: TemplatePayload): Promise<ReportTemplate> => {
    const authUser = authService.getCurrentUser()
    return apiClient.post<ReportTemplate>('/report-templates', {
      ...payload,
      laboratory_id: authUser?.laboratory_id ?? 1,
    })
  },

  update: async (id: number, payload: Partial<TemplatePayload>): Promise<ReportTemplate | null> => {
    try {
      return await apiClient.put<ReportTemplate>(`/report-templates/${id}`, payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('introuvable')) return null
      throw error
    }
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete<ReportTemplate>(`/report-templates/${id}`)
  },
}
