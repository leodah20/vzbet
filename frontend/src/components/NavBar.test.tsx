import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { NavBar } from './NavBar'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

describe('NavBar', () => {
  it('renders nothing when there is no authenticated user', () => {
    localStorage.clear()
    render(
      <AuthProvider>
        <MemoryRouter>
          <NavBar />
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(screen.queryByText('Partidas')).not.toBeInTheDocument()
  })

  it('shows the nav links and logs out on click', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    localStorage.setItem('vzbet_token', encodeFakeJwt({ sub: 'u-1', role: 'TORCEDOR' }))

    render(
      <AuthProvider>
        <MemoryRouter>
          <NavBar />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getByText('Partidas')).toBeInTheDocument()
    expect(screen.getByText('Campeonatos')).toBeInTheDocument()
    expect(screen.getByText('Meus Palpites')).toBeInTheDocument()
    await user.click(screen.getByText('Sair'))
    expect(screen.queryByText('Partidas')).not.toBeInTheDocument()
  })
})
