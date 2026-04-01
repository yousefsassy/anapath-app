import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { authService } from '../services/authService'
import type { AuthUser } from '../types/auth'

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('../services/authStorage', () => ({
  clearLegacyAuthStorage: vi.fn(),
}))

vi.mock('../services/apiClient', () => ({
  registerUnauthorizedHandler: vi.fn(() => () => {}),
}))

const authenticatedUser: AuthUser = {
  id: 1,
  laboratory_id: 1,
  email: 'admin@anapath.local',
  role: 'admin',
  full_name: 'Default Admin',
}

function renderProtectedApp() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Page de connexion</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Zone protégée</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('cookie-backed auth session flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders protected content after session hydration succeeds', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(authenticatedUser)

    renderProtectedApp()

    expect(screen.getByText('Vérification de la session…')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('Zone protégée')).toBeInTheDocument()
    )
  })

  it('redirects to login after session hydration when no session exists', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(null)

    renderProtectedApp()

    await waitFor(() =>
      expect(screen.getByText('Page de connexion')).toBeInTheDocument()
    )
  })
})
