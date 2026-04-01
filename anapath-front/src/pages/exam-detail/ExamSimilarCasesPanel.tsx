import type { FormEvent } from 'react'
import { CaseArchiveResultList } from '../../components/archive/CaseArchiveResultList'
import type { CaseArchiveResult, CaseArchiveSection } from '../../types/domain'

interface ExamSimilarCasesPanelProps {
  archiveQuery: string
  archiveSection: CaseArchiveSection
  isOpen: boolean
  loading: boolean
  error: string
  info: string
  sectionOptions: { value: CaseArchiveSection; label: string }[]
  results: CaseArchiveResult[]
  onToggleOpen: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onQueryChange: (value: string) => void
  onSectionChange: (value: CaseArchiveSection) => void
  onRefresh: () => void
}

export function ExamSimilarCasesPanel({
  archiveQuery,
  archiveSection,
  isOpen,
  loading,
  error,
  info,
  sectionOptions,
  results,
  onToggleOpen,
  onSubmit,
  onQueryChange,
  onSectionChange,
  onRefresh,
}: ExamSimilarCasesPanelProps) {
  return (
    <aside className="panel case-archive-side-panel">
      <div className="panel-header case-archive-side-panel-header">
        <div>
          <h2>Cas similaires</h2>
          <p>
            Recherche de référence parmi les cas validés du laboratoire à partir du contexte déjà enregistré dans ce dossier.
          </p>
        </div>

        <button
          type="button"
          className="button tertiary"
          onClick={onToggleOpen}
        >
          {isOpen ? 'Réduire' : 'Afficher'}
        </button>
      </div>

      {isOpen && (
        <>
          <form className="case-archive-side-form" onSubmit={onSubmit}>
            <label className="case-archive-side-search">
              <span>Recherche contextuelle</span>
              <input
                type="text"
                value={archiveQuery}
                placeholder="Nature, mots-clés, contexte clinique…"
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>

            <label className="case-archive-side-search">
              <span>Section</span>
              <select
                value={archiveSection}
                onChange={(event) => onSectionChange(event.target.value as CaseArchiveSection)}
              >
                {sectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="case-archive-side-actions">
              <button
                type="button"
                className="button tertiary"
                onClick={onRefresh}
                disabled={loading}
              >
                Actualiser depuis le dossier
              </button>
              <button type="submit" className="button" disabled={loading}>
                {loading ? 'Recherche…' : 'Rechercher'}
              </button>
            </div>
          </form>

          <p className="case-archive-side-note">
            Les résultats restent limités au type de prélèvement courant et ce dossier est toujours exclu de la recherche.
          </p>

          <CaseArchiveResultList
            results={results}
            loading={loading}
            error={error}
            info={info}
            emptyTitle="Aucun cas similaire trouvé."
            emptyDescription="Ajustez les termes de recherche ou actualisez le contexte du dossier."
            compact
            openLinksInNewTab
          />
        </>
      )}
    </aside>
  )
}
