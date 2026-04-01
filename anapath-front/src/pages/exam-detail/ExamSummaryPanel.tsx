import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { FormField } from '../../components/FormField'
import { StatusBadge } from '../../components/StatusBadge'
import type { UpdateExamInput } from '../../services/examService'
import type { Exam } from '../../types/domain'
import { formatDate } from '../../utils/formatting'
import { FORM_LIMITS } from '../../utils/formLimits'

interface ExamSummaryPanelProps {
  exam: Exam
  examId: string
  examForm: UpdateExamInput
  setExamForm: Dispatch<SetStateAction<UpdateExamInput>>
  isEditingExam: boolean
  isExamSubmitting: boolean
  isStatusUpdating: boolean
  currentStatus: 'registered' | 'in_progress' | 'completed'
  statusAction?: { label: string; next: 'in_progress' | 'completed' }
  statusError: string
  examUpdateError: string
  examUpdateInfo: string
  onSubmitExamUpdate: (event: FormEvent<HTMLFormElement>) => void
  onEditExam: () => void
  onCancelEditExam: () => void
  onUpdateStatus: (next: 'in_progress' | 'completed') => Promise<void>
}

export function ExamSummaryPanel({
  exam,
  examId,
  examForm,
  setExamForm,
  isEditingExam,
  isExamSubmitting,
  isStatusUpdating,
  currentStatus,
  statusAction,
  statusError,
  examUpdateError,
  examUpdateInfo,
  onSubmitExamUpdate,
  onEditExam,
  onCancelEditExam,
  onUpdateStatus,
}: ExamSummaryPanelProps) {
  return (
    <section className="panel exam-detail-summary-panel">
      <form onSubmit={onSubmitExamUpdate}>
        <div className="panel-header exam-detail-summary-header">
          <div>
            <h2>Informations du prélèvement</h2>
          </div>
          <div className="form-actions exam-detail-status-actions">
            <StatusBadge status={exam.status} />

            <Link
              to={`/exams/${examId}/print`}
              className="button tertiary"
              target="_blank"
              rel="noopener noreferrer"
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

            {!isEditingExam && currentStatus !== 'completed' ? (
              <button
                type="button"
                className="button tertiary"
                onClick={onEditExam}
                disabled={isExamSubmitting}
              >
                Modifier
              </button>
            ) : isEditingExam ? (
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
            ) : null}
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
                  maxLength={FORM_LIMITS.fixedExamField}
                />
              </FormField>

              <FormField label="Clinique" htmlFor="clinic_name">
                <input
                  id="clinic_name"
                  value={examForm.clinic_name}
                  onChange={(e) => setExamForm({ ...examForm, clinic_name: e.target.value })}
                  disabled={isExamSubmitting}
                  maxLength={FORM_LIMITS.fixedExamField}
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
                  maxLength={FORM_LIMITS.fixedExamField}
                />
              </FormField>

              <FormField label="Renseignement clinique" htmlFor="exam_history">
                <textarea
                  id="exam_history"
                  rows={3}
                  value={examForm.exam_history}
                  onChange={(e) => setExamForm({ ...examForm, exam_history: e.target.value })}
                  disabled={isExamSubmitting}
                  maxLength={FORM_LIMITS.examHistory}
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
  )
}
