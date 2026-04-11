import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamDetailPage } from '../pages/ExamDetailPage'
import type {
  ExamWorkspaceData,
  Patient,
  ReportRevisionDetail,
  ReportRevisionSummary,
} from '../types/domain'
import { examService } from '../services/examService'
import { patientService } from '../services/patientService'
import { reportTemplateService } from '../services/reportTemplateService'
import { caseArchiveService } from '../services/caseArchiveService'

vi.mock('../services/examService', () => ({
  examService: {
    getWorkspaceByExamId: vi.fn(),
    listReportRevisionsByExamId: vi.fn(),
    getReportRevisionById: vi.fn(),
    restoreReportRevisionById: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    saveReportByExamId: vi.fn(),
  },
}))

vi.mock('../services/patientService', () => ({
  patientService: {
    getById: vi.fn(),
    getExamsWithReportSummary: vi.fn(),
  },
}))

vi.mock('../services/reportTemplateService', () => ({
  reportTemplateService: {
    list: vi.fn(),
  },
}))

vi.mock('../services/caseArchiveService', () => ({
  caseArchiveService: {
    search: vi.fn(),
  },
}))

function buildWorkspace(status: 'in_progress' | 'completed' = 'in_progress'): ExamWorkspaceData {
  return {
    exam: {
      id: 10,
      laboratory_id: 1,
      patient_id: 99,
      exam_type: 'histology',
      exam_number: '10-2026',
      clinic_name: 'Clinique test',
      requesting_doctor: 'Dr Test',
      requested_date: '2026-04-10',
      registered_date: '2026-04-11',
      result_issued_date: status === 'completed' ? '2026-04-15' : null,
      sample_nature: 'Biopsie test',
      exam_history: 'Contexte clinique test',
      diagnosis_keywords: ['thyroide', 'papillaire'],
      status,
      urgent: false,
      created_at: '2026-04-11T10:00:00.000Z',
      updated_at: '2026-04-11T10:00:00.000Z',
    },
    report: {
      clinical_info: 'RC actuelle',
      macroscopy: 'Macro actuelle',
      microscopy: 'Micro actuelle',
      conclusion: 'Conclusion actuelle',
    },
  }
}

const patientFixture: Patient = {
  id: 99,
  laboratory_id: 1,
  first_name: 'Nadia',
  last_name: 'Test',
  age: 52,
  sex: 'F',
  phone: '0700000000',
  birth_date: '1974-02-10',
  general_history: '',
  created_at: '2026-04-11T10:00:00.000Z',
  updated_at: '2026-04-11T10:00:00.000Z',
}

const revisionsFixture: ReportRevisionSummary[] = [
  {
    id: 2,
    created_at: '2026-04-11T10:30:00.000Z',
    snapshot_reason: 'save',
    actor_user_id: 1,
    actor_full_name: 'Dr Derniere Version',
  },
  {
    id: 1,
    created_at: '2026-04-11T10:00:00.000Z',
    snapshot_reason: 'validation',
    actor_user_id: 1,
    actor_full_name: 'Dr Première Version',
  },
]

const revisionDetailsFixture: Record<number, ReportRevisionDetail> = {
  1: {
    id: 1,
    exam_id: 10,
    report_id: 50,
    created_at: '2026-04-11T10:00:00.000Z',
    snapshot_reason: 'validation',
    actor_user_id: 1,
    actor_full_name: 'Dr Première Version',
    clinical_info: 'RC ancienne',
    macroscopy: 'Macro ancienne',
    microscopy: 'Micro ancienne',
    conclusion: 'Conclusion ancienne',
  },
  2: {
    id: 2,
    exam_id: 10,
    report_id: 50,
    created_at: '2026-04-11T10:30:00.000Z',
    snapshot_reason: 'save',
    actor_user_id: 1,
    actor_full_name: 'Dr Derniere Version',
    clinical_info: 'RC recente',
    macroscopy: 'Macro recente',
    microscopy: 'Micro recente',
    conclusion: 'Conclusion recente',
  },
}

function renderExamDetailPage() {
  render(
    <MemoryRouter initialEntries={['/exams/10']}>
      <Routes>
        <Route path="/exams/:id" element={<ExamDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExamDetailPage report history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(examService.getWorkspaceByExamId).mockResolvedValue(buildWorkspace())
    vi.mocked(examService.listReportRevisionsByExamId).mockResolvedValue(revisionsFixture)
    vi.mocked(examService.getReportRevisionById).mockImplementation(async (_id, revisionId) => {
      return revisionDetailsFixture[Number(revisionId)] ?? null
    })
    vi.mocked(examService.restoreReportRevisionById).mockResolvedValue({
      clinical_info: 'RC ancienne',
      macroscopy: 'Macro ancienne',
      microscopy: 'Micro ancienne',
      conclusion: 'Conclusion ancienne',
    })
    vi.mocked(patientService.getById).mockResolvedValue(patientFixture)
    vi.mocked(patientService.getExamsWithReportSummary).mockResolvedValue([])
    vi.mocked(reportTemplateService.list).mockResolvedValue([])
    vi.mocked(caseArchiveService.search).mockResolvedValue([])
  })

  it('opens history, renders revision metadata, and lets the doctor inspect another snapshot', async () => {
    renderExamDetailPage()

    fireEvent.click(await screen.findByText('Historique'))

    expect(await screen.findByText('Historique du compte rendu')).toBeInTheDocument()
    expect(await screen.findByText('Conclusion recente')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Dr Première Version'))

    expect(await screen.findByText('Conclusion ancienne')).toBeInTheDocument()
    expect(screen.getByText('Validation')).toBeInTheDocument()
  })

  it('shows history in read-only mode for validated exams', async () => {
    vi.mocked(examService.getWorkspaceByExamId).mockResolvedValue(buildWorkspace('completed'))

    renderExamDetailPage()

    fireEvent.click(await screen.findByText('Historique'))

    expect(await screen.findByText(/lecture seule/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Restaurer cette version' }),
    ).not.toBeInTheDocument()
  })

  it('restores selected revision into live report editor and shows success feedback', async () => {
    vi.mocked(examService.listReportRevisionsByExamId).mockResolvedValue([revisionsFixture[1]])
    vi.mocked(examService.getReportRevisionById).mockResolvedValue(revisionDetailsFixture[1])

    renderExamDetailPage()

    fireEvent.click(await screen.findByText('Historique'))
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurer cette version' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer' }))

    await waitFor(() =>
      expect(screen.getByText('Version restaurée.')).toBeInTheDocument(),
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Conclusion')).toHaveValue('Conclusion ancienne'),
    )
  })
})
