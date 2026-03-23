import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { patientService } from '../services/patientService'
import type { Exam, Patient } from '../types/domain'
import { mapSexBackendToDisplay } from '../utils/domainMappings'

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [exams, setExams] = useState<Exam[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [examsError, setExamsError] = useState('')

  useEffect(() => {
    const loadPatient = async () => {
      setIsLoading(true)
      setError('')

      try {
        const patientData = await patientService.getById(id)
        setPatient(patientData)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load patient.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadPatient()
  }, [id])

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
      <section className="panel">
        <h2>Loading patient...</h2>
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

  if (!patient) {
    return (
      <section className="panel">
        <h2>Patient not found</h2>
        <p>This patient does not exist.</p>
      </section>
    )
  }

  return (
    <div>
      <PageHeader
        title={`${patient.first_name} ${patient.last_name}`}
        subtitle={`Patient profile and exam timeline`}
        action={
          <Link to={`/patients/${patient.id}/exams/new`} className="button">
            Add New Exam
          </Link>
        }
      />

      <section className="panel">
        <h2>Patient Information</h2>
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
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Exams</h2>
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
                  <td colSpan={5}>Loading exams...</td>
                </tr>
              ) : examsError ? (
                <tr>
                  <td colSpan={5}>{examsError}</td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={5}>No exam found for this patient.</td>
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
    </div>
  )
}
