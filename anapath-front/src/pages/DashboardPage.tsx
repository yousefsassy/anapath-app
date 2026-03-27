import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { examService } from '../services/examService'
import type { Exam } from '../types/domain'
import { formatDate } from '../utils/formatting'

type StatusFilter = 'all' | 'registered' | 'in_progress' | 'completed'
type ExamTypeFilter = 'all' | 'histology' | 'cytology'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'registered', label: 'Enregistré' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Validé' },
]

const EXAM_TYPE_BUTTONS: { value: ExamTypeFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'histology', label: 'Histologie' },
  { value: 'cytology', label: 'Cytologie' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')
  const [examTypeFilter, setExamTypeFilter] = useState<ExamTypeFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const loadExams = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await examService.list({
          status: activeFilter === 'all' ? undefined : activeFilter,
          exam_type: examTypeFilter === 'all' ? undefined : examTypeFilter,
          search: debouncedSearch.trim() || undefined,
        })
        setExams(data)
      } catch {
        setError('Impossible de charger les prélèvements.')
      } finally {
        setLoading(false)
      }
    }

    void loadExams()
  }, [activeFilter, examTypeFilter, debouncedSearch])

  const hasActiveFilters = searchTerm !== '' || examTypeFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setExamTypeFilter('all')
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Accueil"
        subtitle="File de travail — prélèvements en cours et à traiter."
        action={
          <Link to="/patients/new" className="button">
            + Nouveau patient
          </Link>
        }
      />

      <section className="panel">
        <div className="accueil-filter-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`accueil-tab${activeFilter === tab.value ? ' accueil-tab--active' : ''}`}
              onClick={() => setActiveFilter(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="accueil-toolbar">
          <div className="accueil-search-wrapper">
            <svg className="accueil-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            <input
              className="accueil-search"
              type="text"
              placeholder="Rechercher patient, référence, nature…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="accueil-type-segmented">
            {EXAM_TYPE_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                type="button"
                className={`accueil-type-btn${examTypeFilter === btn.value ? ' accueil-type-btn--active' : ''}`}
                onClick={() => setExamTypeFilter(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button type="button" className="accueil-clear-btn" onClick={clearFilters}>
              ✕ Effacer
            </button>
          )}
        </div>

        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Réf. Prélèvement</th>
                <th>Patient</th>
                <th>Nature</th>
                <th>Date de réception</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-state-cell">
                      <p className="state-block-description">Chargement…</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-state-cell">
                      <p className="state-block-title">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-state-cell">
                      <p className="state-block-title">Aucun prélèvement trouvé.</p>
                      <p className="state-block-description">
                        Les prélèvements enregistrés apparaîtront ici.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="accueil-row"
                    onClick={() => navigate(`/exams/${exam.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="accueil-ref">{exam.exam_number}</td>
                    <td>
                      {exam.patient_last_name && exam.patient_first_name
                        ? `${exam.patient_last_name} ${exam.patient_first_name}`
                        : '—'}
                    </td>
                    <td>{exam.sample_nature || '—'}</td>
                    <td>{formatDate(exam.registered_date)}</td>
                    <td>
                      <StatusBadge status={exam.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  )
}
