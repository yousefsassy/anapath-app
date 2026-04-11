import type { Dispatch, FormEvent, KeyboardEvent, SetStateAction } from 'react'
import { FormField } from '../../components/FormField'
import type {
  ReportInput,
  ReportRevisionDetail,
  ReportRevisionSummary,
  ReportTemplate,
} from '../../types/domain'
import { FORM_LIMITS } from '../../utils/formLimits'

const REPORT_REVISION_REASON_LABELS = {
  save: 'Enregistrement',
  validation: 'Validation',
  restore: 'Restauration',
} as const

const REVISION_SECTIONS: Array<{
  key: keyof ReportInput
  label: string
  description: string
}> = [
  {
    key: 'clinical_info',
    label: 'RC',
    description: 'Contexte clinique et informations transmises avec le prélèvement.',
  },
  {
    key: 'macroscopy',
    label: 'Macroscopie',
    description: 'Description macroscopique du prélèvement et de son aspect.',
  },
  {
    key: 'microscopy',
    label: 'Microscopie',
    description: 'Observations histologiques ou cytologiques détaillées.',
  },
  {
    key: 'conclusion',
    label: 'Conclusion',
    description: 'Synthèse diagnostique destinée à la validation finale.',
  },
]

interface ExamReportPanelProps {
  report: ReportInput
  setReport: Dispatch<SetStateAction<ReportInput>>
  revisions: ReportRevisionSummary[]
  selectedRevisionId: number | null
  selectedRevision: ReportRevisionDetail | null
  templates: ReportTemplate[]
  pendingTemplate: ReportTemplate | null
  showConfirmApply: boolean
  saveAsTemplateOpen: boolean
  saveAsTemplateName: string
  saveAsTemplateError: string
  saveAsTemplateInfo: string
  reportError: string
  reportInfo: string
  isReportLoading: boolean
  isSubmitting: boolean
  isReportLocked: boolean
  isHistoryOpen: boolean
  isHistoryLoading: boolean
  isRevisionLoading: boolean
  isRestoringRevision: boolean
  isStatusUpdating: boolean
  isReopenConfirmOpen: boolean
  isRestoreConfirmOpen: boolean
  isSavingTemplate: boolean
  historyError: string
  revisionDetailError: string
  onSubmitReport: (event: FormEvent<HTMLFormElement>) => void
  onConfirmReopen: () => Promise<void>
  onSelectRevision: (revisionId: number) => void
  onToggleHistory: () => void
  onToggleRestoreConfirm: (value: boolean) => void
  onRestoreRevision: () => Promise<void>
  onApplyTemplate: (templateId: string) => void
  onApplyPendingTemplate: (template: ReportTemplate) => void
  onToggleReopenConfirm: (value: boolean) => void
  onToggleSaveAsTemplate: (value: boolean) => void
  onSaveAsTemplateNameChange: (value: string) => void
  onSaveAsTemplate: () => Promise<void>
  onSaveAsTemplateErrorReset: () => void
  onSaveAsTemplateInfoReset: () => void
  onDismissTemplateConfirmation: () => void
}

