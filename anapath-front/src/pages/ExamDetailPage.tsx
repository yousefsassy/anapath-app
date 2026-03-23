import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { examService } from '../services/examService'
import type { UpdateExamInput } from '../services/examService'
import { patientService } from '../services/patientService'
import type { Exam, ReportInput } from '../types/domain'
import { mapExamStatusToBackend } from '../utils/domainMappings'

function formatDiagnosisKeywords(value: Exam['diagnosis_keywords']) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Not provided'
  }

  return value || 'Not provided'
}

const emptyReport: ReportInput = {
  clinical_info: '',
  macroscopy: '',
  microscopy: '',
  conclusion: '',
}

const emptyExamForm: UpdateExamInput = {
  exam_type: 'histology',
  clinic_name: '',
  requesting_doctor: '',
  requested_date: '',
  registered_date: '',
  result_issued_date: '',
  sample_nature: '',
  exam_history: '',
  diagnosis_keywords: '',
  status: 'registered',
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function toDiagnosisKeywordsString(value: Exam['diagnosis_keywords']): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value ?? ''
}

function toExamEditForm(exam: Exam): UpdateExamInput {
  return {
    exam_type: exam.exam_type,
    clinic_name: exam.clinic_name ?? '',
    requesting_doctor: exam.requesting_doctor ?? '',
    requested_date: toDateInputValue(exam.requested_date),
    registered_date: toDateInputValue(exam.registered_date),
    result_issued_date: toDateInputValue(exam.result_issued_date),
    sample_nature: exam.sample_nature ?? '',
    exam_history: exam.exam_history ?? '',
    diagnosis_keywords: toDiagnosisKeywordsString(exam.diagnosis_keywords),
    status: mapExamStatusToBackend(exam.status),
  }
}

