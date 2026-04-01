import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamPrintPage } from '../pages/ExamPrintPage'
import { defaultLabSettings, defaultPrintSettings, type Exam, type ExamWorkspaceData, type Patient } from '../types/domain'
import { examService } from '../services/examService'
import { patientService } from '../services/patientService'
import { loadLabSettings } from '../services/labSettingsStorage'
import { loadPrintSettings, savePrintSettings } from '../services/printSettingsStorage'

vi.mock('../services/examService', () => ({
  examService: {
    getWorkspaceByExamId: vi.fn(),
  },
}))

vi.mock('../services/patientService', () => ({
  patientService: {
    getById: vi.fn(),
  },
}))

vi.mock('../services/labSettingsStorage', () => ({
  loadLabSettings: vi.fn(),
}))

vi.mock('../services/printSettingsStorage', () => ({
  loadPrintSettings: vi.fn(),
  savePrintSettings: vi.fn(),
}))

function buildWorkspace(status: Exam['status'], resultIssuedDate: string | null): ExamWorkspaceData {
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
      result_issued_date: resultIssuedDate,
      sample_nature: 'Biopsie test',
      exam_history: 'Contexte test',
      diagnosis_keywords: ['thyroide', 'papillaire'],
      status,
      urgent: false,
      created_at: '2026-04-11T10:00:00.000Z',
      updated_at: '2026-04-11T10:00:00.000Z',
    },
    report: {
      clinical_info: 'RC test',
      macroscopy: 'Macro test',
      microscopy: 'Micro test',
      conclusion: 'Conclusion test',
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

function renderPrintPage() {
  render(
    <MemoryRouter initialEntries={['/exams/10/print']}>
      <Routes>
        <Route path="/exams/:id/print" element={<ExamPrintPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ExamPrintPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadLabSettings).mockReturnValue(defaultLabSettings)
    vi.mocked(loadPrintSettings).mockReturnValue(defaultPrintSettings)
    vi.mocked(savePrintSettings).mockImplementation(() => {})
    vi.mocked(patientService.getById).mockResolvedValue(patientFixture)
  })

  it('shows the draft banner for a non-validated exam', async () => {
    vi.mocked(examService.getWorkspaceByExamId).mockResolvedValue(
      buildWorkspace('in_progress', null)
    )

    renderPrintPage()

    expect(await screen.findByText('Brouillon — prélèvement non validé')).toBeTruthy()
    expect(screen.getByText('Télécharger le PDF')).toBeTruthy()
  })

  it('shows the validated marker for a completed exam', async () => {
    vi.mocked(examService.getWorkspaceByExamId).mockResolvedValue(
      buildWorkspace('completed', '2026-04-15')
    )

    renderPrintPage()

    expect(await screen.findByText('Document validé le 15/04/2026')).toBeTruthy()
    expect(screen.getByText('Télécharger le PDF')).toBeTruthy()
  })
})
