import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { examService } from '../services/examService'
import type { Exam, ReportInput } from '../types/domain'

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

  useEffect(() => {
    const loadExam = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await examService.getById(id)
        setExam(data)
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
      <section className="panel">
        <h2>Loading exam...</h2>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <p className="error-message">{error}</p>
      </section>
    )
  }

  if (!exam) {
    return (
      <section className="panel">
        <h2>Exam not found</h2>
        <p>This exam does not exist.</p>
      </section>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Exam ${exam.exam_number}`}
        subtitle={`${exam.exam_type} - ${exam.clinic_name}`}
      />

      <section className="panel">
        <div className="detail-grid">
          <p>
            <strong>Status:</strong> <StatusBadge status={exam.status} />
          </p>
          <p>
            <strong>Requesting Doctor:</strong> {exam.requesting_doctor}
          </p>
          <p>
            <strong>Requested Date:</strong> {exam.requested_date}
          </p>
          <p>
            <strong>Registered Date:</strong> {exam.registered_date}
          </p>
          <p className="full-row">
            <strong>Sample Nature:</strong> {exam.sample_nature || 'Not provided'}
          </p>
          <p className="full-row">
            <strong>Diagnosis Keywords:</strong> {formatDiagnosisKeywords(exam.diagnosis_keywords)}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Report Editor</h2>
          <p>Clinical report for this exam.</p>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
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

          {isReportLoading ? <p>Loading report...</p> : null}
          {reportError ? <p className="error-message">{reportError}</p> : null}
          {reportInfo ? <p className="success-message">{reportInfo}</p> : null}

          <div className="form-actions">
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
    </div>
  )
}
