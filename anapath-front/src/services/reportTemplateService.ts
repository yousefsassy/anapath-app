import type { ReportTemplate } from '../types/domain'
import { ApiClientError, apiClient } from './apiClient'

interface TemplatePayload {
  name: string
  clinical_info: string
  macroscopy: string
  microscopy: string
  conclusion: string
}

export const reportTemplateService = {
  list: async (): Promise<ReportTemplate[]> => {
    return apiClient.get<ReportTemplate[]>('/report-templates')
  },

  create: async (payload: TemplatePayload): Promise<ReportTemplate> => {
    return apiClient.post<ReportTemplate>('/report-templates', payload)
  },

  update: async (id: number, payload: Partial<TemplatePayload>): Promise<ReportTemplate | null> => {
    try {
      return await apiClient.put<ReportTemplate>(`/report-templates/${id}`, payload)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null
      throw error
    }
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete<ReportTemplate>(`/report-templates/${id}`)
  },
}