export function ExamDetailPage() {
  const { id = '' } = useParams()

  const [exam, setExam] = useState<Exam | null>(null)
  const [report, setReport] = useState<ReportInput>(emptyReport)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isReportLoading, setIsReportLoading] = useState(true)
  const [reportError, setReportError] = useState('')
  const [reportInfo, setReportInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patientName, setPatientName] = useState('Patient')
  const [isEditingExam, setIsEditingExam] = useState(false)
  const [isExamSubmitting, setIsExamSubmitting] = useState(false)
  const [examForm, setExamForm] = useState<UpdateExamInput>(emptyExamForm)
  const [examUpdateError, setExamUpdateError] = useState('')
  const [examUpdateInfo, setExamUpdateInfo] = useState('')

  useEffect(() => {
    const loadExam = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await examService.getById(id)
        setExam(data)
        if (data) {
          setExamForm(toExamEditForm(data))
        }
        setReport(data?.report ?? emptyReport)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load exam.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadExam()
  }, [id])

  const onEditExam = () => {
    if (!exam) {
      return
    }

    setExamUpdateError('')
    setExamUpdateInfo('')
    setExamForm(toExamEditForm(exam))
    setIsEditingExam(true)
  }

  const onCancelEditExam = () => {
    if (exam) {
      setExamForm(toExamEditForm(exam))
    }
    setExamUpdateError('')
    setExamUpdateInfo('')
    setIsEditingExam(false)
  }

  const onSubmitExamUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isExamSubmitting) {
      return
    }

    setExamUpdateError('')
    setExamUpdateInfo('')
    setIsExamSubmitting(true)

    try {
      const updatedExam = await examService.update(id, examForm)

      if (!updatedExam) {
        setExamUpdateError('Exam not found for update.')
        return
      }

      setExam(updatedExam)
      setExamForm(toExamEditForm(updatedExam))
      setIsEditingExam(false)
      setExamUpdateInfo('Exam metadata updated successfully.')
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Unable to update exam.'
      setExamUpdateError(message)
    } finally {
      setIsExamSubmitting(false)
    }
  }

  useEffect(() => {
    const loadPatientName = async () => {
      if (!exam?.patient_id) {
        setPatientName('Patient')
        return
      }

      try {
        const patient = await patientService.getById(exam.patient_id)
        if (!patient) {
          setPatientName('Patient')
          return
        }

        setPatientName(`${patient.first_name} ${patient.last_name}`)
      } catch {
        setPatientName('Patient')
      }
    }

    void loadPatientName()
  }, [exam?.patient_id])

  useEffect(() => {
    const loadReport = async () => {
      setIsReportLoading(true)
      setReportError('')
      setReportInfo('')

      try {
        const data = await examService.getReportByExamId(id)

        if (!data) {
          setReport(emptyReport)
          setReportInfo('No report found yet. You can create one below.')
          return
        }

        const isEmpty =
          !data.clinical_info.trim() &&
          !data.macroscopy.trim() &&
          !data.microscopy.trim() &&
          !data.conclusion.trim()

        setReport(data)
        if (isEmpty) {
          setReportInfo('Report is empty. You can start writing now.')
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load report.'
        setReportError(message)
      } finally {
        setIsReportLoading(false)
      }
    }

    if (!exam) {
      setReport(emptyReport)
      setIsReportLoading(false)
      return
    }

    void loadReport()
  }, [id, exam])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReportError('')
    setReportInfo('')
    setIsSubmitting(true)

    try {
      const updatedReport = await examService.saveReportByExamId(id, report)

      if (!updatedReport) {
        setReportError('Report not found for this exam.')
        return
      }

      setReport(updatedReport)
      setReportInfo('Report saved successfully.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save report.'
      setReportError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <h2>Loading exam...</h2>
        </section>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <p className="error-message">{error}</p>
        </section>
      </PageContainer>
    )
  }

  if (!exam) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <h2>Exam not found</h2>
          <p>This exam does not exist.</p>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={`Exam ${exam.exam_number}`}
        subtitle={`${exam.exam_type} - ${exam.clinic_name}`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Patients', to: '/patients' },
          { label: patientName, to: `/patients/${exam.patient_id}` },
          { label: `Exam ${exam.exam_number}` },
        ]}
      />

      <section className="panel exam-detail-summary-panel">
        <form onSubmit={onSubmitExamUpdate}>
          <div className="panel-header exam-detail-summary-header">
            <div>
              <h2>Exam Summary</h2>
              <p>Core metadata to support report drafting and clinical traceability.</p>
            </div>
            <div className="form-actions">
              {isEditingExam ? (
                <>
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={onCancelEditExam}
                    disabled={isExamSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button" disabled={isExamSubmitting}>
                    {isExamSubmitting ? 'Saving...' : 'Save Exam'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button tertiary"
                  onClick={onEditExam}
                  disabled={isLoading || isExamSubmitting}
                >
                  Edit Exam
                </button>
              )}
              <StatusBadge status={exam.status} />
            </div>
          </div>

          {examUpdateError ? <p className="error-message">{examUpdateError}</p> : null}
          {isExamSubmitting ? <p className="report-loading">Saving exam...</p> : null}
          {examUpdateInfo ? <p className="success-message">{examUpdateInfo}</p> : null}

          {isEditingExam ? (
            <section className="form-section">
              <div className="form-grid">
                <FormField label="Exam Type" htmlFor="exam_type">
                  <select
                    id="exam_type"
                    value={examForm.exam_type}
                    onChange={(event) => setExamForm({ ...examForm, exam_type: event.target.value })}
                    disabled={isExamSubmitting}
                  >
                    <option value="histology">Histology</option>
                    <option value="cytology">Cytology</option>
                  </select>
                </FormField>

                <FormField label="Status" htmlFor="exam_status">
                  <select
                    id="exam_status"
                    value={examForm.status}
                    onChange={(event) =>
                      setExamForm({
                        ...examForm,
                        status: event.target.value as UpdateExamInput['status'],
                      })
                    }
                    disabled={isExamSubmitting}
                  >
                    <option value="registered">Registered</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </FormField>

                <FormField label="Requesting Doctor" htmlFor="requesting_doctor">
                  <input
                    id="requesting_doctor"
                    value={examForm.requesting_doctor}
                    onChange={(event) =>
                      setExamForm({ ...examForm, requesting_doctor: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Clinic" htmlFor="clinic_name">
                  <input
                    id="clinic_name"
                    value={examForm.clinic_name}
                    onChange={(event) => setExamForm({ ...examForm, clinic_name: event.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Requested Date" htmlFor="requested_date">
                  <input
                    id="requested_date"
                    type="date"
                    value={examForm.requested_date}
                    onChange={(event) =>
                      setExamForm({ ...examForm, requested_date: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Registered Date" htmlFor="registered_date">
                  <input
                    id="registered_date"
                    type="date"
                    value={examForm.registered_date}
                    onChange={(event) =>
                      setExamForm({ ...examForm, registered_date: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Result Issued Date" htmlFor="result_issued_date">
                  <input
                    id="result_issued_date"
                    type="date"
                    value={examForm.result_issued_date}
                    onChange={(event) =>
                      setExamForm({ ...examForm, result_issued_date: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Sample Nature" htmlFor="sample_nature">
                  <textarea
                    id="sample_nature"
                    rows={3}
                    value={examForm.sample_nature}
                    onChange={(event) =>
                      setExamForm({ ...examForm, sample_nature: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Exam History" htmlFor="exam_history">
                  <textarea
                    id="exam_history"
                    rows={3}
                    value={examForm.exam_history}
                    onChange={(event) =>
                      setExamForm({ ...examForm, exam_history: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField
                  label="Diagnosis Keywords"
                  htmlFor="diagnosis_keywords"
                  helperText="Separate multiple keywords with commas."
                >
                  <textarea
                    id="diagnosis_keywords"
                    rows={3}
                    value={examForm.diagnosis_keywords}
                    onChange={(event) =>
                      setExamForm({ ...examForm, diagnosis_keywords: event.target.value })
                    }
                    disabled={isExamSubmitting}
                  />
                </FormField>
              </div>
            </section>
          ) : (
            <dl className="exam-detail-meta-grid">
              <div className="exam-detail-meta-item">
                <dt>Exam Type</dt>
                <dd>{exam.exam_type || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item">
                <dt>Requesting Doctor</dt>
                <dd>{exam.requesting_doctor || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item">
                <dt>Clinic</dt>
                <dd>{exam.clinic_name || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item">
                <dt>Requested Date</dt>
                <dd>{exam.requested_date || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item">
                <dt>Registered Date</dt>
                <dd>{exam.registered_date || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item">
                <dt>Result Issued Date</dt>
                <dd>{exam.result_issued_date || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item exam-detail-meta-item--full">
                <dt>Sample Nature</dt>
                <dd>{exam.sample_nature || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item exam-detail-meta-item--full">
                <dt>Exam History</dt>
                <dd>{exam.exam_history || 'Not provided'}</dd>
              </div>

              <div className="exam-detail-meta-item exam-detail-meta-item--full">
                <dt>Diagnosis Keywords</dt>
                <dd>{formatDiagnosisKeywords(exam.diagnosis_keywords)}</dd>
              </div>
            </dl>
          )}
        </form>
      </section>

      <section className="panel exam-detail-report-panel">
        <div className="panel-header exam-detail-report-header">
          <div>
            <h2>Report Workspace</h2>
            <p>Complete and maintain the clinical report for this examination.</p>
          </div>
        </div>

        <div className="exam-detail-report-intro">
          <p>
            Keep the narrative concise and clinically structured: context, gross findings,
            microscopic interpretation, then conclusion.
          </p>
        </div>
      </section>

      <section className="panel exam-detail-report-editor-panel">
        <form className="form-layout report-form-layout" onSubmit={onSubmit}>
          <section className="form-section">
            <div className="form-section-header">
              <h3>Clinical Narrative</h3>
              <p>Document findings in a clear sequence from context to conclusion.</p>
            </div>

            <div className="form-grid">
              <FormField label="Clinical Info" htmlFor="clinical_info">
                <textarea
                  id="clinical_info"
                  rows={4}
                  value={report.clinical_info}
                  disabled={isReportLoading || isSubmitting}
                  onChange={(event) =>
                    setReport({ ...report, clinical_info: event.target.value })
                  }
                />
              </FormField>

              <FormField label="Macroscopy" htmlFor="macroscopy">
                <textarea
                  id="macroscopy"
                  rows={4}
                  value={report.macroscopy}
                  disabled={isReportLoading || isSubmitting}
                  onChange={(event) => setReport({ ...report, macroscopy: event.target.value })}
                />
              </FormField>

              <FormField label="Microscopy" htmlFor="microscopy">
                <textarea
                  id="microscopy"
                  rows={5}
                  value={report.microscopy}
                  disabled={isReportLoading || isSubmitting}
                  onChange={(event) => setReport({ ...report, microscopy: event.target.value })}
                />
              </FormField>

              <FormField label="Conclusion" htmlFor="conclusion">
                <textarea
                  id="conclusion"
                  rows={4}
                  value={report.conclusion}
                  disabled={isReportLoading || isSubmitting}
                  onChange={(event) => setReport({ ...report, conclusion: event.target.value })}
                />
              </FormField>
            </div>
          </section>

          <div className="exam-detail-feedback" aria-live="polite">
            {isReportLoading ? <p className="report-loading">Loading report...</p> : null}
            {reportError ? <p className="error-message">{reportError}</p> : null}
            {reportInfo ? <p className="success-message">{reportInfo}</p> : null}
          </div>

          <div className="form-actions form-actions-sticky">
            <button
              type="submit"
              className="button"
              disabled={isReportLoading || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Report'}
            </button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