export function ExamReportPanel({
  report,
  setReport,
  revisions,
  selectedRevisionId,
  selectedRevision,
  templates,
  pendingTemplate,
  showConfirmApply,
  saveAsTemplateOpen,
  saveAsTemplateName,
  saveAsTemplateError,
  saveAsTemplateInfo,
  reportError,
  reportInfo,
  isReportLoading,
  isSubmitting,
  isReportLocked,
  isHistoryOpen,
  isHistoryLoading,
  isRevisionLoading,
  isRestoringRevision,
  isStatusUpdating,
  isReopenConfirmOpen,
  isRestoreConfirmOpen,
  isSavingTemplate,
  historyError,
  revisionDetailError,
  onSubmitReport,
  onConfirmReopen,
  onSelectRevision,
  onToggleHistory,
  onToggleRestoreConfirm,
  onRestoreRevision,
  onApplyTemplate,
  onApplyPendingTemplate,
  onToggleReopenConfirm,
  onToggleSaveAsTemplate,
  onSaveAsTemplateNameChange,
  onSaveAsTemplate,
  onSaveAsTemplateErrorReset,
  onSaveAsTemplateInfoReset,
  onDismissTemplateConfirmation,
}: ExamReportPanelProps) {
  const handleTemplateNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void onSaveAsTemplate()
    }
  }

  const formatRevisionDateTime = (value: string) => {
    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date inconnue'
    }

    return parsedDate.toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const restoreDisabled =
    isReportLocked
    || isRevisionLoading
    || isRestoringRevision
    || selectedRevision === null
    || isSubmitting
    || isReportLoading

  const renderRevisionContent = () => {
    if (isHistoryLoading) {
      return <p className="report-loading">Chargement de l'historique…</p>
    }

    if (historyError) {
      return <p className="error-message">{historyError}</p>
    }

    if (revisions.length === 0) {
      return (
        <p className="report-history-empty">
          Aucune version enregistrée pour ce compte rendu.
        </p>
      )
    }

    return (
      <div className="report-history-layout">
        <div className="report-history-list" role="list" aria-label="Historique du compte rendu">
          {revisions.map((revision) => {
            const isActive = revision.id === selectedRevisionId

            return (
              <button
                key={revision.id}
                type="button"
                className={`report-history-item${isActive ? ' report-history-item--active' : ''}`}
                onClick={() => onSelectRevision(revision.id)}
              >
                <span className="report-history-item-reason">
                  {REPORT_REVISION_REASON_LABELS[revision.snapshot_reason]}
                </span>
                <strong>{formatRevisionDateTime(revision.created_at)}</strong>
                <span className="report-history-item-actor">
                  {revision.actor_full_name || 'Utilisateur inconnu'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="report-history-preview" aria-live="polite">
          {isRevisionLoading ? <p className="report-loading">Chargement de la version…</p> : null}
          {!isRevisionLoading && revisionDetailError ? (
            <p className="error-message">{revisionDetailError}</p>
          ) : null}
          {!isRevisionLoading && !revisionDetailError && !selectedRevision ? (
            <p className="report-history-empty">Sélectionnez une version pour afficher son contenu.</p>
          ) : null}

          {!isRevisionLoading && !revisionDetailError && selectedRevision ? (
            <>
              <div className="report-history-preview-head">
                <div>
                  <h3>Version sélectionnée</h3>
                  <p>
                    {REPORT_REVISION_REASON_LABELS[selectedRevision.snapshot_reason]}
                    {' • '}
                    {formatRevisionDateTime(selectedRevision.created_at)}
                    {' • '}
                    {selectedRevision.actor_full_name || 'Utilisateur inconnu'}
                  </p>
                </div>

                {!isReportLocked ? (
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={() => onToggleRestoreConfirm(!isRestoreConfirmOpen)}
                    disabled={restoreDisabled}
                  >
                    Restaurer cette version
                  </button>
                ) : null}
              </div>

              {isReportLocked ? (
                <p className="report-history-note">
                  Historique disponible en lecture seule. Rouvrez le dossier pour restaurer une version.
                </p>
              ) : null}

              {isRestoreConfirmOpen && !isReportLocked ? (
                <div className="template-confirm-banner">
                  <span>Cette restauration remplacera le brouillon actuel du compte rendu.</span>
                  <div className="template-confirm-actions">
                    <button
                      type="button"
                      className="button"
                      onClick={() => void onRestoreRevision()}
                      disabled={restoreDisabled}
                    >
                      {isRestoringRevision ? 'Restauration…' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      className="button tertiary"
                      onClick={() => onToggleRestoreConfirm(false)}
                      disabled={isRestoringRevision}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="report-history-sections">
                {REVISION_SECTIONS.map((section) => {
                  const currentValue = report[section.key]
                  const revisionValue = selectedRevision[section.key]
                  const hasChanged = currentValue !== revisionValue

                  return (
                    <div key={section.key} className="report-history-section">
                      <div className="report-history-section-head">
                        <div>
                          <h4>{section.label}</h4>
                          <p>{section.description}</p>
                        </div>
                        <span
                          className={`report-history-compare-badge${
                            hasChanged
                              ? ' report-history-compare-badge--changed'
                              : ' report-history-compare-badge--same'
                          }`}
                        >
                          {hasChanged ? 'Modifié' : 'Identique'}
                        </span>
                      </div>
                      <p className="report-history-section-body">
                        {revisionValue.trim() || '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
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
                onClick={() => onToggleReopenConfirm(true)}
                disabled={isStatusUpdating}
              >
                Rouvrir le rapport
              </button>
            </div>
          ) : (
            <p>Rédigez le compte rendu structuré dans un espace de lecture confortable et stable.</p>
          )}
        </div>
        <div className="exam-report-header-actions">
          <button
            type="button"
            className="button tertiary"
            onClick={onToggleHistory}
          >
            {isHistoryOpen ? 'Masquer historique' : 'Historique'}
          </button>
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
                onClick={() => onToggleReopenConfirm(false)}
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
              onChange={(e) => onApplyTemplate(e.target.value)}
              disabled={isReportLoading || isSubmitting}
            >
              <option value="" disabled>Appliquer un modèle…</option>
              {templates.map((template) => (
                <option key={template.id} value={String(template.id)}>{template.name}</option>
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
                onClick={() => onApplyPendingTemplate(pendingTemplate)}
              >
                Confirmer
              </button>
              <button
                type="button"
                className="button tertiary"
                onClick={onDismissTemplateConfirmation}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {isHistoryOpen && (
          <section className="report-history-shell">
            <div className="report-history-shell-head">
              <h3>Historique du compte rendu</h3>
              <p>Consultez les versions précédentes et restaurez une rédaction antérieure si nécessaire.</p>
            </div>
            {renderRevisionContent()}
          </section>
        )}

        <div className="report-sections-grid">
          {REVISION_SECTIONS.map((section) => (
            <div
              key={section.key}
              className={`report-section-card${
                section.key === 'conclusion' ? ' report-section-card--conclusion' : ''
              }`}
            >
              <div className="report-section-card-head">
                <h3>{section.label}</h3>
                <p>{section.description}</p>
              </div>
              <FormField label={section.label} htmlFor={section.key}>
                <textarea
                  id={section.key}
                  rows={section.key === 'microscopy' ? 5 : 4}
                  value={report[section.key]}
                  disabled={isReportLoading || isSubmitting || isReportLocked}
                  onChange={(event) => setReport({ ...report, [section.key]: event.target.value })}
                  maxLength={FORM_LIMITS.narrativeSection}
                />
              </FormField>
            </div>
          ))}
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
              onChange={(e) => onSaveAsTemplateNameChange(e.target.value)}
              disabled={isSavingTemplate}
              onKeyDown={handleTemplateNameKeyDown}
              autoFocus
              maxLength={FORM_LIMITS.templateName}
            />
            <button
              type="button"
              className="button"
              onClick={() => void onSaveAsTemplate()}
              disabled={isSavingTemplate}
            >
              {isSavingTemplate ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              className="button tertiary"
              onClick={() => {
                onToggleSaveAsTemplate(false)
                onSaveAsTemplateNameChange('')
                onSaveAsTemplateErrorReset()
              }}
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
              onClick={() => {
                onToggleSaveAsTemplate(!saveAsTemplateOpen)
                onSaveAsTemplateErrorReset()
                onSaveAsTemplateInfoReset()
              }}
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
  )
}
