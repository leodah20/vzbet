import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as authApi from '../../api/auth'
import { ApiError } from '../../api/client'
import { RegisterPage } from './RegisterPage'

describe('RegisterPage', () => {
  it('submits the form with the typed values', async () => {
    const user = userEvent.setup()
    vi.spyOn(authApi, 'register').mockResolvedValue({
      id: '1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'TORCEDOR',
    })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nome'), 'Ana')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByText('Cadastrar'))

    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'senha1234',
    })
  })

  it('shows the backend error message when registration fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(authApi, 'register').mockRejectedValue(new ApiError(409, 'Email já cadastrado'))

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nome'), 'Ana')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByText('Cadastrar'))

    expect(await screen.findByText('Email já cadastrado')).toBeInTheDocument()
  })
})
