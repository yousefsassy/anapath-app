import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { ExamReportPanel } from './exam-detail/ExamReportPanel'
import { ExamSimilarCasesPanel } from './exam-detail/ExamSimilarCasesPanel'
import { ExamSummaryPanel } from './exam-detail/ExamSummaryPanel'
import {
  ARCHIVE_SECTION_OPTIONS,
  STATUS_NEXT,
  SIMILAR_CASES_CONTEXT_HINT,
  buildArchiveContextQuery,
  emptyExamForm,
  emptyReport,
  toExamEditForm,
} from './exam-detail/examDetailUtils'
import { caseArchiveService } from '../services/caseArchiveService'
import { examService } from '../services/examService'
import type { UpdateExamInput } from '../services/examService'
import { patientService } from '../services/patientService'
import { reportTemplateService } from '../services/reportTemplateService'
import type {
  CaseArchiveResult,
  CaseArchiveSection,
  Exam,
  ExamWithReportSummary,
  ReportInput,
  ReportRevisionDetail,
  ReportRevisionSummary,
  ReportTemplate,
} from '../types/domain'
import { mapExamStatusToBackend } from '../utils/domainMappings'
import { formatDate, truncate } from '../utils/formatting'

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [revisions, setRevisions] = useState<ReportRevisionSummary[]>([])
  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null)
  const [selectedRevision, setSelectedRevision] = useState<ReportRevisionDetail | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [revisionDetailError, setRevisionDetailError] = useState('')
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isRevisionLoading, setIsRevisionLoading] = useState(false)
  const [isRestoringRevision, setIsRestoringRevision] = useState(false)
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false)

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

  const loadReportHistory = async (
    options: { keepCurrentSelection?: boolean; selectLatest?: boolean } = {},
  ) => {
    setIsHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await examService.listReportRevisionsByExamId(id)
      setRevisions(data)

      if (data.length === 0) {
        setSelectedRevisionId(null)
        setSelectedRevision(null)
        return
      }

      if (options.selectLatest) {
        setSelectedRevisionId(data[0].id)
        return
      }

      if (
        options.keepCurrentSelection
        && selectedRevisionId !== null
        && data.some((revision) => revision.id === selectedRevisionId)
      ) {
        return
      }

      setSelectedRevisionId(data[0].id)
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Impossible de charger l'historique."
      )
    } finally {
      setIsHistoryLoading(false)
    }
  }

  // Load exam + report --------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setIsReportLoading(true)
      setError('')
      setReportError('')
      try {
        const workspace = await examService.getWorkspaceByExamId(id)
        setExam(workspace?.exam ?? null)
        if (workspace) {
          setExamForm(toExamEditForm(workspace.exam))
          setReport(workspace.report)
        } else {
          setReport(emptyReport)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le prélèvement.')
      } finally {
        setIsLoading(false)
        setIsReportLoading(false)
      }
    }
    void load()
  }, [id])

  useEffect(() => {
    setIsHistoryOpen(false)
    setRevisions([])
    setSelectedRevisionId(null)
    setSelectedRevision(null)
    setHistoryError('')
    setRevisionDetailError('')
    setIsRestoreConfirmOpen(false)
  }, [id])

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

  useEffect(() => {
    if (!isHistoryOpen) {
      setIsRestoreConfirmOpen(false)
      return
    }

    void loadReportHistory({
      keepCurrentSelection: true,
      selectLatest: selectedRevisionId === null,
    })
  }, [id, isHistoryOpen])

  useEffect(() => {
    if (!isHistoryOpen || selectedRevisionId === null) {
      setSelectedRevision(null)
      setRevisionDetailError('')
      setIsRevisionLoading(false)
      return
    }

    let isMounted = true

    const loadRevisionDetail = async () => {
      setIsRevisionLoading(true)
      setRevisionDetailError('')
      try {
        const detail = await examService.getReportRevisionById(id, selectedRevisionId)
        if (!isMounted) return

        if (!detail) {
          setSelectedRevision(null)
          setRevisionDetailError('Version introuvable.')
          return
        }

        setSelectedRevision(detail)
      } catch (err) {
        if (!isMounted) return
        setSelectedRevision(null)
        setRevisionDetailError(
          err instanceof Error ? err.message : "Impossible de charger la version."
        )
      } finally {
        if (isMounted) {
          setIsRevisionLoading(false)
        }
      }
    }

    void loadRevisionDetail()

    return () => {
      isMounted = false
    }
  }, [id, isHistoryOpen, selectedRevisionId])

  // Edit exam ----------------------------------------------------------------
  const onEditExam = () => {
    if (!exam || mapExamStatusToBackend(exam.status) === 'completed') return
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
        if (isHistoryOpen) {
          void loadReportHistory({ keepCurrentSelection: true })
        }
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
        if (isHistoryOpen) {
          void loadReportHistory({ keepCurrentSelection: true })
        }
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
      if (isHistoryOpen) {
        void loadReportHistory({ selectLatest: true })
      }
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le compte rendu."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const onToggleHistory = () => {
    setHistoryError('')
    setRevisionDetailError('')
    setIsRestoreConfirmOpen(false)
    setIsHistoryOpen((current) => !current)
  }

  const onRestoreRevision = async () => {
    if (selectedRevisionId === null) return

    setReportError('')
    setReportInfo('')
    setIsRestoringRevision(true)
    try {
      const restored = await examService.restoreReportRevisionById(id, selectedRevisionId)
      if (!restored) {
        setReportError('Version introuvable pour cette restauration.')
        return
      }

      setReport(restored)
      setReportInfo('Version restaurée.')
      setIsRestoreConfirmOpen(false)
      if (isHistoryOpen) {
        void loadReportHistory({ selectLatest: true })
      }
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : 'Impossible de restaurer cette version.'
      )
    } finally {
      setIsRestoringRevision(false)
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

      <section className="panel exam-case-strip">
        <div className="exam-case-strip-main">
          <span className="page-header-kicker">Dossier actif</span>
          <h2>{patientName || 'Patient en cours de traitement'}</h2>
          <p>
            {exam.sample_nature || 'Nature non renseignée'}
            {exam.clinic_name ? ` • ${exam.clinic_name}` : ''}
          </p>
        </div>

        <div className="exam-case-strip-meta">
          <div className="exam-case-strip-card">
            <span>Statut</span>
            <StatusBadge status={exam.status} />
          </div>
          <div className="exam-case-strip-card">
            <span>Réception</span>
            <strong>{formatDate(exam.registered_date)}</strong>
          </div>
          <div className="exam-case-strip-card">
            <span>Type</span>
            <strong>{exam.exam_type === 'histology' ? 'Histologie' : 'Cytologie'}</strong>
          </div>
        </div>
      </section>

      <ExamSummaryPanel
        exam={exam}
        examId={id}
        examForm={examForm}
        setExamForm={setExamForm}
        isEditingExam={isEditingExam}
        isExamSubmitting={isExamSubmitting}
        isStatusUpdating={isStatusUpdating}
        currentStatus={currentStatus}
        statusAction={statusAction}
        statusError={statusError}
        examUpdateError={examUpdateError}
        examUpdateInfo={examUpdateInfo}
        onSubmitExamUpdate={onSubmitExamUpdate}
        onEditExam={onEditExam}
        onCancelEditExam={onCancelEditExam}
        onUpdateStatus={onUpdateStatus}
      />

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
      <ExamReportPanel
        report={report}
        setReport={setReport}
        revisions={revisions}
        selectedRevisionId={selectedRevisionId}
        selectedRevision={selectedRevision}
        templates={templates}
        pendingTemplate={pendingTemplate}
        showConfirmApply={showConfirmApply}
        saveAsTemplateOpen={saveAsTemplateOpen}
        saveAsTemplateName={saveAsTemplateName}
          saveAsTemplateError={saveAsTemplateError}
          saveAsTemplateInfo={saveAsTemplateInfo}
          reportError={reportError}
        reportInfo={reportInfo}
        isReportLoading={isReportLoading}
        isSubmitting={isSubmitting}
        isReportLocked={isReportLocked}
        isHistoryOpen={isHistoryOpen}
        isHistoryLoading={isHistoryLoading}
        isRevisionLoading={isRevisionLoading}
        isRestoringRevision={isRestoringRevision}
        isStatusUpdating={isStatusUpdating}
        isReopenConfirmOpen={isReopenConfirmOpen}
        isRestoreConfirmOpen={isRestoreConfirmOpen}
        isSavingTemplate={isSavingTemplate}
        historyError={historyError}
        revisionDetailError={revisionDetailError}
        onSubmitReport={onSubmitReport}
        onConfirmReopen={onConfirmReopen}
        onSelectRevision={setSelectedRevisionId}
        onToggleHistory={onToggleHistory}
        onToggleRestoreConfirm={setIsRestoreConfirmOpen}
        onRestoreRevision={onRestoreRevision}
        onApplyTemplate={handleApplyTemplate}
        onApplyPendingTemplate={applyTemplate}
        onToggleReopenConfirm={setIsReopenConfirmOpen}
        onToggleSaveAsTemplate={setSaveAsTemplateOpen}
        onSaveAsTemplateNameChange={setSaveAsTemplateName}
          onSaveAsTemplate={handleSaveAsTemplate}
          onSaveAsTemplateErrorReset={() => setSaveAsTemplateError('')}
          onSaveAsTemplateInfoReset={() => setSaveAsTemplateInfo('')}
          onDismissTemplateConfirmation={() => {
            setShowConfirmApply(false)
            setPendingTemplate(null)
          }}
        />

        <ExamSimilarCasesPanel
          archiveQuery={archiveQuery}
          archiveSection={archiveSection}
          isOpen={isSimilarCasesOpen}
          loading={isSimilarCasesLoading}
          error={similarCasesError}
          info={similarCasesInfo}
          sectionOptions={ARCHIVE_SECTION_OPTIONS}
          results={similarCases}
          onToggleOpen={() => setIsSimilarCasesOpen((currentValue) => !currentValue)}
          onSubmit={handleSubmitSimilarCases}
          onQueryChange={setArchiveQuery}
          onSectionChange={setArchiveSection}
          onRefresh={handleRefreshSimilarCases}
        />
      </div>
    </PageContainer>
  )
}
