import { useEffect, useState } from 'react'
import { Activity, ClipboardCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { PageContainer } from '../layouts/PageContainer'
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
  const completedExams = data.exams.filter((exam) => exam.status === 'completed').length
  const completionRate = data.exams.length > 0 ? Math.round((completedExams / data.exams.length) * 100) : 0
  const recentExams = [...data.exams].slice(0, 5)

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Dashboard"
        subtitle="Operational overview of your pathology workflow and report load."
        action={
          <Link to="/patients/new" className="button">
            New Patient
          </Link>
        }
      />

      <section className="dashboard-overview panel">
        <div className="dashboard-overview-content">
          <h2>Clinical Activity Summary</h2>
          <p>
            Track registration load, pending work, and report throughput in one place before
            moving into detailed case management.
          </p>
        </div>
        <div className="dashboard-overview-metric" aria-live="polite">
          <span>Report Completion</span>
          <strong>{completionRate}%</strong>
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-head">
            <span>Total Patients</span>
            <Users size={16} strokeWidth={2} aria-hidden="true" />
          </div>
          <strong>{data.patients.length}</strong>
          <p>Patients currently registered in the lab system.</p>
        </article>

        <article className="stat-card dashboard-stat-card">
          <div className="dashboard-stat-head">
            <span>Total Exams</span>
            <Activity size={16} strokeWidth={2} aria-hidden="true" />
          </div>
          <strong>{data.exams.length}</strong>
          <p>All pathology exams logged across active records.</p>
        </article>

        <article className="stat-card dashboard-stat-card dashboard-stat-card--highlight">
          <div className="dashboard-stat-head">
            <span>Pending / In Progress</span>
            <ClipboardCheck size={16} strokeWidth={2} aria-hidden="true" />
          </div>
          <strong>{pendingExams}</strong>
          <p>Exams requiring follow-up and report completion.</p>
        </article>
      </section>

      <section className="panel dashboard-recent-panel">
        <div className="panel-header dashboard-recent-header">
          <div>
            <h2>Recent Exams</h2>
            <p>Latest registered exams requiring review or report updates.</p>
          </div>
          <span className="dashboard-recent-count">{recentExams.length} recent</span>
        </div>

        <div className="table-wrapper">
          <table className="dashboard-table">
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
                  <td colSpan={5}>
                    <div className="table-state-cell">
                      <p className="state-block-title">No recent exams available yet.</p>
                      <p className="state-block-description">
                        New exams will appear here once patient exam registration starts.
                      </p>
                    </div>
                  </td>
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
    </PageContainer>
  )
}
