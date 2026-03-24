import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { examService } from '../services/examService'
import type { Exam } from '../types/domain'
import { formatDate } from '../utils/formatting'

type StatusFilter = 'all' | 'registered' | 'in_progress' | 'completed'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'registered', label: 'Enregistré' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Validé' },
]


export function DashboardPage() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadExams = async () => {
      setLoading(true)
      setError(null)
      try {
        const status = activeFilter === 'all' ? undefined : activeFilter
        const data = await examService.list(status)
        setExams(data)
      } catch {
        setError('Impossible de charger les prélèvements.')
      } finally {
        setLoading(false)
      }
    }

    void loadExams()
  }, [activeFilter])

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
