import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { CaseArchiveResultList } from '../components/archive/CaseArchiveResultList'
import { PageContainer } from '../layouts/PageContainer'
import { caseArchiveService } from '../services/caseArchiveService'
import type { CaseArchiveResult, CaseArchiveSection } from '../types/domain'

type ArchiveExamTypeFilter = 'all' | 'histology' | 'cytology'

const EXAM_TYPE_OPTIONS: { value: ArchiveExamTypeFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'histology', label: 'Histologie' },
  { value: 'cytology', label: 'Cytologie' },
]

const SECTION_OPTIONS: { value: CaseArchiveSection; label: string }[] = [
  { value: 'all', label: 'Toutes sections' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'microscopy', label: 'Microscopie' },
  { value: 'macroscopy', label: 'Macroscopie' },
  { value: 'clinical_info', label: 'RC' },
]

export function ArchivePage() {
  const requestIdRef = useRef(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [examTypeFilter, setExamTypeFilter] = useState<ArchiveExamTypeFilter>('all')
  const [sectionFilter, setSectionFilter] = useState<CaseArchiveSection>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [results, setResults] = useState<CaseArchiveResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()

    const loadArchive = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await caseArchiveService.search({
          q: debouncedSearch.trim() || undefined,
          section: sectionFilter,
          exam_type: examTypeFilter === 'all' ? undefined : examTypeFilter,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          limit: 24,
        }, { signal: controller.signal })

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return
        }

        setResults(data)
      } catch (loadError) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger l'archive des cas."
        )
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    void loadArchive()

    return () => controller.abort()
  }, [debouncedSearch, sectionFilter, examTypeFilter, dateFrom, dateTo])

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    sectionFilter !== 'all' ||
    examTypeFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const clearFilters = () => {
    setSearchTerm('')
    setSectionFilter('all')
    setExamTypeFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Archives des cas"
        subtitle="Retrouvez les cas validés du laboratoire pour comparer, vérifier et référencer des dossiers similaires."
        breadcrumbs={[
          { label: 'Accueil', to: '/dashboard' },
          { label: 'Archives des cas' },
        ]}
      />

      <section className="panel archive-panel">
        <div className="archive-panel-header">
          <div>
            <h2>Recherche avancée</h2>
            <p>
              La recherche porte sur les cas validés et prend en compte le contexte clinique,
              les mots-clés diagnostiques et le texte du compte rendu.
            </p>
          </div>
          <div className="archive-panel-side">
            <div className="archive-panel-note">
              Sans terme de recherche, les cas validés les plus récents sont affichés.
            </div>
            <div className="archive-results-summary archive-results-summary--panel">
              {isLoading ? (
                <span>Recherche en cours…</span>
              ) : (
                <>
                  <strong>{results.length}</strong>
                  <span>cas affichés</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="archive-toolbar">
          <div className="accueil-search-wrapper archive-search-wrapper">
            <svg className="accueil-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            <input
              className="accueil-search"
              type="text"
              placeholder="Rechercher une lésion, un motif, un mot-clé, une nature…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="archive-toolbar-group">
            <label className="accueil-date-label">
              Section
              <select
                className="accueil-date-input"
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value as CaseArchiveSection)}
              >
                {SECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="accueil-date-label">
              Type
              <select
                className="accueil-date-input"
                value={examTypeFilter}
                onChange={(event) => setExamTypeFilter(event.target.value as ArchiveExamTypeFilter)}
              >
                {EXAM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="accueil-date-label">
              Validé du
              <input
                type="date"
                className="accueil-date-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>

            <label className="accueil-date-label">
              au
              <input
                type="date"
                className="accueil-date-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>

            {hasActiveFilters && (
              <button type="button" className="accueil-clear-btn archive-clear-btn" onClick={clearFilters}>
                Effacer
              </button>
            )}
          </div>
        </div>

        <CaseArchiveResultList
          results={results}
          loading={isLoading}
          error={error}
          emptyTitle="Aucun cas validé trouvé."
          emptyDescription="Essayez une autre formulation ou élargissez les dates de validation."
        />
      </section>
    </PageContainer>
  )
}
