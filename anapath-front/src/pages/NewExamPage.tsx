import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../layouts/PageContainer'
import { examService } from '../services/examService'
import type { NewExamInput } from '../types/domain'

const initialFormState: Omit<NewExamInput, 'patient_id'> = {
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

export function NewExamPage() {
  const navigate = useNavigate()
  const { id: patientId = '' } = useParams()
  const cancelTarget = patientId ? `/patients/${patientId}` : '/patients'

  const [form, setForm] = useState(initialFormState)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!patientId) {
      setError('Missing patient identifier.')
      return
    }

    if (!form.exam_type.trim()) {
      setError('Exam type is required.')
      return
    }

    setIsSubmitting(true)

    try {
      await examService.create({
        ...form,
        patient_id: patientId,
      })

      navigate(`/patients/${patientId}`)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : 'Unable to create exam.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer maxWidth="default">
      <PageHeader
        title="New Exam"
        subtitle="Record exam metadata and sample context before report drafting."
      />

      <section className="panel form-panel">
        <div className="form-panel-intro">
          <h2>Exam Registration</h2>
          <p>Define examination details and timeline information used in reporting.</p>
        </div>

        <form onSubmit={onSubmit} className="form-layout">
          <section className="form-section">
            <div className="form-section-header">
              <h3>Exam Details</h3>
              <p>Core metadata to identify the exam and requesting source.</p>
            </div>

            <div className="form-grid">
              <FormField label="Exam Type" htmlFor="exam_type">
                <select
                  id="exam_type"
                  value={form.exam_type}
                  onChange={(event) => setForm({ ...form, exam_type: event.target.value })}
                >
                  <option value="histology">Histology</option>
                  <option value="cytology">Cytology</option>
                </select>
              </FormField>

              <FormField label="Clinic Name" htmlFor="clinic_name">
                <input
                  id="clinic_name"
                  value={form.clinic_name}
                  onChange={(event) => setForm({ ...form, clinic_name: event.target.value })}
                />
              </FormField>

              <FormField label="Requesting Doctor" htmlFor="requesting_doctor">
                <input
                  id="requesting_doctor"
                  value={form.requesting_doctor}
                  onChange={(event) =>
                    setForm({ ...form, requesting_doctor: event.target.value })
                  }
                />
              </FormField>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h3>Timeline and Status</h3>
              <p>Track operational status and key dates for the exam lifecycle.</p>
            </div>

            <div className="form-grid">
              <FormField label="Requested Date" htmlFor="requested_date">
                <input
                  id="requested_date"
                  type="date"
                  value={form.requested_date}
                  onChange={(event) => setForm({ ...form, requested_date: event.target.value })}
                />
              </FormField>

              <FormField label="Registered Date" htmlFor="registered_date">
                <input
                  id="registered_date"
                  type="date"
                  value={form.registered_date}
                  onChange={(event) => setForm({ ...form, registered_date: event.target.value })}
                />
              </FormField>

              <FormField label="Result Issued Date" htmlFor="result_issued_date">
                <input
                  id="result_issued_date"
                  type="date"
                  value={form.result_issued_date}
                  onChange={(event) =>
                    setForm({ ...form, result_issued_date: event.target.value })
                  }
                />
              </FormField>

              <FormField label="Status" htmlFor="status">
                <select
                  id="status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as NewExamInput['status'] })
                  }
                >
                  <option value="registered">Registered</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </FormField>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h3>Sample and Clinical Notes</h3>
              <p>Provide context that supports accurate interpretation by the pathologist.</p>
            </div>

            <div className="form-grid">
              <FormField label="Sample Nature" htmlFor="sample_nature">
                <textarea
                  id="sample_nature"
                  rows={3}
                  value={form.sample_nature}
                  onChange={(event) => setForm({ ...form, sample_nature: event.target.value })}
                />
              </FormField>

              <FormField label="Exam History" htmlFor="exam_history">
                <textarea
                  id="exam_history"
                  rows={3}
                  value={form.exam_history}
                  onChange={(event) => setForm({ ...form, exam_history: event.target.value })}
                />
              </FormField>

              <FormField
                label="Diagnosis Keywords"
                htmlFor="diagnosis_keywords"
                helperText="Separate multiple keywords with commas."
              >
                <textarea
                  id="diagnosis_keywords"
                  rows={3}
                  value={form.diagnosis_keywords}
                  onChange={(event) =>
                    setForm({ ...form, diagnosis_keywords: event.target.value })
                  }
                />
              </FormField>
            </div>
          </section>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="form-actions form-actions-sticky">
            <Link to={cancelTarget} className="button tertiary">
              Cancel
            </Link>
            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
