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
      setError('Identifiant patient manquant.')
      return
    }

    if (!form.exam_type.trim()) {
      setError("Le type d'examen est obligatoire.")
      return
    }

    setIsSubmitting(true)

    try {
      const created = await examService.create({
        ...form,
        patient_id: patientId,
      })

      // Land directly on the case workspace
      navigate(`/exams/${created.id}`)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Impossible de créer le prélèvement."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer maxWidth="default">
      <PageHeader
        title="Nouveau prélèvement"
        subtitle="Enregistrez les informations du prélèvement avant la rédaction du compte rendu."
        breadcrumbs={[
          { label: 'Accueil', to: '/dashboard' },
          { label: 'Patients', to: '/patients' },
          ...(patientId ? [{ label: 'Dossier patient', to: `/patients/${patientId}` }] : []),
          { label: 'Nouveau prélèvement' },
        ]}
      />

      <section className="panel form-panel">
        <div className="form-panel-intro">
          <h2>Enregistrement du prélèvement</h2>
          <p>
            Renseignez les informations essentielles du prélèvement. Le compte rendu sera rédigé
            après enregistrement.
          </p>
        </div>

        <form onSubmit={onSubmit} className="form-layout">

          {/* ── Section 1: Identification ─────────────────────────────────── */}
          <section className="form-section">
            <div className="form-section-header">
              <h3>Identification</h3>
              <p>Type d'examen, nature et origine du prélèvement.</p>
            </div>

            <div className="form-grid">
              <FormField label="Type d'examen" htmlFor="exam_type">
                <select
                  id="exam_type"
                  value={form.exam_type}
                  onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                >
                  <option value="histology">Histologie (Biopsie / Pièce opératoire)</option>
                  <option value="cytology">Cytologie</option>
                </select>
              </FormField>

              <FormField label="Nature du prélèvement" htmlFor="sample_nature">
                <input
                  id="sample_nature"
                  placeholder="ex. Biopsie cutanée, Splénectomie…"
                  value={form.sample_nature}
                  onChange={(e) => setForm({ ...form, sample_nature: e.target.value })}
                />
              </FormField>

              <FormField label="Demandé par" htmlFor="requesting_doctor">
                <input
                  id="requesting_doctor"
                  placeholder="Nom du médecin demandeur"
                  value={form.requesting_doctor}
                  onChange={(e) => setForm({ ...form, requesting_doctor: e.target.value })}
                />
              </FormField>

              <FormField label="Clinique" htmlFor="clinic_name">
                <input
                  id="clinic_name"
                  placeholder="Nom de la clinique ou de l'hôpital"
                  value={form.clinic_name}
                  onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                />
              </FormField>
            </div>
          </section>

          {/* ── Section 2: Dates ──────────────────────────────────────────── */}
          <section className="form-section">
            <div className="form-section-header">
              <h3>Dates</h3>
              <p>Suivi chronologique du prélèvement.</p>
            </div>

            <div className="form-grid">
              <FormField label="Enregistré le" htmlFor="registered_date">
                <input
                  id="registered_date"
                  type="date"
                  value={form.registered_date}
                  onChange={(e) => setForm({ ...form, registered_date: e.target.value })}
                />
              </FormField>

              <FormField label="Examen demandé le" htmlFor="requested_date">
                <input
                  id="requested_date"
                  type="date"
                  value={form.requested_date}
                  onChange={(e) => setForm({ ...form, requested_date: e.target.value })}
                />
              </FormField>

              <FormField label="Résultat émis le" htmlFor="result_issued_date">
                <input
                  id="result_issued_date"
                  type="date"
                  value={form.result_issued_date}
                  onChange={(e) => setForm({ ...form, result_issued_date: e.target.value })}
                />
              </FormField>
            </div>
          </section>

          {/* ── Section 3: Contexte clinique ──────────────────────────────── */}
          <section className="form-section">
            <div className="form-section-header">
              <h3>Contexte clinique</h3>
              <p>Informations cliniques utiles à l'interprétation anatomopathologique.</p>
            </div>

            <div className="form-grid">
              <FormField label="Renseignement clinique" htmlFor="exam_history">
                <textarea
                  id="exam_history"
                  rows={4}
                  placeholder="Antécédents, motif de la demande, données cliniques pertinentes…"
                  value={form.exam_history}
                  onChange={(e) => setForm({ ...form, exam_history: e.target.value })}
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
                  placeholder="ex. carcinome, lymphome, dysplasie…"
                  value={form.diagnosis_keywords}
                  onChange={(e) => setForm({ ...form, diagnosis_keywords: e.target.value })}
                />
              </FormField>
            </div>
          </section>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="form-actions form-actions-sticky">
            <Link to={cancelTarget} className="button tertiary">
              Annuler
            </Link>
            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le prélèvement'}
            </button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
