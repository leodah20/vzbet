const TOKEN_KEY = 'vzbet_token'
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler = () => {}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (response.status === 401) {
    onUnauthorized()
    throw new ApiError(401, 'Sessão expirada, faça login novamente.')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ message: 'Erro inesperado.' }))) as {
      message?: string
    }
    throw new ApiError(response.status, body.message ?? 'Erro inesperado.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
