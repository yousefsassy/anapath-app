import type { CaseArchiveQuery, CaseArchiveResult } from '../types/domain'
import { apiClient } from './apiClient'

export const caseArchiveService = {
  search: async (query: CaseArchiveQuery = {}): Promise<CaseArchiveResult[]> => {
    const params = new URLSearchParams()

    if (query.q?.trim()) params.set('q', query.q.trim())
    if (query.section && query.section !== 'all') params.set('section', query.section)
    if (query.exam_type) params.set('exam_type', query.exam_type)
    if (query.date_from) params.set('date_from', query.date_from)
    if (query.date_to) params.set('date_to', query.date_to)
    if (query.source_exam_id !== undefined) params.set('source_exam_id', String(query.source_exam_id))
    if (query.limit !== undefined) params.set('limit', String(query.limit))

    const qs = params.toString()
    return apiClient.get<CaseArchiveResult[]>(
      qs ? `/case-archive/search?${qs}` : '/case-archive/search'
    )
  },
}
