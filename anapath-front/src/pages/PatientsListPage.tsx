import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search, UserPlus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../layouts/PageContainer'
import { patientService } from '../services/patientService'
import type { Patient } from '../types/domain'
import { mapSexBackendToDisplay } from '../utils/domainMappings'

type SexFilter = 'all' | 'male' | 'female'

function matchesSexFilter(patient: Patient, sexFilter: SexFilter) {
  if (sexFilter === 'all') {
    return true
  }

  const normalizedSex = String(patient.sex).trim().toLowerCase()

  if (sexFilter === 'male') {
    return normalizedSex === 'm' || normalizedSex === 'male'
  }

  return normalizedSex === 'f' || normalizedSex === 'female'
}

export function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sexFilter, setSexFilter] = useState<SexFilter>('all')

  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await patientService.list()
        setPatients(data)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load patients.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadPatients()
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
      const reverseName = `${patient.last_name} ${patient.first_name}`.toLowerCase()
      const phone = patient.phone.toLowerCase()

      const matchesSearch =
        normalizedSearch.length === 0 ||
        fullName.includes(normalizedSearch) ||
        reverseName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch)

      return matchesSearch && matchesSexFilter(patient, sexFilter)
    })
  }, [normalizedSearch, patients, sexFilter])

  const hasActiveFilters = normalizedSearch.length > 0 || sexFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setSexFilter('all')
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Patients"
        subtitle="Monitor patient records and quickly open each clinical timeline."
        action={
          <Link to="/patients/new" className="button patients-primary-action">
            <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
            New Patient
          </Link>
        }
      />

      <section className="panel patients-panel">
        <div className="patients-panel-header">
          <div>
            <h2>Patient Directory</h2>
            <p>Browse active records and access each patient profile with one click.</p>
          </div>
          <span className="patients-count">
            {hasActiveFilters ? `${filteredPatients.length} of ${patients.length}` : patients.length} records
          </span>
        </div>

        <div className="patients-toolbar">
          <label className="patients-search" htmlFor="patient-search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              id="patient-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by patient name or phone"
            />
            {searchTerm ? (
              <button
                type="button"
                className="patients-clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="patients-filter-group">
            <label htmlFor="patient-sex-filter">Sex</label>
            <select
              id="patient-sex-filter"
              value={sexFilter}
              onChange={(event) => setSexFilter(event.target.value as SexFilter)}
            >
              <option value="all">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          {hasActiveFilters ? (
            <button type="button" className="button tertiary patients-reset" onClick={clearFilters}>
              Reset
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="patients-state" role="status" aria-live="polite">
            <p className="error-message">{error}</p>
          </div>
        ) : (
          <div className="table-wrapper" aria-busy={isLoading}>
            <table className="patients-table">
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Phone</th>
                  <th aria-label="Actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-state-cell">Loading patients...</div>
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-state-cell">
                        <p className="state-block-title">No patients in the system yet.</p>
                        <p className="state-block-description">
                          Add your first patient to start creating pathology exams.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-state-cell">
                        <p className="state-block-title">No matching patients found.</p>
                        <p className="state-block-description">
                          Try a different name, phone number, or reset the filters.
                        </p>
                        <button
                          type="button"
                          className="button tertiary patients-state-reset"
                          onClick={clearFilters}
                        >
                          Clear search and filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.first_name}</td>
                      <td>{patient.last_name}</td>
                      <td>{patient.age}</td>
                      <td>{mapSexBackendToDisplay(patient.sex)}</td>
                      <td>{patient.phone}</td>
                      <td>
                        <Link to={`/patients/${patient.id}`} className="text-link patients-view-link">
                          <span>View profile</span>
                          <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  )
}
