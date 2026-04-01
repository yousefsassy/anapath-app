import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, UserPlus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
import { patientService } from '../services/patientService'
import type { Exam, Patient } from '../types/domain'
import { displaySexFrench } from '../utils/domainMappings'
import { formatDate } from '../utils/formatting'

type SexFilter = 'all' | 'male' | 'female'
type ExamCacheEntry = Exam[] | 'loading' | 'error'

function matchesSexFilter(patient: Patient, sexFilter: SexFilter) {
  if (sexFilter === 'all') return true
  const s = String(patient.sex).trim().toLowerCase()
  if (sexFilter === 'male') return s === 'm' || s === 'male'
  return s === 'f' || s === 'female'
}


export function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sexFilter, setSexFilter] = useState<SexFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [examCache, setExamCache] = useState<Record<string, ExamCacheEntry>>({})

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await patientService.list()
        setPatients(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les patients.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredPatients = useMemo(
    () =>
      patients.filter((p) => {
        const full = `${p.first_name} ${p.last_name}`.toLowerCase()
        const rev = `${p.last_name} ${p.first_name}`.toLowerCase()
        const phone = (p.phone ?? '').toLowerCase()
        const matchSearch =
          !normalizedSearch ||
          full.includes(normalizedSearch) ||
          rev.includes(normalizedSearch) ||
          phone.includes(normalizedSearch)
        return matchSearch && matchesSexFilter(p, sexFilter)
      }),
    [normalizedSearch, patients, sexFilter]
  )

  const hasActiveFilters = normalizedSearch.length > 0 || sexFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setSexFilter('all')
  }

  const toggleExpand = async (patientId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(patientId)) {
        next.delete(patientId)
      } else {
        next.add(patientId)
      }
      return next
    })

    if (examCache[patientId] !== undefined) return

    setExamCache((prev) => ({ ...prev, [patientId]: 'loading' }))
    try {
      const exams = await patientService.getExamsByPatientId(patientId)
      setExamCache((prev) => ({ ...prev, [patientId]: exams }))
    } catch {
      setExamCache((prev) => ({ ...prev, [patientId]: 'error' }))
    }
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Patients"
        subtitle="Annuaire des patients — accédez rapidement au dossier ou ajoutez un prélèvement."
        action={
          <Link to="/patients/new" className="button patients-primary-action">
            <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
            Nouveau patient
          </Link>
        }
      />

      <section className="panel patients-panel">
        <div className="patients-panel-header">
          <div>
            <h2>Annuaire</h2>
            <p>
              {hasActiveFilters
                ? `${filteredPatients.length} sur ${patients.length} patients`
                : `${patients.length} patient${patients.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="patients-toolbar">
          <label className="patients-search" htmlFor="patient-search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              id="patient-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom ou téléphone"
            />
            {searchTerm ? (
              <button
                type="button"
                className="patients-clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Effacer la recherche"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="patients-filter-group">
            <label htmlFor="patient-sex-filter">Sexe</label>
            <select
              id="patient-sex-filter"
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value as SexFilter)}
            >
              <option value="all">Tous</option>
              <option value="female">Femme</option>
              <option value="male">Homme</option>
            </select>
          </div>

          {hasActiveFilters ? (
            <button type="button" className="button tertiary patients-reset" onClick={clearFilters}>
              Réinitialiser
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="error-message" role="alert">{error}</p>
        ) : (
          <div className="table-wrapper" aria-busy={isLoading}>
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th>Âge</th>
                  <th>Sexe</th>
                  <th>Téléphone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-state-cell">Chargement…</div>
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-state-cell">
                        <p className="state-block-title">Aucun patient enregistré.</p>
                        <p className="state-block-description">
                          Ajoutez votre premier patient pour commencer.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-state-cell">
                        <p className="state-block-title">Aucun résultat.</p>
                        <p className="state-block-description">
                          Essayez un autre nom, téléphone ou réinitialisez les filtres.
                        </p>
                        <button type="button" className="button tertiary" onClick={clearFilters}>
                          Effacer les filtres
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.flatMap((patient) => {
                    const pid = String(patient.id)
                    const isExpanded = expanded.has(pid)
                    const cacheEntry = examCache[pid]

                    return [
                      <tr key={pid} className="patient-main-row">
                        <td className="patient-name-cell">
                          {patient.last_name} {patient.first_name}
                        </td>
                        <td>{patient.age} ans</td>
                        <td>{displaySexFrench(patient.sex)}</td>
                        <td>{patient.phone || '—'}</td>
                        <td className="patient-actions-cell">
                          <Link
                            to={`/patients/${patient.id}/exams/new`}
                            className="button patient-add-exam-btn"
                          >
                            + Prélèvement
                          </Link>
                          <Link
                            to={`/patients/${patient.id}`}
                            className="button tertiary patient-view-btn"
                          >
                            Dossier
                          </Link>
                          <button
                            type="button"
                            className="patient-expand-btn"
                            onClick={() => void toggleExpand(pid)}
                            aria-label={isExpanded ? 'Masquer les prélèvements' : 'Voir les prélèvements'}
                            title={isExpanded ? 'Masquer les prélèvements' : 'Voir les prélèvements récents'}
                          >
                            {isExpanded
                              ? <ChevronUp size={16} strokeWidth={2} />
                              : <ChevronDown size={16} strokeWidth={2} />}
                          </button>
                        </td>
                      </tr>,

                      isExpanded ? (
                        <tr key={`${pid}-exams`} className="patient-exams-row">
                          <td colSpan={5} className="patient-exams-cell">
                            <PatientExamsInline
                              patientId={patient.id}
                              cacheEntry={cacheEntry}
                            />
                          </td>
                        </tr>
                      ) : null,
                    ]
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  )
}

interface PatientExamsInlineProps {
  patientId: number | string
  cacheEntry: ExamCacheEntry | undefined
}

function PatientExamsInline({ patientId, cacheEntry }: PatientExamsInlineProps) {
  if (!cacheEntry || cacheEntry === 'loading') {
    return <p className="patient-exams-loading">Chargement des prélèvements…</p>
  }

  if (cacheEntry === 'error') {
    return <p className="patient-exams-error">Impossible de charger les prélèvements.</p>
  }

  const recentExams = cacheEntry.slice(0, 3)

  if (recentExams.length === 0) {
    return (
      <div className="patient-exams-empty">
        <span>Aucun prélèvement enregistré pour ce patient.</span>
        <Link to={`/patients/${patientId}/exams/new`} className="text-link">
          + Ajouter un prélèvement
        </Link>
      </div>
    )
  }

  return (
    <div className="patient-exams-inline">
      <span className="patient-exams-inline-label">Prélèvements récents :</span>
      <ul className="patient-exams-list">
        {recentExams.map((exam) => (
          <li key={exam.id} className="patient-exams-item">
            <Link to={`/exams/${exam.id}`} className="patient-exams-ref">
              {exam.exam_number}
            </Link>
            <span className="patient-exams-nature">{exam.sample_nature || '—'}</span>
            <span className="patient-exams-date">{formatDate(exam.registered_date)}</span>
            <StatusBadge status={exam.status} />
          </li>
        ))}
      </ul>
      {cacheEntry.length > 3 && (
        <Link to={`/patients/${patientId}`} className="text-link patient-exams-more">
          Voir les {cacheEntry.length} prélèvements →
        </Link>
      )}
    </div>
  )
}
