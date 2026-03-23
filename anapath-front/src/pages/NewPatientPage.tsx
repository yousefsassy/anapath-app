import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
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
    <div>
      <PageHeader title="New Patient" subtitle="Create a patient medical profile" />

      <section className="panel">
        <form onSubmit={onSubmit} className="form-grid">
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

          <FormField label="Phone" htmlFor="phone">
            <input
              id="phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </FormField>

          <div></div>

          <FormField label="General History" htmlFor="general_history">
            <textarea
              id="general_history"
              value={form.general_history}
              onChange={(event) =>
                setForm({ ...form, general_history: event.target.value })
              }
              rows={4}
            />
          </FormField>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="form-actions">
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
