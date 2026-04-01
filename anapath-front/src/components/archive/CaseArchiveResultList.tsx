import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../StatusBadge'
import { caseArchiveService } from '../../services/caseArchiveService'
import type { CaseArchivePreview, CaseArchiveResult, ReportInput } from '../../types/domain'
import { displaySexFrench } from '../../utils/domainMappings'
import { formatDate, truncate } from '../../utils/formatting'

interface CaseArchiveResultListProps {
  results: CaseArchiveResult[]
  loading: boolean
  error?: string
  info?: string
  emptyTitle: string
  emptyDescription: string
  compact?: boolean
  openLinksInNewTab?: boolean
}

interface ArchivePreviewState {
  exam: CaseArchivePreview['exam'] | null
  report: ReportInput | null
  isLoading: boolean
  error: string
}

const SECTION_LABELS: Record<NonNullable<CaseArchiveResult['matched_section']>, string> = {
  clinical_info: 'RC',
  macroscopy: 'Macroscopie',
  microscopy: 'Microscopie',
  conclusion: 'Conclusion',
  sample_nature: 'Nature du prélèvement',
  exam_history: 'Renseignement clinique',
  diagnosis_keywords: 'Mots-clés',
}

const MATCH_REASON_LABELS: Record<NonNullable<CaseArchiveResult['match_reasons']>[number], string> = {
  same_exam_type: 'Même type',
  shared_keyword: 'Mot-clé partagé',
}

const emptyPreviewReport: ReportInput = {
  clinical_info: '',
  macroscopy: '',
  microscopy: '',
  conclusion: '',
}

function buildPreviewMeta(result: CaseArchiveResult) {
  const metaParts = [
    result.patient_age ? `${result.patient_age} ans` : '',
    displaySexFrench(result.patient_sex),
    formatDate(result.result_issued_date),
  ].filter(Boolean)

  return metaParts.join(' • ')
}

function renderPreviewReportSections(report: ReportInput) {
  const sections = [
    { key: 'clinical_info', label: 'RC', value: report.clinical_info },
    { key: 'macroscopy', label: 'Macroscopie', value: report.macroscopy },
    { key: 'microscopy', label: 'Microscopie', value: report.microscopy },
    { key: 'conclusion', label: 'Conclusion', value: report.conclusion },
  ].filter((section) => section.value.trim())

  if (sections.length === 0) {
    return <p className="case-archive-preview-empty">Aucun contenu de compte rendu disponible.</p>
  }

  return sections.map((section) => (
    <div key={section.key} className="case-archive-preview-section">
      <h4>{section.label}</h4>
      <p>{section.value}</p>
    </div>
  ))
}

