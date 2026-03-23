import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { patientService } from '../services/patientService'
import type { Patient } from '../types/domain'
import { mapSexBackendToDisplay } from '../utils/domainMappings'

export function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await patientService.list()
        setPatients(data)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load patients.'
        setError(message)
      }
    }

    void loadPatients()
  }, [])

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Manage your patient records"
        action={
          <Link to="/patients/new" className="button">
            New Patient
          </Link>
        }
      />

      <section className="panel">
        {error ? <p className="error-message">{error}</p> : null}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Age</th>
                <th>Sex</th>
                <th>Phone</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6}>No patient found.</td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.first_name}</td>
                    <td>{patient.last_name}</td>
                    <td>{patient.age}</td>
                    <td>{mapSexBackendToDisplay(patient.sex)}</td>
                    <td>{patient.phone}</td>
                    <td>
                      <Link to={`/patients/${patient.id}`} className="text-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
