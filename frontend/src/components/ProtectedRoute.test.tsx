import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

function renderProtected() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/partidas']}>
        <Routes>
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/partidas" element={<p>Partidas agendadas</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no authenticated user', () => {
    localStorage.clear()
    renderProtected()
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('renders the nested route when the user is authenticated', () => {
    localStorage.clear()
    localStorage.setItem('vzbet_token', encodeFakeJwt({ sub: 'u-1', role: 'TORCEDOR' }))
    renderProtected()
    expect(screen.getByText('Partidas agendadas')).toBeInTheDocument()
  })
})
