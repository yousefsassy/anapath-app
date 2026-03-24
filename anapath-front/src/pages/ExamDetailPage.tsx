import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { examService } from '../services/examService'
import type { UpdateExamInput } from '../services/examService'
import { patientService } from '../services/patientService'
import type { Exam, ExamWithReportSummary, ReportInput } from '../types/domain'
import { mapExamStatusToBackend } from '../utils/domainMappings'
import { formatDate, truncate } from '../utils/formatting'

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

function toDiagnosisKeywordsString(value: Exam['diagnosis_keywords']): string {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

function formatDiagnosisKeywords(value: Exam['diagnosis_keywords']): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return value || '—'
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

// ── status action config ──────────────────────────────────────────────────────

const STATUS_NEXT: Record<string, { label: string; next: 'in_progress' | 'completed' }> = {
  registered: { label: 'Mettre en cours', next: 'in_progress' },
  in_progress: { label: 'Valider', next: 'completed' },
}

// ── component ─────────────────────────────────────────────────────────────────

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

  const [patientName, setPatientName] = useState('')
  const [antecedents, setAntecedents] = useState<ExamWithReportSummary[]>([])

  const [isEditingExam, setIsEditingExam] = useState(false)
  const [isExamSubmitting, setIsExamSubmitting] = useState(false)
  const [examForm, setExamForm] = useState<UpdateExamInput>(emptyExamForm)
  const [examUpdateError, setExamUpdateError] = useState('')
  const [examUpdateInfo, setExamUpdateInfo] = useState('')

  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState('')

  // Load exam + report --------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await examService.getById(id)
        setExam(data)
        if (data) setExamForm(toExamEditForm(data))
        setReport(data?.report ?? emptyReport)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le prélèvement.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [id])

  // Load report separately ---------------------------------------------------
  useEffect(() => {
    if (!exam) {
      setReport(emptyReport)
      setIsReportLoading(false)
      return
    }
    const loadReport = async () => {
      setIsReportLoading(true)
      setReportError('')
      setReportInfo('')
      try {
        const data = await examService.getReportByExamId(id)
        if (!data) {
          setReport(emptyReport)
          return
        }
        setReport(data)
      } catch (err) {
        setReportError(
          err instanceof Error ? err.message : 'Impossible de charger le compte rendu.'
        )
      } finally {
        setIsReportLoading(false)
      }
    }
    void loadReport()
  }, [id, exam])

  // Load patient name + antecedents ------------------------------------------
  useEffect(() => {
    if (!exam?.patient_id) return
    const loadPatientContext = async () => {
      try {
        const patient = await patientService.getById(exam.patient_id)
        if (patient) {
          setPatientName(`${patient.last_name} ${patient.first_name}`)
        }
      } catch {
        // breadcrumb fallback — non-critical
      }

      try {
        const allExams = await patientService.getExamsWithReportSummary(exam.patient_id)
        // Exclude current exam, already sorted DESC by backend
        setAntecedents(allExams.filter((e) => String(e.id) !== String(id)))
      } catch {
        // antecedents are non-critical — fail silently
      }
    }
    void loadPatientContext()
  }, [exam?.patient_id, id])

  // Edit exam ----------------------------------------------------------------
  const onEditExam = () => {
    if (!exam) return
    setExamUpdateError('')
    setExamUpdateInfo('')
    setExamForm(toExamEditForm(exam))
    setIsEditingExam(true)
  }

  const onCancelEditExam = () => {
    if (exam) setExamForm(toExamEditForm(exam))
    setExamUpdateError('')
    setExamUpdateInfo('')
    setIsEditingExam(false)
  }

  const onSubmitExamUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isExamSubmitting) return
    setExamUpdateError('')
    setExamUpdateInfo('')
    setIsExamSubmitting(true)
    try {
      const updatedExam = await examService.update(id, examForm)
      if (!updatedExam) {
        setExamUpdateError('Prélèvement introuvable pour la mise à jour.')
        return
      }
      setExam(updatedExam)
      setExamForm(toExamEditForm(updatedExam))
      setIsEditingExam(false)
      setExamUpdateInfo('Prélèvement mis à jour.')
    } catch (err) {
      setExamUpdateError(
        err instanceof Error ? err.message : 'Impossible de mettre à jour le prélèvement.'
      )
    } finally {
      setIsExamSubmitting(false)
    }
  }

  // Status action ------------------------------------------------------------
  const onUpdateStatus = async (next: 'in_progress' | 'completed') => {
    if (isStatusUpdating || !exam) return
    setStatusError('')
    setIsStatusUpdating(true)
    try {
      const updated = await examService.updateStatus(id, next)
      if (updated) {
        setExam(updated)
        setExamForm(toExamEditForm(updated))
      }
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Impossible de mettre à jour le statut.'
      )
    } finally {
      setIsStatusUpdating(false)
    }
  }

  // Save report --------------------------------------------------------------
  const onSubmitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReportError('')
    setReportInfo('')
    setIsSubmitting(true)
    try {
      const updated = await examService.saveReportByExamId(id, report)
      if (!updated) {
        setReportError('Compte rendu introuvable pour ce prélèvement.')
        return
      }
      setReport(updated)
      setReportInfo('Compte rendu enregistré.')
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le compte rendu."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading / error states ---------------------------------------------------
  if (isLoading) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <p className="report-loading">Chargement du prélèvement…</p>
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
          <h2>Prélèvement introuvable</h2>
          <p>Ce prélèvement n'existe pas ou a été supprimé.</p>
        </section>
      </PageContainer>
    )
  }

  const statusAction = STATUS_NEXT[exam.status]
  const currentStatus = mapExamStatusToBackend(exam.status)

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={`Prélèvement ${exam.exam_number}`}
        subtitle={[exam.sample_nature, exam.clinic_name].filter(Boolean).join(' — ') || 'Détail du prélèvement'}
        breadcrumbs={[
          { label: 'Accueil', to: '/dashboard' },
          { label: 'Patients', to: '/patients' },
          ...(patientName ? [{ label: patientName, to: `/patients/${exam.patient_id}` }] : []),
          { label: exam.exam_number },
        ]}
      />

      {/* ── Exam summary ──────────────────────────────────────────────────── */}
      <section className="panel exam-detail-summary-panel">
        <form onSubmit={onSubmitExamUpdate}>
          <div className="panel-header exam-detail-summary-header">
            <div>
              <h2>Informations du prélèvement</h2>
            </div>
            <div className="form-actions exam-detail-status-actions">
              <StatusBadge status={exam.status} />

              {!isEditingExam && statusAction ? (
                <button
                  type="button"
                  className={`button exam-status-btn exam-status-btn--${statusAction.next}`}
                  onClick={() => void onUpdateStatus(statusAction.next)}
                  disabled={isStatusUpdating}
                >
                  {isStatusUpdating ? '…' : statusAction.label}
                </button>
              ) : null}

              {!isEditingExam ? (
                <button
                  type="button"
                  className="button tertiary"
                  onClick={onEditExam}
                  disabled={isExamSubmitting}
                >
                  Modifier
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={onCancelEditExam}
                    disabled={isExamSubmitting}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="button" disabled={isExamSubmitting}>
                    {isExamSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </>
              )}
            </div>
          </div>

          {statusError ? <p className="error-message">{statusError}</p> : null}
          {examUpdateError ? <p className="error-message">{examUpdateError}</p> : null}
          {examUpdateInfo ? <p className="success-message">{examUpdateInfo}</p> : null}

          {isEditingExam ? (
            <section className="form-section">
              <div className="form-grid">
                <FormField label="Type d'examen" htmlFor="exam_type">
                  <select
                    id="exam_type"
                    value={examForm.exam_type}
                    onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                    disabled={isExamSubmitting}
                  >
                    <option value="histology">Histologie</option>
                    <option value="cytology">Cytologie</option>
                  </select>
                </FormField>

                <FormField label="Médecin prescripteur" htmlFor="requesting_doctor">
                  <input
                    id="requesting_doctor"
                    value={examForm.requesting_doctor}
                    onChange={(e) => setExamForm({ ...examForm, requesting_doctor: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Clinique / Établissement" htmlFor="clinic_name">
                  <input
                    id="clinic_name"
                    value={examForm.clinic_name}
                    onChange={(e) => setExamForm({ ...examForm, clinic_name: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Date de réception" htmlFor="registered_date">
                  <input
                    id="registered_date"
                    type="date"
                    value={examForm.registered_date}
                    onChange={(e) => setExamForm({ ...examForm, registered_date: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Date de demande" htmlFor="requested_date">
                  <input
                    id="requested_date"
                    type="date"
                    value={examForm.requested_date}
                    onChange={(e) => setExamForm({ ...examForm, requested_date: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Date de rendu" htmlFor="result_issued_date">
                  <input
                    id="result_issued_date"
                    type="date"
                    value={examForm.result_issued_date}
                    onChange={(e) => setExamForm({ ...examForm, result_issued_date: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Nature du prélèvement" htmlFor="sample_nature">
                  <textarea
                    id="sample_nature"
                    rows={2}
                    value={examForm.sample_nature}
                    onChange={(e) => setExamForm({ ...examForm, sample_nature: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Renseignement clinique" htmlFor="exam_history">
                  <textarea
                    id="exam_history"
                    rows={3}
                    value={examForm.exam_history}
                    onChange={(e) => setExamForm({ ...examForm, exam_history: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField
                  label="Mots-clés diagnostiques"
                  htmlFor="diagnosis_keywords"
                  helperText="Séparer par des virgules."
                >
                  <textarea
                    id="diagnosis_keywords"
                    rows={2}
                    value={examForm.diagnosis_keywords}
                    onChange={(e) => setExamForm({ ...examForm, diagnosis_keywords: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>
              </div>
            </section>
          ) : (
            <dl className="exam-detail-meta-grid">
              <div className="exam-detail-meta-item">
                <dt>Type d'examen</dt>
                <dd>{exam.exam_type === 'histology' ? 'Histologie' : exam.exam_type === 'cytology' ? 'Cytologie' : exam.exam_type || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Médecin prescripteur</dt>
                <dd>{exam.requesting_doctor || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Clinique / Établissement</dt>
                <dd>{exam.clinic_name || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Date de réception</dt>
                <dd>{formatDate(exam.registered_date)}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Date de demande</dt>
                <dd>{formatDate(exam.requested_date)}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Date de rendu</dt>
                <dd>{formatDate(exam.result_issued_date)}</dd>
              </div>
              <div className="exam-detail-meta-item exam-detail-meta-item--full">
                <dt>Nature du prélèvement</dt>
                <dd>{exam.sample_nature || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item exam-detail-meta-item--full">
                <dt>Renseignement clinique</dt>
                <dd>{exam.exam_history || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item exam-detail-meta-item--full">
                <dt>Mots-clés diagnostiques</dt>
                <dd>{formatDiagnosisKeywords(exam.diagnosis_keywords)}</dd>
              </div>
            </dl>
          )}
        </form>
      </section>

      {/* ── Antécédents du patient ────────────────────────────────────────── */}
      {antecedents.length > 0 && (
        <section className="panel antecedents-panel">
          <div className="panel-header">
            <h2>Antécédents du patient</h2>
            <Link to={`/patients/${exam.patient_id}`} className="text-link antecedents-dossier-link">
              Voir dossier complet →
            </Link>
          </div>
          <ul className="antecedents-list">
            {antecedents.map((prev) => {
              const preview = truncate(prev.report_summary?.conclusion ?? '', 130)
              return (
                <li key={prev.id} className="antecedents-item">
                  <div className="antecedents-item-meta">
                    <Link to={`/exams/${prev.id}`} className="antecedents-ref">
                      {prev.exam_number}
                    </Link>
                    <span className="antecedents-nature">{prev.sample_nature || '—'}</span>
                    <span className="antecedents-date">{formatDate(prev.registered_date)}</span>
                    <StatusBadge status={prev.status} />
                  </div>
                  {preview && (
                    <p className="antecedents-conclusion">{preview}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ── Compte Rendu ─────────────────────────────────────────────────── */}
      <section className="panel exam-detail-report-editor-panel">
        <div className="panel-header">
          <div>
            <h2>Compte Rendu</h2>
            <p>
              {currentStatus === 'completed'
                ? 'Ce prélèvement est validé.'
                : 'Rédigez le compte rendu structuré pour ce prélèvement.'}
            </p>
          </div>
        </div>

        <form className="form-layout report-form-layout" onSubmit={onSubmitReport}>
          <div className="form-grid">
            <FormField label="Renseignement clinique" htmlFor="clinical_info">
              <textarea
                id="clinical_info"
                rows={4}
                value={report.clinical_info}
                disabled={isReportLoading || isSubmitting}
                onChange={(e) => setReport({ ...report, clinical_info: e.target.value })}
              />
            </FormField>

            <FormField label="Macroscopie" htmlFor="macroscopy">
              <textarea
                id="macroscopy"
                rows={4}
                value={report.macroscopy}
                disabled={isReportLoading || isSubmitting}
                onChange={(e) => setReport({ ...report, macroscopy: e.target.value })}
              />
            </FormField>

            <FormField label="Microscopie" htmlFor="microscopy">
              <textarea
                id="microscopy"
                rows={5}
                value={report.microscopy}
                disabled={isReportLoading || isSubmitting}
                onChange={(e) => setReport({ ...report, microscopy: e.target.value })}
              />
            </FormField>

            <FormField label="Conclusion" htmlFor="conclusion">
              <textarea
                id="conclusion"
                rows={4}
                value={report.conclusion}
                disabled={isReportLoading || isSubmitting}
                onChange={(e) => setReport({ ...report, conclusion: e.target.value })}
              />
            </FormField>
          </div>

          <div className="exam-detail-feedback" aria-live="polite">
            {isReportLoading ? <p className="report-loading">Chargement du compte rendu…</p> : null}
            {reportError ? <p className="error-message">{reportError}</p> : null}
            {reportInfo ? <p className="success-message">{reportInfo}</p> : null}
          </div>

          <div className="form-actions form-actions-sticky">
            <button
              type="submit"
              className="button"
              disabled={isReportLoading || isSubmitting}
            >
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le compte rendu'}
            </button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
