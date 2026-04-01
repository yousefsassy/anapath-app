import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../layouts/PageContainer'
import { reportTemplateService } from '../services/reportTemplateService'
import type { ReportTemplate } from '../types/domain'
import { FORM_LIMITS } from '../utils/formLimits'
import { truncate } from '../utils/formatting'

interface TemplateEditState {
  name: string
  clinical_info: string
  macroscopy: string
  microscopy: string
  conclusion: string
}

function emptyEdit(t: ReportTemplate): TemplateEditState {
  return {
    name: t.name,
    clinical_info: t.clinical_info,
    macroscopy: t.macroscopy,
    microscopy: t.microscopy,
    conclusion: t.conclusion,
  }
}

function validateEdit(edit: TemplateEditState): string | null {
  if (!edit.name.trim()) return 'Le nom du modèle est obligatoire.'
  const hasContent =
    edit.clinical_info.trim() ||
    edit.macroscopy.trim() ||
    edit.microscopy.trim() ||
    edit.conclusion.trim()
  if (!hasContent) return 'Le modèle doit contenir au moins un champ non vide.'
  return null
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editState, setEditState] = useState<Record<number, TemplateEditState>>({})
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  const [saveInfos, setSaveInfos] = useState<Record<number, string>>({})
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await reportTemplateService.list()
        setTemplates(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les modèles.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setEditState((prev) => {
        if (prev[id]) return prev
        const t = templates.find((x) => x.id === id)
        if (!t) return prev
        return { ...prev, [id]: emptyEdit(t) }
      })
      setSaveErrors((prev) => ({ ...prev, [id]: '' }))
      setSaveInfos((prev) => ({ ...prev, [id]: '' }))
    }
  }

  const handleSave = async (id: number) => {
    const edit = editState[id]
    if (!edit) return
    const validationError = validateEdit(edit)
    if (validationError) {
      setSaveErrors((prev) => ({ ...prev, [id]: validationError }))
      return
    }
    setSaveErrors((prev) => ({ ...prev, [id]: '' }))
    setSavingIds((prev) => new Set(prev).add(id))
    try {
      const updated = await reportTemplateService.update(id, {
        name: edit.name.trim(),
        clinical_info: edit.clinical_info,
        macroscopy: edit.macroscopy,
        microscopy: edit.microscopy,
        conclusion: edit.conclusion,
      })
      if (updated) {
        setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
        setSaveInfos((prev) => ({ ...prev, [id]: 'Modèle mis à jour.' }))
      }
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Impossible de mettre à jour le modèle.',
      }))
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id))
    setConfirmDeleteId(null)
    try {
      await reportTemplateService.remove(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Impossible de supprimer le modèle.',
      }))
    } finally {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Modèles de compte rendu"
        subtitle="Gérez vos modèles pour pré-remplir les comptes rendus."
        breadcrumbs={[{ label: 'Accueil', to: '/dashboard' }, { label: 'Modèles' }]}
      />

      <section className="panel">
        {isLoading && <p className="report-loading">Chargement des modèles…</p>}
        {error && <p className="error-message">{error}</p>}

        {!isLoading && !error && templates.length === 0 && (
          <p className="empty-state-text">
            Aucun modèle enregistré. Créez votre premier modèle depuis la page d'un prélèvement.
          </p>
        )}

        {!isLoading && templates.length > 0 && (
          <ul className="templates-list">
            {templates.map((t) => {
              const isExpanded = expandedId === t.id
              const edit = editState[t.id]
              const isSaving = savingIds.has(t.id)
              const isDeleting = deletingIds.has(t.id)
              const saveError = saveErrors[t.id] ?? ''
              const saveInfo = saveInfos[t.id] ?? ''
              const preview = truncate(t.macroscopy || t.clinical_info || t.microscopy || t.conclusion, 100)

              return (
                <li key={t.id} className="template-item">
                  <div className="template-item-header">
                    <div className="template-item-name-row">
                      <span className="template-item-name">{t.name}</span>
                      {preview && !isExpanded && (
                        <span className="template-item-preview">{preview}</span>
                      )}
                    </div>
                    <div className="template-item-actions">
                      <button
                        type="button"
                        className="button tertiary"
                        onClick={() => toggleExpand(t.id)}
                      >
                        {isExpanded ? 'Fermer' : 'Modifier'}
                      </button>
                      {confirmDeleteId === t.id ? (
                        <>
                          <button
                            type="button"
                            className="button"
                            onClick={() => void handleDelete(t.id)}
                            disabled={isDeleting}
                          >
                            Confirmer
                          </button>
                          <button
                            type="button"
                            className="button tertiary"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="button tertiary"
                          onClick={() => setConfirmDeleteId(t.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Suppression…' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && edit && (
                    <div className="template-item-edit">
                      <div className="form-grid">
                        <div className="form-field">
                          <label htmlFor={`tpl-name-${t.id}`}>Nom du modèle</label>
                          <input
                            id={`tpl-name-${t.id}`}
                            type="text"
                            value={edit.name}
                            onChange={(e) => setEditState((prev) => ({ ...prev, [t.id]: { ...edit, name: e.target.value } }))}
                            disabled={isSaving}
                            maxLength={FORM_LIMITS.templateName}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`tpl-ci-${t.id}`}>Renseignement clinique</label>
                          <textarea
                            id={`tpl-ci-${t.id}`}
                            rows={3}
                            value={edit.clinical_info}
                            onChange={(e) => setEditState((prev) => ({ ...prev, [t.id]: { ...edit, clinical_info: e.target.value } }))}
                            disabled={isSaving}
                            maxLength={FORM_LIMITS.narrativeSection}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`tpl-mac-${t.id}`}>Macroscopie</label>
                          <textarea
                            id={`tpl-mac-${t.id}`}
                            rows={3}
                            value={edit.macroscopy}
                            onChange={(e) => setEditState((prev) => ({ ...prev, [t.id]: { ...edit, macroscopy: e.target.value } }))}
                            disabled={isSaving}
                            maxLength={FORM_LIMITS.narrativeSection}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`tpl-mic-${t.id}`}>Microscopie</label>
                          <textarea
                            id={`tpl-mic-${t.id}`}
                            rows={3}
                            value={edit.microscopy}
                            onChange={(e) => setEditState((prev) => ({ ...prev, [t.id]: { ...edit, microscopy: e.target.value } }))}
                            disabled={isSaving}
                            maxLength={FORM_LIMITS.narrativeSection}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`tpl-conc-${t.id}`}>Conclusion</label>
                          <textarea
                            id={`tpl-conc-${t.id}`}
                            rows={3}
                            value={edit.conclusion}
                            onChange={(e) => setEditState((prev) => ({ ...prev, [t.id]: { ...edit, conclusion: e.target.value } }))}
                            disabled={isSaving}
                            maxLength={FORM_LIMITS.narrativeSection}
                          />
                        </div>
                      </div>

                      {saveError && <p className="error-message">{saveError}</p>}
                      {saveInfo && <p className="success-message">{saveInfo}</p>}

                      <div className="form-actions">
                        <button
                          type="button"
                          className="button"
                          onClick={() => void handleSave(t.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </PageContainer>
  )
}
