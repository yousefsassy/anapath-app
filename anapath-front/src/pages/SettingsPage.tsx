import { useState } from 'react'
import type { FormEvent } from 'react'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../layouts/PageContainer'
import { loadLabSettings, saveLabSettings } from '../services/labSettingsStorage'
import type { LabSettings } from '../types/domain'
import { defaultLabSettings } from '../types/domain'

export function SettingsPage() {
  const [form, setForm] = useState<LabSettings>(() => loadLabSettings())
  const [saved, setSaved] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveLabSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const onReset = () => {
    const defaults = { ...defaultLabSettings }
    setForm(defaults)
    saveLabSettings(defaults)
    setShowResetConfirm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const update = (field: keyof LabSettings) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [field]: e.target.value })

  return (
    <PageContainer>
      <PageHeader
        title="Paramètres"
        subtitle="Informations du médecin et du laboratoire"
        breadcrumbs={[
          { label: 'Accueil', to: '/dashboard' },
          { label: 'Paramètres' },
        ]}
      />

      <section className="panel settings-hero-panel">
        <div className="settings-hero-copy">
          <span className="page-header-kicker">Identité documentaire</span>
          <h2>Configuration d'impression et de signature</h2>
          <p>
            Ces informations alimentent l'entête de secours et la signature visibles sur
            les aperçus PDF lorsque l'image institutionnelle n'est pas utilisée.
          </p>
        </div>
      </section>

      <form onSubmit={onSubmit}>
        {/* ── Médecin ─────────────────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-header">
            <h2>Médecin</h2>
          </div>
          <div className="form-grid">
            <FormField label="Nom du médecin" htmlFor="doctorName">
              <input
                id="doctorName"
                value={form.doctorName}
                onChange={update('doctorName')}
              />
            </FormField>

            <FormField
              label="Titre / Affiliation"
              htmlFor="doctorTitle"
              helperText="Une ligne par entrée (ex. spécialité, établissement)."
            >
              <textarea
                id="doctorTitle"
                rows={3}
                value={form.doctorTitle}
                onChange={update('doctorTitle')}
              />
            </FormField>

            <FormField label="Téléphone" htmlFor="doctorPhone">
              <input
                id="doctorPhone"
                value={form.doctorPhone}
                onChange={update('doctorPhone')}
              />
            </FormField>

            <FormField label="Email" htmlFor="doctorEmail">
              <input
                id="doctorEmail"
                type="email"
                value={form.doctorEmail}
                onChange={update('doctorEmail')}
              />
            </FormField>
          </div>
        </section>

        {/* ── Laboratoire ─────────────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-header">
            <h2>Laboratoire</h2>
          </div>
          <div className="form-grid">
            <FormField label="Nom du laboratoire" htmlFor="labName">
              <input
                id="labName"
                value={form.labName}
                onChange={update('labName')}
              />
            </FormField>

            <FormField
              label="Adresse"
              htmlFor="labAddress"
              helperText="Une ligne par entrée."
            >
              <textarea
                id="labAddress"
                rows={3}
                value={form.labAddress}
                onChange={update('labAddress')}
              />
            </FormField>

            <FormField label="Téléphone" htmlFor="labPhone">
              <input
                id="labPhone"
                value={form.labPhone}
                onChange={update('labPhone')}
              />
            </FormField>
          </div>

          <div className="settings-note">
            <p>
              Si le fichier <code>/entete-compte-rendu.png</code> est présent dans le dossier
              public, il est utilisé comme entête dans le PDF et les informations ci-dessus
              ne sont pas affichées. En l'absence de ce fichier, l'entête est générée à
              partir de ces paramètres.
            </p>
          </div>
        </section>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="form-actions settings-actions">
          {showResetConfirm ? (
            <>
              <span className="settings-reset-label">Réinitialiser tous les paramètres ?</span>
              <button type="button" className="button" onClick={onReset}>
                Confirmer
              </button>
              <button
                type="button"
                className="button tertiary"
                onClick={() => setShowResetConfirm(false)}
              >
                Annuler
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button tertiary"
              onClick={() => setShowResetConfirm(true)}
            >
              Réinitialiser
            </button>
          )}
          {saved ? <p className="success-message">Paramètres enregistrés.</p> : null}
          <button type="submit" className="button">
            Enregistrer
          </button>
        </div>
      </form>
    </PageContainer>
  )
}
