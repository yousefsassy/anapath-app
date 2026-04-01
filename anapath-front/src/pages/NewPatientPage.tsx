import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../layouts/PageContainer'
import { patientService } from '../services/patientService'
import type { NewPatientInput, Patient, SexDisplay } from '../types/domain'
import { displaySexFrench } from '../utils/domainMappings'
import { FORM_LIMITS } from '../utils/formLimits'

const initialFormState: NewPatientInput = {
  first_name: '',
  last_name: '',
  age: 0,
  sex: 'Female',
  phone: '',
  birth_date: '',
  general_history: '',
}

export function NewPatientPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<NewPatientInput>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [duplicateCandidates, setDuplicateCandidates] = useState<Patient[]>([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const doCreate = async () => {
    setIsSubmitting(true)
    try {
      const created = await patientService.create(form)
      navigate(`/patients/${created.id}`)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Impossible de créer le patient.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Le prénom et le nom sont obligatoires.')
      return
    }

    if (form.age <= 0) {
      setError("L'âge doit être supérieur à 0.")
      return
    }

    if (!form.birth_date) {
      setError('La date de naissance est obligatoire.')
      return
    }

    // Skip duplicate detection if already confirmed or names are too short
    const trimmedFirst = form.first_name.trim()
    const trimmedLast = form.last_name.trim()
    if (confirmed || trimmedFirst.length < 2 || trimmedLast.length < 2) {
      await doCreate()
      return
    }

    // Check for duplicates before creating
    setIsSubmitting(true)
    const candidates = await patientService.search(trimmedFirst, trimmedLast, form.phone)
    setIsSubmitting(false)

    if (candidates.length > 0) {
      setDuplicateCandidates(candidates)
      setShowDuplicateWarning(true)
      return
    }

    await doCreate()
  }

  const onConfirmCreate = () => {
    setConfirmed(true)
    setShowDuplicateWarning(false)
    void doCreate()
  }

  return (
    <PageContainer maxWidth="default">
      <PageHeader
        title="Nouveau patient"
        subtitle="Créez le dossier patient avant d'enregistrer un prélèvement."
        breadcrumbs={[
          { label: 'Accueil', to: '/dashboard' },
          { label: 'Patients', to: '/patients' },
          { label: 'Nouveau patient' },
        ]}
      />

      <section className="panel form-panel">
        <div className="form-panel-intro">
          <h2>Enregistrement du patient</h2>
          <p>Renseignez l'identité et le contexte médical du patient.</p>
        </div>

        <form onSubmit={onSubmit} className="form-layout">
          <section className="form-section">
            <div className="form-section-header">
              <h3>Identité</h3>
              <p>Informations démographiques obligatoires.</p>
            </div>

            <div className="form-grid">
              <FormField label="Prénom" htmlFor="first_name">
                <input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  maxLength={FORM_LIMITS.patientName}
                />
              </FormField>

              <FormField label="Nom" htmlFor="last_name">
                <input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  maxLength={FORM_LIMITS.patientName}
                />
              </FormField>

              <FormField label="Âge" htmlFor="age">
                <input
                  id="age"
                  type="number"
                  min={1}
                  value={form.age || ''}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) || 0 })}
                />
              </FormField>

              <FormField label="Sexe" htmlFor="sex">
                <select
                  id="sex"
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value as SexDisplay })}
                >
                  <option value="Female">Femme</option>
                  <option value="Male">Homme</option>
                </select>
              </FormField>

              <FormField
                label="Téléphone"
                htmlFor="phone"
                helperText="Facultatif."
              >
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={FORM_LIMITS.phone}
                />
              </FormField>

              <FormField
                label="Date de naissance"
                htmlFor="birth_date"
                helperText="Obligatoire. Non modifiable après création."
              >
                <input
                  id="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </FormField>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h3>Contexte médical</h3>
              <p>Antécédents généraux utiles à l'interprétation des prélèvements.</p>
            </div>

            <div className="form-grid">
              <FormField label="Antécédents" htmlFor="general_history">
                <textarea
                  id="general_history"
                  rows={5}
                  value={form.general_history}
                  onChange={(e) => setForm({ ...form, general_history: e.target.value })}
                  maxLength={FORM_LIMITS.patientGeneralHistory}
                />
              </FormField>
            </div>
          </section>

          {error ? <p className="error-message">{error}</p> : null}

          {showDuplicateWarning && duplicateCandidates.length > 0 && (
            <div className="duplicate-warning-panel">
              <p className="duplicate-warning-title">Des dossiers similaires ont été trouvés.</p>
              <p className="duplicate-warning-subtitle">
                Vérifiez si le patient existe déjà avant de créer un nouveau dossier.
              </p>
              <ul className="duplicate-candidates-list">
                {duplicateCandidates.map((candidate) => (
                  <li key={candidate.id} className="duplicate-candidate-item">
                    <span className="duplicate-candidate-info">
                      {candidate.last_name.toUpperCase()} {candidate.first_name}
                      {' — '}
                      {displaySexFrench(candidate.sex)}
                      {', '}
                      {candidate.age} ans
                      {candidate.phone ? ` — ${candidate.phone}` : ''}
                    </span>
                    <Link
                      to={`/patients/${candidate.id}`}
                      className="duplicate-candidate-link"
                    >
                      Voir le dossier →
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="duplicate-warning-confirm-text">
                Si aucun de ces patients n'est le même, confirmez la création :
              </p>
              <button
                type="button"
                className="button"
                onClick={onConfirmCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enregistrement…' : 'Créer quand même'}
              </button>
            </div>
          )}

          <div className="form-actions form-actions-sticky">
            <Link to="/patients" className="button tertiary">
              Annuler
            </Link>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le patient'}
            </button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
