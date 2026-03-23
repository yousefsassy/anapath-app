import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../layouts/PageContainer'
import { patientService } from '../services/patientService'
import type { NewPatientInput, SexDisplay } from '../types/domain'

const initialFormState: NewPatientInput = {
  first_name: '',
  last_name: '',
  age: 0,
  sex: 'Female',
  phone: '',
  birth_date: null,
  general_history: '',
}

export function NewPatientPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<NewPatientInput>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First name and last name are required.')
      return
    }

    if (form.age <= 0) {
      setError('Age must be greater than 0.')
      return
    }

    setIsSubmitting(true)

    try {
      await patientService.create(form)
      navigate('/patients')
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : 'Unable to create patient.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer maxWidth="default">
      <PageHeader
        title="New Patient"
        subtitle="Create a complete patient profile before registering pathology exams."
      />

      <section className="panel form-panel">
        <div className="form-panel-intro">
          <h2>Patient Registration</h2>
          <p>Capture core identity details and relevant medical context.</p>
        </div>

        <form onSubmit={onSubmit} className="form-layout">
          <section className="form-section">
            <div className="form-section-header">
              <h3>Identity</h3>
              <p>Required demographic details used across the clinical workflow.</p>
            </div>

            <div className="form-grid">
              <FormField label="First Name" htmlFor="first_name">
                <input
                  id="first_name"
                  value={form.first_name}
                  onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                />
              </FormField>

              <FormField label="Last Name" htmlFor="last_name">
                <input
                  id="last_name"
                  value={form.last_name}
                  onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                />
              </FormField>

              <FormField label="Age" htmlFor="age">
                <input
                  id="age"
                  type="number"
                  min={1}
                  value={form.age || ''}
                  onChange={(event) =>
                    setForm({ ...form, age: Number(event.target.value) || 0 })
                  }
                />
              </FormField>

              <FormField label="Sex" htmlFor="sex">
                <select
                  id="sex"
                  value={form.sex}
                  onChange={(event) =>
                    setForm({ ...form, sex: event.target.value as SexDisplay })
                  }
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </FormField>

              <FormField
                label="Phone"
                htmlFor="phone"
                helperText="Optional but useful for follow-up communication."
              >
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </FormField>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h3>Clinical Context</h3>
              <p>General medical history that may support exam interpretation.</p>
            </div>

            <div className="form-grid">
              <FormField label="General History" htmlFor="general_history">
                <textarea
                  id="general_history"
                  value={form.general_history}
                  onChange={(event) =>
                    setForm({ ...form, general_history: event.target.value })
                  }
                  rows={5}
                />
              </FormField>
            </div>
          </section>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="form-actions form-actions-sticky">
            <Link to="/patients" className="button tertiary">
              Cancel
            </Link>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
