import type { Dispatch, FormEvent, KeyboardEvent, SetStateAction } from 'react'
import { FormField } from '../../components/FormField'
import type { ReportInput, ReportTemplate } from '../../types/domain'
import { FORM_LIMITS } from '../../utils/formLimits'

interface ExamReportPanelProps {
  report: ReportInput
  setReport: Dispatch<SetStateAction<ReportInput>>
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
  isStatusUpdating: boolean
  isReopenConfirmOpen: boolean
  isSavingTemplate: boolean
  onSubmitReport: (event: FormEvent<HTMLFormElement>) => void
  onConfirmReopen: () => Promise<void>
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
  isStatusUpdating,
  isReopenConfirmOpen,
  isSavingTemplate,
  onSubmitReport,
  onConfirmReopen,
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

        <div className="form-grid">
          <FormField label="RC" htmlFor="clinical_info">
            <textarea
              id="clinical_info"
              rows={4}
              value={report.clinical_info}
              disabled={isReportLoading || isSubmitting || isReportLocked}
              onChange={(e) => setReport({ ...report, clinical_info: e.target.value })}
              maxLength={FORM_LIMITS.narrativeSection}
            />
          </FormField>

          <FormField label="Macroscopie" htmlFor="macroscopy">
            <textarea
              id="macroscopy"
              rows={4}
              value={report.macroscopy}
              disabled={isReportLoading || isSubmitting || isReportLocked}
              onChange={(e) => setReport({ ...report, macroscopy: e.target.value })}
              maxLength={FORM_LIMITS.narrativeSection}
            />
          </FormField>

          <FormField label="Microscopie" htmlFor="microscopy">
            <textarea
              id="microscopy"
              rows={5}
              value={report.microscopy}
              disabled={isReportLoading || isSubmitting || isReportLocked}
              onChange={(e) => setReport({ ...report, microscopy: e.target.value })}
              maxLength={FORM_LIMITS.narrativeSection}
            />
          </FormField>

          <FormField label="Conclusion" htmlFor="conclusion">
            <textarea
              id="conclusion"
              rows={4}
              value={report.conclusion}
              disabled={isReportLoading || isSubmitting || isReportLocked}
              onChange={(e) => setReport({ ...report, conclusion: e.target.value })}
              maxLength={FORM_LIMITS.narrativeSection}
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
