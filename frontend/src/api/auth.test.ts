import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { login, register } from './auth'

describe('auth api', () => {
  it('posts to /auth/register with the given payload', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      id: '1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'TORCEDOR',
    })
    const payload = { name: 'Ana', email: 'ana@example.com', password: 'senha1234' }

    await register(payload)

    expect(spy).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('posts to /auth/login and returns the access token', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue({ accessToken: 'jwt-token' })

    const result = await login({ email: 'ana@example.com', password: 'senha1234' })

    expect(result).toEqual({ accessToken: 'jwt-token' })
  })
})
