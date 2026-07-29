import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

function Consumer() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? `${user.id}:${user.role}` : 'anonymous'}</span>
      <button onClick={() => login(encodeFakeJwt({ sub: 'user-1', role: 'TORCEDOR' }))}>
        login
      </button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts anonymous when there is no stored token', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
  })

  it('logs in and persists the token, then logs out and clears it', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await user.click(screen.getByText('login'))
    expect(screen.getByTestId('user')).toHaveTextContent('user-1:TORCEDOR')
    expect(localStorage.getItem('vzbet_token')).not.toBeNull()

    await user.click(screen.getByText('logout'))
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(localStorage.getItem('vzbet_token')).toBeNull()
  })
})
