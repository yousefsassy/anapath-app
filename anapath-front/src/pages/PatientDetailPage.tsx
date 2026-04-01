import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { patientService } from '../services/patientService'
import type { UpdatePatientInput } from '../services/patientService'
import type { ExamWithReportSummary, Patient } from '../types/domain'
import { displaySexFrench, mapSexBackendToDisplay } from '../utils/domainMappings'
import { formatDate, truncate } from '../utils/formatting'

const emptyPatientForm: UpdatePatientInput = {
  first_name: '',
  last_name: '',
  age: 0,
  sex: 'Female',
  phone: '',
  general_history: '',
}

function toPatientEditForm(patient: Patient): UpdatePatientInput {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    age: Number(patient.age),
    sex: mapSexBackendToDisplay(patient.sex),
    phone: patient.phone ?? '',
    general_history: patient.general_history ?? '',
  }
}



export function PatientDetailPage() {
  const { id = '' } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [exams, setExams] = useState<ExamWithReportSummary[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [examsError, setExamsError] = useState('')
  const [isEditingPatient, setIsEditingPatient] = useState(false)
  const [isPatientSubmitting, setIsPatientSubmitting] = useState(false)
  const [patientForm, setPatientForm] = useState<UpdatePatientInput>(emptyPatientForm)
  const [patientUpdateError, setPatientUpdateError] = useState('')
  const [patientUpdateInfo, setPatientUpdateInfo] = useState('')

  useEffect(() => {
    const loadPatient = async () => {
      setIsLoading(true)
      setError('')
      try {
        const patientData = await patientService.getById(id)
        setPatient(patientData)
        if (patientData) setPatientForm(toPatientEditForm(patientData))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le patient.')
      } finally {
        setIsLoading(false)
      }
    }
    void loadPatient()
  }, [id])

  useEffect(() => {
    if (!patient) {
      setExams([])
      setExamsLoading(false)
      return
    }
    const loadExams = async () => {
      setExamsLoading(true)
      setExamsError('')
      try {
        const examData = await patientService.getExamsWithReportSummary(id)
        setExams(examData)
      } catch (loadError) {
        setExamsError(
          loadError instanceof Error ? loadError.message : 'Impossible de charger les prélèvements.'
        )
      } finally {
        setExamsLoading(false)
      }
    }
    void loadExams()
  }, [id, patient])

  const onEditPatient = () => {
    if (!patient) return
    setPatientUpdateError('')
    setPatientUpdateInfo('')
    setPatientForm(toPatientEditForm(patient))
    setIsEditingPatient(true)
  }

  const onCancelEditPatient = () => {
    if (patient) setPatientForm(toPatientEditForm(patient))
    setPatientUpdateError('')
    setPatientUpdateInfo('')
    setIsEditingPatient(false)
  }

  const onSubmitPatientUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPatientSubmitting) return
    setPatientUpdateError('')
    setPatientUpdateInfo('')

    if (!patientForm.first_name.trim() || !patientForm.last_name.trim()) {
      setPatientUpdateError('Le prénom et le nom sont obligatoires.')
      return
    }
    if (patientForm.age <= 0) {
      setPatientUpdateError("L'âge doit être supérieur à 0.")
      return
    }

    setIsPatientSubmitting(true)
    try {
      const updatedPatient = await patientService.update(id, patientForm)
      if (!updatedPatient) {
        setPatientUpdateError('Patient introuvable pour la mise à jour.')
        return
      }
      setPatient(updatedPatient)
      setPatientForm(toPatientEditForm(updatedPatient))
      setIsEditingPatient(false)
      setPatientUpdateInfo('Patient mis à jour.')
    } catch (updateError) {
      setPatientUpdateError(
        updateError instanceof Error ? updateError.message : 'Impossible de mettre à jour le patient.'
      )
    } finally {
      setIsPatientSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <p className="report-loading">Chargement du patient…</p>
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

  if (!patient) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <h2>Patient introuvable</h2>
          <p>Ce patient n'existe pas ou a été supprimé.</p>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={`${patient.last_name} ${patient.first_name}`}
        subtitle="Dossier patient — informations et historique des prélèvements."
        breadcrumbs={[
          { label: 'Accueil', to: '/dashboard' },
          { label: 'Patients', to: '/patients' },
          { label: `${patient.last_name} ${patient.first_name}` },
        ]}
        action={
          <Link to={`/patients/${patient.id}/exams/new`} className="button">
            + Nouveau prélèvement
          </Link>
        }
      />

      {/* Patient info */}
      <section className="panel">
        <form onSubmit={onSubmitPatientUpdate}>
          <div className="panel-header">
            <div>
              <h2>Informations patient</h2>
            </div>
            {isEditingPatient ? (
              <div className="form-actions">
                <button
                  type="button"
                  className="button tertiary"
                  onClick={onCancelEditPatient}
                  disabled={isPatientSubmitting}
                >
                  Annuler
                </button>
                <button type="submit" className="button" disabled={isPatientSubmitting}>
                  {isPatientSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button tertiary"
                onClick={onEditPatient}
                disabled={isLoading || isPatientSubmitting}
              >
                Modifier
              </button>
            )}
          </div>

          {patientUpdateError ? <p className="error-message">{patientUpdateError}</p> : null}
          {isPatientSubmitting ? <p className="report-loading">Enregistrement…</p> : null}
          {patientUpdateInfo ? <p className="success-message">{patientUpdateInfo}</p> : null}

          {isEditingPatient ? (
            <section className="form-section">
              <div className="form-grid">
                <FormField label="Prénom" htmlFor="first_name">
                  <input
                    id="first_name"
                    value={patientForm.first_name}
                    onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Nom" htmlFor="last_name">
                  <input
                    id="last_name"
                    value={patientForm.last_name}
                    onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Âge" htmlFor="age">
                  <input
                    id="age"
                    type="number"
                    min={1}
                    value={patientForm.age || ''}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, age: Number(e.target.value) || 0 })
                    }
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Sexe" htmlFor="sex">
                  <select
                    id="sex"
                    value={patientForm.sex}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        sex: e.target.value as UpdatePatientInput['sex'],
                      })
                    }
                    disabled={isPatientSubmitting}
                  >
                    <option value="Female">Femme</option>
                    <option value="Male">Homme</option>
                  </select>
                </FormField>

                <FormField label="Téléphone" htmlFor="phone">
                  <input
                    id="phone"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Antécédents" htmlFor="general_history">
                  <textarea
                    id="general_history"
                    rows={4}
                    value={patientForm.general_history}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, general_history: e.target.value })
                    }
                    disabled={isPatientSubmitting}
                  />
                </FormField>
              </div>
            </section>
          ) : (
            <div className="detail-grid">
              <p>
                <strong>Âge :</strong> {patient.age} ans
              </p>
              <p>
                <strong>Date de naissance :</strong> {formatDate(patient.birth_date)}
              </p>
              <p>
                <strong>Sexe :</strong> {displaySexFrench(patient.sex)}
              </p>
              <p>
                <strong>Téléphone :</strong> {patient.phone || '—'}
              </p>
              <p>
                <strong>Enregistré le :</strong> {formatDate(patient.created_at)}
              </p>
              <p className="full-row">
                <strong>Antécédents :</strong>{' '}
                {patient.general_history || <em className="text-muted">Non renseigné</em>}
              </p>
            </div>
          )}
        </form>
      </section>

      {/* Prélèvements */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Prélèvements</h2>
            <p>Historique des prélèvements pour ce patient, du plus récent au plus ancien.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="patient-detail-exams-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Nature</th>
                <th>Date réception</th>
                <th>Statut</th>
                <th>Conclusion</th>
                <th aria-label="Action"></th>
              </tr>
            </thead>
            <tbody>
              {examsLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-state-cell">Chargement…</div>
                  </td>
                </tr>
              ) : examsError ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-state-cell table-state-cell--danger">{examsError}</div>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-state-cell">
                      <p className="state-block-title">Aucun prélèvement enregistré.</p>
                      <p className="state-block-description">
                        <Link
                          to={`/patients/${patient.id}/exams/new`}
                          className="text-link"
                        >
                          + Ajouter le premier prélèvement
                        </Link>
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => {
                  const conclusionPreview = truncate(exam.report_summary?.conclusion ?? '', 120)
                  return (
                    <tr key={exam.id} className="patient-detail-exam-row">
                      <td className="patient-detail-exam-ref">{exam.exam_number}</td>
                      <td>{exam.sample_nature || '—'}</td>
                      <td>{formatDate(exam.registered_date)}</td>
                      <td>
                        <StatusBadge status={exam.status} />
                      </td>
                      <td className="patient-detail-conclusion-cell">
                        {conclusionPreview ? (
                          <span className="patient-detail-conclusion">{conclusionPreview}</span>
                        ) : (
                          <span className="patient-detail-no-conclusion">—</span>
                        )}
                      </td>
                      <td>
                        <Link to={`/exams/${exam.id}`} className="text-link">
                          Ouvrir →
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  )
}
