import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { patientService } from '../services/patientService'
import { examService } from '../services/examService'
import type { Exam, Patient } from '../types/domain'

interface DashboardState {
  patients: Patient[]
  exams: Exam[]
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardState>({ patients: [], exams: [] })

  useEffect(() => {
    const loadData = async () => {
      const [patients, exams] = await Promise.all([patientService.list(), examService.list()])
      setData({ patients, exams })
    }

    void loadData()
  }, [])

  const pendingExams = data.exams.filter((exam) => exam.status !== 'completed').length
  const recentExams = [...data.exams].slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Quick overview of pathology activity"
        action={
          <Link to="/patients/new" className="button">
            Add New Patient
          </Link>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <p>Total Patients</p>
          <strong>{data.patients.length}</strong>
        </article>
        <article className="stat-card">
          <p>Total Exams</p>
          <strong>{data.exams.length}</strong>
        </article>
        <article className="stat-card">
          <p>Pending / In Progress</p>
          <strong>{pendingExams}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Recent Exams</h2>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Exam Number</th>
                <th>Exam Type</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentExams.length === 0 ? (
                <tr>
                  <td colSpan={5}>No exam available yet.</td>
                </tr>
              ) : (
                recentExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.exam_number}</td>
                    <td>{exam.exam_type}</td>
                    <td>
                      <StatusBadge status={exam.status} />
                    </td>
                    <td>{exam.requested_date}</td>
                    <td>
                      <Link to={`/exams/${exam.id}`} className="text-link">
                        Open Report
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
