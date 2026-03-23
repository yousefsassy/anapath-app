import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { patientService } from '../services/patientService'
import type { UpdatePatientInput } from '../services/patientService'
import type { Exam, Patient } from '../types/domain'
import { mapSexBackendToDisplay } from '../utils/domainMappings'

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
  const [exams, setExams] = useState<Exam[]>([])
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
        if (patientData) {
          setPatientForm(toPatientEditForm(patientData))
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load patient.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadPatient()
  }, [id])

  const onEditPatient = () => {
    if (!patient) {
      return
    }

    setPatientUpdateError('')
    setPatientUpdateInfo('')
    setPatientForm(toPatientEditForm(patient))
    setIsEditingPatient(true)
  }

  const onCancelEditPatient = () => {
    if (patient) {
      setPatientForm(toPatientEditForm(patient))
    }

    setPatientUpdateError('')
    setPatientUpdateInfo('')
    setIsEditingPatient(false)
  }

  const onSubmitPatientUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isPatientSubmitting) {
      return
    }

    setPatientUpdateError('')
    setPatientUpdateInfo('')

    if (!patientForm.first_name.trim() || !patientForm.last_name.trim()) {
      setPatientUpdateError('First name and last name are required.')
      return
    }

    if (patientForm.age <= 0) {
      setPatientUpdateError('Age must be greater than 0.')
      return
    }

    setIsPatientSubmitting(true)

    try {
      const updatedPatient = await patientService.update(id, patientForm)

      if (!updatedPatient) {
        setPatientUpdateError('Patient not found for update.')
        return
      }

      setPatient(updatedPatient)
      setPatientForm(toPatientEditForm(updatedPatient))
      setIsEditingPatient(false)
      setPatientUpdateInfo('Patient updated successfully.')
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Unable to update patient.'
      setPatientUpdateError(message)
    } finally {
      setIsPatientSubmitting(false)
    }
  }

  useEffect(() => {
    const loadExams = async () => {
      setExamsLoading(true)
      setExamsError('')

      try {
        const examData = await patientService.getExamsByPatientId(id)
        setExams(examData)
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load patient exams.'
        setExamsError(message)
      } finally {
        setExamsLoading(false)
      }
    }

    if (!patient) {
      setExams([])
      setExamsLoading(false)
      return
    }

    void loadExams()
  }, [id, patient])

  if (isLoading) {
    return (
      <PageContainer maxWidth="wide">
        <section className="panel">
          <h2>Loading patient...</h2>
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
          <h2>Patient not found</h2>
          <p>This patient does not exist.</p>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={`${patient.first_name} ${patient.last_name}`}
        subtitle="Patient profile and pathology exam timeline."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Patients', to: '/patients' },
          { label: `${patient.first_name} ${patient.last_name}` },
        ]}
        action={
          <Link to={`/patients/${patient.id}/exams/new`} className="button">
            Add New Exam
          </Link>
        }
      />

      <section className="panel">
        <form onSubmit={onSubmitPatientUpdate}>
          <div className="panel-header">
            <div>
              <h2>Patient Information</h2>
              <p>Core identity details and medical context for this patient.</p>
            </div>
            {isEditingPatient ? (
              <div className="form-actions">
                <button
                  type="button"
                  className="button tertiary"
                  onClick={onCancelEditPatient}
                  disabled={isPatientSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="button" disabled={isPatientSubmitting}>
                  {isPatientSubmitting ? 'Saving...' : 'Save Patient'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button tertiary"
                onClick={onEditPatient}
                disabled={isLoading || isPatientSubmitting}
              >
                Edit Patient
              </button>
            )}
          </div>

          {patientUpdateError ? <p className="error-message">{patientUpdateError}</p> : null}
          {isPatientSubmitting ? <p className="report-loading">Saving patient...</p> : null}
          {patientUpdateInfo ? <p className="success-message">{patientUpdateInfo}</p> : null}

          {isEditingPatient ? (
            <section className="form-section">
              <div className="form-grid">
                <FormField label="First Name" htmlFor="first_name">
                  <input
                    id="first_name"
                    value={patientForm.first_name}
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, first_name: event.target.value })
                    }
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Last Name" htmlFor="last_name">
                  <input
                    id="last_name"
                    value={patientForm.last_name}
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, last_name: event.target.value })
                    }
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Age" htmlFor="age">
                  <input
                    id="age"
                    type="number"
                    min={1}
                    value={patientForm.age || ''}
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, age: Number(event.target.value) || 0 })
                    }
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="Sex" htmlFor="sex">
                  <select
                    id="sex"
                    value={patientForm.sex}
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, sex: event.target.value as UpdatePatientInput['sex'] })
                    }
                    disabled={isPatientSubmitting}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </FormField>

                <FormField label="Phone" htmlFor="phone">
                  <input
                    id="phone"
                    value={patientForm.phone}
                    onChange={(event) => setPatientForm({ ...patientForm, phone: event.target.value })}
                    disabled={isPatientSubmitting}
                  />
                </FormField>

                <FormField label="General History" htmlFor="general_history">
                  <textarea
                    id="general_history"
                    rows={5}
                    value={patientForm.general_history}
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, general_history: event.target.value })
                    }
                    disabled={isPatientSubmitting}
                  />
                </FormField>
              </div>
            </section>
          ) : (
            <div className="detail-grid">
              <p>
                <strong>Age:</strong> {patient.age}
              </p>
              <p>
                <strong>Sex:</strong> {mapSexBackendToDisplay(patient.sex)}
              </p>
              <p>
                <strong>Phone:</strong> {patient.phone}
              </p>
              <p>
                <strong>Created:</strong> {patient.created_at}
              </p>
              <p className="full-row">
                <strong>General History:</strong> {patient.general_history || 'Not provided'}
              </p>
            </div>
          )}
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Exams</h2>
          <p>Latest exams linked to this patient profile.</p>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Exam Number</th>
                <th>Type</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {examsLoading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-state-cell">Loading exams...</div>
                  </td>
                </tr>
              ) : examsError ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-state-cell table-state-cell--danger">{examsError}</div>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-state-cell">No exams found for this patient yet.</div>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.exam_number}</td>
                    <td>{exam.exam_type}</td>
                    <td>
                      <StatusBadge status={exam.status} />
                    </td>
                    <td>{exam.requested_date || '-'}</td>
                    <td>
                      <Link to={`/exams/${exam.id}`} className="text-link">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  )
}