export function CaseArchiveResultList({
  results,
  loading,
  error = '',
  info = '',
  emptyTitle,
  emptyDescription,
  compact = false,
  openLinksInNewTab = false,
}: CaseArchiveResultListProps) {
  const [openPreviewId, setOpenPreviewId] = useState<number | null>(null)
  const [previewByExamId, setPreviewByExamId] = useState<Record<string, ArchivePreviewState>>({})

  useEffect(() => {
    if (openPreviewId === null) return

    const hasOpenResult = results.some((result) => result.exam_id === openPreviewId)
    if (!hasOpenResult) {
      setOpenPreviewId(null)
    }
  }, [openPreviewId, results])

  const togglePreview = async (examId: number) => {
    if (openPreviewId === examId) {
      setOpenPreviewId(null)
      return
    }

    setOpenPreviewId(examId)

    const cacheKey = String(examId)
    const existingPreview = previewByExamId[cacheKey]

    if (existingPreview && (existingPreview.exam || existingPreview.error)) {
      return
    }

    setPreviewByExamId((previous) => ({
      ...previous,
      [cacheKey]: {
        exam: previous[cacheKey]?.exam ?? null,
        report: previous[cacheKey]?.report ?? null,
        isLoading: true,
        error: '',
      },
    }))

    try {
      const preview = await caseArchiveService.getPreview(examId)

      setPreviewByExamId((previous) => ({
        ...previous,
        [cacheKey]: {
          exam: preview.exam,
          report: preview.report ?? emptyPreviewReport,
          isLoading: false,
          error: '',
        },
      }))
    } catch (loadError) {
      setPreviewByExamId((previous) => ({
        ...previous,
        [cacheKey]: {
          exam: null,
          report: null,
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger l'aperçu du cas.",
        },
      }))
    }
  }

  if (loading) {
    return (
      <div className="case-archive-state">
        <p className="state-block-description">Chargement des cas archivés…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="case-archive-state case-archive-state--danger">
        <p className="state-block-title">{error}</p>
      </div>
    )
  }

  if (info && results.length === 0) {
    return (
      <div className="case-archive-state">
        <p className="state-block-title">{info}</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="case-archive-state">
        <p className="state-block-title">{emptyTitle}</p>
        <p className="state-block-description">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className={`case-archive-results${compact ? ' case-archive-results--compact' : ''}`}>
      {results.map((result) => {
        const preview = previewByExamId[String(result.exam_id)]
        const isPreviewOpen = openPreviewId === result.exam_id

        return (
          <article key={result.exam_id} className="case-archive-card">
            <div className="case-archive-card-head">
              <div>
                <div className="case-archive-card-ref-row">
                  <strong className="case-archive-card-ref">{result.exam_number}</strong>
                  <StatusBadge status={result.status} />
                </div>
                <p className="case-archive-card-meta">{buildPreviewMeta(result)}</p>
              </div>

              <div className="case-archive-card-actions">
                <button
                  type="button"
                  className="button tertiary case-archive-preview-toggle"
                  onClick={() => void togglePreview(result.exam_id)}
                >
                  {isPreviewOpen ? 'Masquer' : 'Aperçu'}
                </button>
                <Link
                  to={`/exams/${result.exam_id}`}
                  className="button case-archive-open-button"
                  target={openLinksInNewTab ? '_blank' : undefined}
                  rel={openLinksInNewTab ? 'noreferrer' : undefined}
                >
                  Ouvrir
                </Link>
              </div>
            </div>

            <p className="case-archive-card-sample">{result.sample_nature || 'Nature non renseignée'}</p>

            {result.diagnosis_keywords.length > 0 && (
              <div className="case-archive-chip-row">
                {result.diagnosis_keywords.map((keyword) => (
                  <span key={`${result.exam_id}-${keyword}`} className="keyword-chip">
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <div className="case-archive-chip-row case-archive-chip-row--secondary">
              <span className="case-archive-chip case-archive-chip--muted">
                {result.exam_type === 'histology' ? 'Histologie' : 'Cytologie'}
              </span>

              {result.matched_section && (
                <span className="case-archive-chip case-archive-chip--accent">
                  Correspondance : {SECTION_LABELS[result.matched_section]}
                </span>
              )}

              {result.match_reasons?.map((reason) => (
                <span key={`${result.exam_id}-${reason}`} className="case-archive-chip case-archive-chip--subtle">
                  {MATCH_REASON_LABELS[reason]}
                </span>
              ))}
            </div>

            {result.matched_excerpt && (
              <div className="case-archive-snippet">
                <p className="case-archive-snippet-label">Extrait pertinent</p>
                <p>{truncate(result.matched_excerpt, compact ? 200 : 260)}</p>
              </div>
            )}

            {result.conclusion_preview && result.matched_section !== 'conclusion' && (
              <div className="case-archive-conclusion-preview">
                <p className="case-archive-snippet-label">Conclusion</p>
                <p>{truncate(result.conclusion_preview, compact ? 180 : 240)}</p>
              </div>
            )}

            {isPreviewOpen && (
              <div className="case-archive-preview">
                {preview?.isLoading ? (
                  <p className="report-loading">Chargement de l'aperçu…</p>
                ) : preview?.error ? (
                  <p className="error-message">{preview.error}</p>
                ) : preview?.exam ? (
                  <>
                    <div className="case-archive-preview-head">
                      <div>
                        <h3>Aperçu du cas</h3>
                        <p>
                          {preview.exam.exam_number} • {formatDate(preview.exam.result_issued_date)}
                        </p>
                      </div>

                      <Link
                        to={`/exams/${result.exam_id}`}
                        className="text-link"
                        target={openLinksInNewTab ? '_blank' : undefined}
                        rel={openLinksInNewTab ? 'noreferrer' : undefined}
                      >
                        Voir le dossier complet →
                      </Link>
                    </div>

                    <dl className="case-archive-preview-meta">
                      <div>
                        <dt>Type</dt>
                        <dd>{preview.exam.exam_type === 'histology' ? 'Histologie' : 'Cytologie'}</dd>
                      </div>
                      <div>
                        <dt>Nature</dt>
                        <dd>{preview.exam.sample_nature || '—'}</dd>
                      </div>
                      <div>
                        <dt>RC</dt>
                        <dd>{preview.exam.exam_history || '—'}</dd>
                      </div>
                    </dl>

                    <div className="case-archive-preview-report">
                      {renderPreviewReportSections(preview.report ?? emptyPreviewReport)}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
