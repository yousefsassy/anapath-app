import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout.tsx'
import { ProtectedRoute } from './routes/ProtectedRoute.tsx'
import { useAuth } from './hooks/useAuth.ts'
import { LoginPage } from './pages/LoginPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { PatientsListPage } from './pages/PatientsListPage.tsx'
import { NewPatientPage } from './pages/NewPatientPage.tsx'
import { PatientDetailPage } from './pages/PatientDetailPage.tsx'
import { NewExamPage } from './pages/NewExamPage.tsx'
import { ExamDetailPage } from './pages/ExamDetailPage.tsx'
import { TemplatesPage } from './pages/TemplatesPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

function RootRedirect() {
  const { isAuthenticated } = useAuth()

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsListPage />} />
          <Route path="/patients/new" element={<NewPatientPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/patients/:id/exams/new" element={<NewExamPage />} />
          <Route path="/exams/:id" element={<ExamDetailPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
