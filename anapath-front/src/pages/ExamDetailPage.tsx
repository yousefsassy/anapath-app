import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { CaseArchiveResultList } from '../components/archive/CaseArchiveResultList'
import { PageContainer } from '../layouts/PageContainer'
import { caseArchiveService } from '../services/caseArchiveService'
import { examService } from '../services/examService'
import type { UpdateExamInput } from '../services/examService'
import { patientService } from '../services/patientService'
import { reportTemplateService } from '../services/reportTemplateService'
import type { CaseArchiveResult, CaseArchiveSection, Exam, ExamWithReportSummary, ReportInput, ReportTemplate } from '../types/domain'
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

function toDiagnosisKeywordsArray(value: Exam['diagnosis_keywords']): string[] {
  if (Array.isArray(value)) {
    return value
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  }

  return String(value ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function formatDiagnosisKeywords(value: Exam['diagnosis_keywords']): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return value || '—'
}

function toArchiveSearchToken(value: string): string {
  const sanitized = value.replace(/"/g, ' ').trim()
  if (!sanitized) return ''
  return sanitized.includes(' ') ? `"${sanitized}"` : sanitized
}

const ARCHIVE_CONTEXT_STOP_WORDS = new Set([
  'avec',
  'chez',
  'dans',
  'des',
  'du',
  'elle',
  'elles',
  'entre',
  'est',
  'les',
  'leur',
  'leurs',
  'mais',
  'meme',
  'nous',
  'notre',
  'par',
  'pas',
  'pour',
  'que',
  'qui',
  'sans',
  'ses',
  'sur',
  'une',
  'vous',
])

function tokenizeArchiveContext(value: string | null | undefined, maxTerms: number): string[] {
  if (!value) return []

  return [...new Set(
    value
      .toLowerCase()
      .split(/[^A-Za-zÀ-ÿ0-9]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 4 && !ARCHIVE_CONTEXT_STOP_WORDS.has(term))
  )].slice(0, maxTerms)
}

function buildArchiveContextQuery(exam: Exam): string {
  const diagnosisKeywords = toDiagnosisKeywordsArray(exam.diagnosis_keywords)
    .flatMap((keyword) => tokenizeArchiveContext(keyword, 2))

  const sampleNatureTerms = tokenizeArchiveContext(exam.sample_nature, 2)
  const historyTerms = tokenizeArchiveContext(exam.exam_history, 1)

  return [...new Set([
    ...diagnosisKeywords,
    ...sampleNatureTerms,
    ...historyTerms,
  ])]
    .slice(0, 4)
    .map(toArchiveSearchToken)
    .join(' ')
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
    urgent: exam.urgent ?? false,
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
  urgent: false,
}

// ── status action config ──────────────────────────────────────────────────────

const STATUS_NEXT: Record<string, { label: string; next: 'in_progress' | 'completed' }> = {
  registered: { label: 'Mettre en cours', next: 'in_progress' },
  in_progress: { label: 'Valider', next: 'completed' },
}

const ARCHIVE_SECTION_OPTIONS: { value: CaseArchiveSection; label: string }[] = [
  { value: 'all', label: 'Toutes sections' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'microscopy', label: 'Microscopie' },
  { value: 'macroscopy', label: 'Macroscopie' },
  { value: 'clinical_info', label: 'RC' },
]

const SIMILAR_CASES_CONTEXT_HINT =
  "Ajoutez une nature du prélèvement, un mot-clé diagnostique ou un renseignement clinique pour obtenir des cas similaires."

// ── component ─────────────────────────────────────────────────────────────────

export function ExamDetailPage() {
  const { id = '' } = useParams()
  const similarCasesAbortRef = useRef<AbortController | null>(null)
  const similarCasesRequestIdRef = useRef(0)

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
  const [archiveQuery, setArchiveQuery] = useState('')
  const [archiveSection, setArchiveSection] = useState<CaseArchiveSection>('all')
  const [similarCases, setSimilarCases] = useState<CaseArchiveResult[]>([])
  const [isSimilarCasesLoading, setIsSimilarCasesLoading] = useState(false)
  const [similarCasesError, setSimilarCasesError] = useState('')
  const [similarCasesInfo, setSimilarCasesInfo] = useState('')
  const [isSimilarCasesOpen, setIsSimilarCasesOpen] = useState(true)

  const [isEditingExam, setIsEditingExam] = useState(false)
  const [isExamSubmitting, setIsExamSubmitting] = useState(false)
  const [examForm, setExamForm] = useState<UpdateExamInput>(emptyExamForm)
  const [examUpdateError, setExamUpdateError] = useState('')
  const [examUpdateInfo, setExamUpdateInfo] = useState('')

  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [pendingTemplate, setPendingTemplate] = useState<ReportTemplate | null>(null)
  const [showConfirmApply, setShowConfirmApply] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [saveAsTemplateName, setSaveAsTemplateName] = useState('')
  const [saveAsTemplateError, setSaveAsTemplateError] = useState('')
  const [saveAsTemplateInfo, setSaveAsTemplateInfo] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

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

  // Load templates ------------------------------------------------------------
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await reportTemplateService.list()
        setTemplates(data)
      } catch {
        // non-critical — fail silently
      }
    }
    void loadTemplates()
  }, [])

  // Template application logic ------------------------------------------------
  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((t) => String(t.id) === templateId)
    if (!template) return
    const reportHasContent =
      report.clinical_info.trim() ||
      report.macroscopy.trim() ||
      report.microscopy.trim() ||
      report.conclusion.trim()
    if (reportHasContent) {
      setPendingTemplate(template)
      setShowConfirmApply(true)
    } else {
      applyTemplate(template)
    }
  }

  const applyTemplate = (template: ReportTemplate) => {
    setReport({
      clinical_info: template.clinical_info,
      macroscopy: template.macroscopy,
      microscopy: template.microscopy,
      conclusion: template.conclusion,
    })
    setShowConfirmApply(false)
    setPendingTemplate(null)
  }

  const handleSaveAsTemplate = async () => {
    setSaveAsTemplateError('')
    setSaveAsTemplateInfo('')
    if (!saveAsTemplateName.trim()) {
      setSaveAsTemplateError('Le nom du modèle est obligatoire.')
      return
    }
    const hasContent =
      report.clinical_info.trim() ||
      report.macroscopy.trim() ||
      report.microscopy.trim() ||
      report.conclusion.trim()
    if (!hasContent) {
      setSaveAsTemplateError('Le compte rendu doit contenir au moins un champ non vide.')
      return
    }
    setIsSavingTemplate(true)
    try {
      await reportTemplateService.create({
        name: saveAsTemplateName.trim(),
        clinical_info: report.clinical_info,
        macroscopy: report.macroscopy,
        microscopy: report.microscopy,
        conclusion: report.conclusion,
      })
      const updated = await reportTemplateService.list()
      setTemplates(updated)
      setSaveAsTemplateName('')
      setSaveAsTemplateOpen(false)
      setSaveAsTemplateInfo('Modèle enregistré.')
    } catch (err) {
      setSaveAsTemplateError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le modèle."
      )
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const loadSimilarCases = async (sourceExam: Exam, queryValue: string) => {
    const trimmedQuery = queryValue.trim()

    if (!trimmedQuery) {
      similarCasesAbortRef.current?.abort()
      setSimilarCases([])
      setIsSimilarCasesLoading(false)
      setSimilarCasesError('')
      setSimilarCasesInfo(SIMILAR_CASES_CONTEXT_HINT)
      return
    }

    const requestId = similarCasesRequestIdRef.current + 1
    similarCasesRequestIdRef.current = requestId

    similarCasesAbortRef.current?.abort()
    const controller = new AbortController()
    similarCasesAbortRef.current = controller

    setIsSimilarCasesLoading(true)
    setSimilarCasesError('')
    setSimilarCasesInfo('')

    const contextualExamType =
      sourceExam.exam_type === 'histology' || sourceExam.exam_type === 'cytology'
        ? sourceExam.exam_type
        : undefined

    try {
      const data = await caseArchiveService.search({
        q: trimmedQuery,
        section: archiveSection,
        exam_type: contextualExamType,
        source_exam_id: sourceExam.id,
        limit: 6,
      }, { signal: controller.signal })

      if (controller.signal.aborted || requestId !== similarCasesRequestIdRef.current) {
        return
      }

      setSimilarCases(data)
    } catch (loadError) {
      if (controller.signal.aborted || requestId !== similarCasesRequestIdRef.current) {
        return
      }

      setSimilarCasesError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger les cas similaires.'
      )
    } finally {
      if (!controller.signal.aborted && requestId === similarCasesRequestIdRef.current) {
        setIsSimilarCasesLoading(false)
      }
    }
  }

  const handleRefreshSimilarCases = () => {
    if (!exam) return
    const nextQuery = buildArchiveContextQuery(exam)
    setArchiveQuery(nextQuery)
    void loadSimilarCases(exam, nextQuery)
  }

  const handleSubmitSimilarCases = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!exam) return
    void loadSimilarCases(exam, archiveQuery)
  }

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

  useEffect(() => {
    if (!exam) {
      similarCasesAbortRef.current?.abort()
      setArchiveQuery('')
      setSimilarCases([])
      setSimilarCasesError('')
      setSimilarCasesInfo('')
      setIsSimilarCasesLoading(false)
      return
    }

    const initialQuery = buildArchiveContextQuery(exam)
    setArchiveQuery(initialQuery)
    void loadSimilarCases(exam, initialQuery)
  }, [exam?.id, exam?.sample_nature, exam?.exam_history, exam?.diagnosis_keywords, exam?.exam_type])

  useEffect(() => {
    return () => {
      similarCasesAbortRef.current?.abort()
    }
  }, [])

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

  // Reopen report ------------------------------------------------------------
  const onConfirmReopen = async () => {
    if (isStatusUpdating || !exam) return
    setStatusError('')
    setIsStatusUpdating(true)
    setIsReopenConfirmOpen(false)
    try {
      const updated = await examService.updateStatus(id, 'in_progress')
      if (updated) {
        setExam(updated)
        setExamForm(toExamEditForm(updated))
      }
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Impossible de rouvrir le rapport.'
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
  const isReportLocked = currentStatus === 'completed'

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

              <Link
                to={`/exams/${id}/print`}
                className="button tertiary"
                target="_blank"
                rel="noreferrer"
              >
                Aperçu PDF
              </Link>

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

                <FormField label="Priorité" htmlFor="urgent_edit">
                  <label className="checkbox-label">
                    <input
                      id="urgent_edit"
                      type="checkbox"
                      checked={examForm.urgent}
                      onChange={(e) => setExamForm({ ...examForm, urgent: e.target.checked })}
                      disabled={isExamSubmitting}
                    />
                    Prélèvement urgent
                  </label>
                </FormField>

                <FormField label="Demandé par" htmlFor="requesting_doctor">
                  <input
                    id="requesting_doctor"
                    value={examForm.requesting_doctor}
                    onChange={(e) => setExamForm({ ...examForm, requesting_doctor: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Clinique" htmlFor="clinic_name">
                  <input
                    id="clinic_name"
                    value={examForm.clinic_name}
                    onChange={(e) => setExamForm({ ...examForm, clinic_name: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Enregistré le" htmlFor="registered_date">
                  <input
                    id="registered_date"
                    type="date"
                    value={examForm.registered_date}
                    onChange={(e) => setExamForm({ ...examForm, registered_date: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Examen demandé le" htmlFor="requested_date">
                  <input
                    id="requested_date"
                    type="date"
                    value={examForm.requested_date}
                    onChange={(e) => setExamForm({ ...examForm, requested_date: e.target.value })}
                    disabled={isExamSubmitting}
                  />
                </FormField>

                <FormField label="Résultat émis le" htmlFor="result_issued_date">
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
                <dt>Priorité</dt>
                <dd>{exam.urgent ? <span className="badge--urgent">Urgent</span> : '—'}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Demandé par</dt>
                <dd>{exam.requesting_doctor || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Clinique</dt>
                <dd>{exam.clinic_name || '—'}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Enregistré le</dt>
                <dd>{formatDate(exam.registered_date)}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Examen demandé le</dt>
                <dd>{formatDate(exam.requested_date)}</dd>
              </div>
              <div className="exam-detail-meta-item">
                <dt>Résultat émis le</dt>
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
                <dd>
                  {Array.isArray(exam.diagnosis_keywords) && exam.diagnosis_keywords.length > 0 ? (
                    <span className="keyword-chips">
                      {exam.diagnosis_keywords.map((kw) => (
                        <span key={kw} className="keyword-chip">{kw}</span>
                      ))}
                    </span>
                  ) : '—'}
                </dd>
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

      {/* ── Espace de travail du compte rendu ───────────────────────────── */}
      <div className="exam-detail-workspace-grid">
        <section className="panel exam-detail-report-editor-panel">
          <div className="panel-header">
            <div>
              <h2>Compte Rendu</h2>
              {isReportLocked ? (
                <div className="report-locked-banner-row">
                  <div className="report-locked-banner">
                    Rapport validé — lecture seule
                  </div>
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={() => setIsReopenConfirmOpen(true)}
                    disabled={isStatusUpdating}
                  >
                    Rouvrir le rapport
                  </button>
                </div>
              ) : (
                <p>Rédigez le compte rendu structuré pour ce prélèvement.</p>
              )}
            </div>
          </div>

          <form className="form-layout report-form-layout" onSubmit={onSubmitReport}>
            {isReopenConfirmOpen && (
              <div className="template-confirm-banner">
                <span>Rouvrir ce rapport le rendra à nouveau modifiable et effacera la date d'émission du résultat.</span>
                <div className="template-confirm-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => void onConfirmReopen()}
                    disabled={isStatusUpdating}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={() => setIsReopenConfirmOpen(false)}
                    disabled={isStatusUpdating}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {templates.length > 0 && !isReportLocked && (
              <div className="template-picker-row">
                <select
                  value=""
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  disabled={isReportLoading || isSubmitting}
                >
                  <option value="" disabled>Appliquer un modèle…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {showConfirmApply && pendingTemplate && (
              <div className="template-confirm-banner">
                <span>Ce modèle remplacera le contenu existant.</span>
                <div className="template-confirm-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => applyTemplate(pendingTemplate)}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={() => { setShowConfirmApply(false); setPendingTemplate(null) }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="form-grid">
              <FormField label="RC" htmlFor="clinical_info">
                <textarea
                  id="clinical_info"
                  rows={4}
                  value={report.clinical_info}
                  disabled={isReportLoading || isSubmitting || isReportLocked}
                  onChange={(e) => setReport({ ...report, clinical_info: e.target.value })}
                />
              </FormField>

              <FormField label="Macroscopie" htmlFor="macroscopy">
                <textarea
                  id="macroscopy"
                  rows={4}
                  value={report.macroscopy}
                  disabled={isReportLoading || isSubmitting || isReportLocked}
                  onChange={(e) => setReport({ ...report, macroscopy: e.target.value })}
                />
              </FormField>

              <FormField label="Microscopie" htmlFor="microscopy">
                <textarea
                  id="microscopy"
                  rows={5}
                  value={report.microscopy}
                  disabled={isReportLoading || isSubmitting || isReportLocked}
                  onChange={(e) => setReport({ ...report, microscopy: e.target.value })}
                />
              </FormField>

              <FormField label="Conclusion" htmlFor="conclusion">
                <textarea
                  id="conclusion"
                  rows={4}
                  value={report.conclusion}
                  disabled={isReportLoading || isSubmitting || isReportLocked}
                  onChange={(e) => setReport({ ...report, conclusion: e.target.value })}
                />
              </FormField>
            </div>

            <div className="exam-detail-feedback" aria-live="polite">
              {isReportLoading ? <p className="report-loading">Chargement du compte rendu…</p> : null}
              {reportError ? <p className="error-message">{reportError}</p> : null}
              {reportInfo ? <p className="success-message">{reportInfo}</p> : null}
              {saveAsTemplateInfo ? <p className="success-message">{saveAsTemplateInfo}</p> : null}
            </div>

            {saveAsTemplateOpen && !isReportLocked && (
              <div className="save-as-template-row">
                <input
                  type="text"
                  placeholder="Nom du modèle"
                  value={saveAsTemplateName}
                  onChange={(e) => setSaveAsTemplateName(e.target.value)}
                  disabled={isSavingTemplate}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSaveAsTemplate() } }}
                  autoFocus
                />
                <button
                  type="button"
                  className="button"
                  onClick={() => void handleSaveAsTemplate()}
                  disabled={isSavingTemplate}
                >
                  {isSavingTemplate ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="button tertiary"
                  onClick={() => { setSaveAsTemplateOpen(false); setSaveAsTemplateName(''); setSaveAsTemplateError('') }}
                  disabled={isSavingTemplate}
                >
                  Annuler
                </button>
                {saveAsTemplateError ? <p className="error-message">{saveAsTemplateError}</p> : null}
              </div>
            )}

            {!isReportLocked && (
              <div className="form-actions form-actions-sticky">
                <button
                  type="button"
                  className="button tertiary"
                  disabled={isReportLoading || isSubmitting}
                  onClick={() => { setSaveAsTemplateOpen((v) => !v); setSaveAsTemplateError(''); setSaveAsTemplateInfo('') }}
                >
                  Sauvegarder comme modèle
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={isReportLoading || isSubmitting}
                >
                  {isSubmitting ? 'Enregistrement…' : 'Enregistrer le compte rendu'}
                </button>
              </div>
            )}
          </form>
        </section>

        <aside className="panel case-archive-side-panel">
          <div className="panel-header case-archive-side-panel-header">
            <div>
              <h2>Cas similaires</h2>
              <p>
                Recherche de référence parmi les cas validés du laboratoire à partir du contexte déjà enregistré dans ce dossier.
              </p>
            </div>

            <button
              type="button"
              className="button tertiary"
              onClick={() => setIsSimilarCasesOpen((currentValue) => !currentValue)}
            >
              {isSimilarCasesOpen ? 'Réduire' : 'Afficher'}
            </button>
          </div>

          {isSimilarCasesOpen && (
            <>
              <form className="case-archive-side-form" onSubmit={handleSubmitSimilarCases}>
                <label className="case-archive-side-search">
                  <span>Recherche contextuelle</span>
                  <input
                    type="text"
                    value={archiveQuery}
                    placeholder="Nature, mots-clés, contexte clinique…"
                    onChange={(event) => setArchiveQuery(event.target.value)}
                  />
                </label>

                <label className="case-archive-side-search">
                  <span>Section</span>
                  <select
                    value={archiveSection}
                    onChange={(event) => setArchiveSection(event.target.value as CaseArchiveSection)}
                  >
                    {ARCHIVE_SECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="case-archive-side-actions">
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={handleRefreshSimilarCases}
                    disabled={isSimilarCasesLoading}
                  >
                    Actualiser depuis le dossier
                  </button>
                  <button type="submit" className="button" disabled={isSimilarCasesLoading}>
                    {isSimilarCasesLoading ? 'Recherche…' : 'Rechercher'}
                  </button>
                </div>
              </form>

              <p className="case-archive-side-note">
                Les résultats restent limités au type de prélèvement courant et ce dossier est toujours exclu de la recherche.
              </p>

              <CaseArchiveResultList
                results={similarCases}
                loading={isSimilarCasesLoading}
                error={similarCasesError}
                info={similarCasesInfo}
                emptyTitle="Aucun cas similaire trouvé."
                emptyDescription="Ajustez les termes de recherche ou actualisez le contexte du dossier."
                compact
                openLinksInNewTab
              />
            </>
          )}
        </aside>
      </div>
    </PageContainer>
  )
}
