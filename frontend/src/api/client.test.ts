import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, clearToken, setToken, setUnauthorizedHandler } from './client'

function mockJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    clearToken()
    vi.unstubAllGlobals()
  })

  it('attaches the Authorization header when a token is stored', async () => {
    setToken('fake-token')
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/matches')

    const [, requestInit] = fetchMock.mock.calls[0]
    const headers = (requestInit as RequestInit & { headers: Record<string, string> }).headers
    expect(headers.Authorization).toBe('Bearer fake-token')
  })

  it('throws an ApiError with the backend message on a 400 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockJsonResponse(400, { message: 'Nome em branco' })),
    )

    await expect(apiFetch('/teams')).rejects.toThrow('Nome em branco')
  })

  it('calls the unauthorized handler and throws on a 401 response', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(401, {})))

    await expect(apiFetch('/predictions/me')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledOnce()
  })
})
