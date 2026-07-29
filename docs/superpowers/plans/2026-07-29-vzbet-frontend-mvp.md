# VZBet Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the torcedor-facing screens of the VZBet frontend (cadastro, login, partidas list with inline palpite, ranking) as a Vite + React + TypeScript PWA-ready SPA talking to the existing NestJS backend.

**Architecture:** `frontend/` as a sibling folder to `backend/` in the same repo. A thin `src/api/` fetch client per backend resource, `src/context/AuthContext.tsx` for the logged-in user + JWT, `src/features/<screen>/` for page components, wired together by React Router in `src/router.tsx`. TanStack Query owns all server-state (cache, loading, revalidation).

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Query v5, React Router v7, Vitest + React Testing Library.

## Global Constraints

- Brand: blue and white only, zero green anywhere in the UI. Red is reserved for genuine error/danger states (e.g. "prazo encerrado", form errors) — never used decoratively.
- No axios — a hand-written `fetch` wrapper in `src/api/client.ts` is the only HTTP layer.
- No Redux/Zustand/etc — TanStack Query owns server state; `AuthContext` (plain React context) owns the one piece of client state (logged-in user).
- JWT is stored in `localStorage` under the key `vzbet_token` (exact key, referenced by multiple tasks).
- The backend's JWT payload shape is `{ sub: string, role: 'TORCEDOR' | 'ADMIN' }` (see `backend/src/auth/presentation/auth.controller.ts:28`).
- The backend's error responses (via `DomainErrorFilter`) are `{ statusCode, message }` JSON bodies on non-2xx — the frontend must surface `message` verbatim, never invent generic text.
- API base URL is `import.meta.env.VITE_API_URL`, defaulting to `http://localhost:3000` when unset.
- Tests: Vitest + React Testing Library only, no E2E in this phase.

---

### Task 1: Scaffold the Vite + React + TS + Tailwind + Vitest project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: a working `npm run dev` / `npm run build` / `npm test` project; `App` default-exported from `src/App.tsx` (later tasks modify it, see Task 14).

- [ ] **Step 1: Create the project config files**

`frontend/package.json`:
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "@tanstack/react-query": "^5.62.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

`frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

`frontend/index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VZBet</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

`frontend/src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-brand-blue: #1d4ed8;
  --color-brand-blue-dark: #1e3a8a;
  --color-brand-surface: #f8fafc;
}
```

`frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Install dependencies**

Run: `cd frontend && npm install`
Expected: installs with no errors (folder didn't exist before this task — running from the repo root, `cd frontend` will fail until `package.json` above exists in that folder; create the folder and file first, then run this).

- [ ] **Step 3: Create a deliberately-wrong `App.tsx` so the next test fails**

`frontend/src/App.tsx`:
```tsx
function App() {
  return <div />
}

export default App
```

- [ ] **Step 4: Write the failing smoke test**

`frontend/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the VZBet heading', () => {
    render(<App />)
    expect(screen.getByText('VZBet')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run the test and confirm it fails**

Run: `npm test -- App.test.tsx`
Expected: FAIL — "Unable to find an element with the text: VZBet"

- [ ] **Step 6: Implement the real `App.tsx`**

`frontend/src/App.tsx`:
```tsx
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-surface">
      <h1 className="text-2xl font-bold text-brand-blue-dark">VZBet</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 7: Run the test and confirm it passes**

Run: `npm test -- App.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest frontend project"
```

---

### Task 2: JWT payload decoder

**Files:**
- Create: `frontend/src/lib/jwt.ts`
- Test: `frontend/src/lib/jwt.test.ts`

**Interfaces:**
- Produces: `decodeJwtPayload(token: string): JwtPayload` where `JwtPayload = { sub: string; role: 'TORCEDOR' | 'ADMIN' }` — used by Task 5 (`AuthContext`).

- [ ] **Step 1: Write the failing test**

`frontend/src/lib/jwt.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { decodeJwtPayload } from './jwt'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

describe('decodeJwtPayload', () => {
  it('decodes the sub and role from a JWT payload', () => {
    const token = encodeFakeJwt({ sub: 'user-1', role: 'TORCEDOR' })
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', role: 'TORCEDOR' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- jwt.test.ts`
Expected: FAIL — `decodeJwtPayload` is not defined / module not found

- [ ] **Step 3: Write the implementation**

`frontend/src/lib/jwt.ts`:
```ts
export interface JwtPayload {
  sub: string
  role: 'TORCEDOR' | 'ADMIN'
}

export function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.')
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = atob(base64)
  return JSON.parse(json) as JwtPayload
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- jwt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/jwt.ts frontend/src/lib/jwt.test.ts
git commit -m "feat: add JWT payload decoder"
```

---

### Task 3: API client core (fetch wrapper, token storage, error handling)

**Files:**
- Create: `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.test.ts`

**Interfaces:**
- Produces: `apiFetch<T>(path: string, options?: RequestInit): Promise<T>`, `class ApiError extends Error { status: number }`, `getToken(): string | null`, `setToken(token: string): void`, `clearToken(): void`, `setUnauthorizedHandler(handler: () => void): void`. All later `api/*.ts` tasks call `apiFetch`; `AuthContext` (Task 5) calls `getToken`/`setToken`/`clearToken`/`setUnauthorizedHandler`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/api/client.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- client.test.ts`
Expected: FAIL — module `./client` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/api/client.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- client.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "feat: add fetch-based API client with token storage and 401 handling"
```

---

### Task 4: Shared API types + auth API functions

**Files:**
- Create: `frontend/src/types/api.ts`
- Create: `frontend/src/api/auth.ts`
- Test: `frontend/src/api/auth.test.ts`

**Interfaces:**
- Produces (types): `Role`, `AuthUser`, `RegisterPayload`, `LoginPayload`, `LoginResponse`, `Team`, `MatchStatus`, `Match`, `Prediction`, `SubmitPredictionPayload`, `RankingEntry` — all backend-mirroring shapes used by every later task.
- Produces (api): `register(payload: RegisterPayload): Promise<AuthUser>`, `login(payload: LoginPayload): Promise<LoginResponse>`.
- Consumes: `apiFetch` from Task 3.

- [ ] **Step 1: Create the shared types file**

`frontend/src/types/api.ts`:
```ts
export type Role = 'TORCEDOR' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
}

export interface Team {
  id: string
  name: string
}

export type MatchStatus = 'AGENDADA' | 'FINALIZADA' | 'CANCELADA'

export interface Match {
  id: string
  championshipId: string
  homeTeamId: string
  awayTeamId: string
  round: number
  kickoffAt: string
  homeScore: number | null
  awayScore: number | null
  status: MatchStatus
}

export interface Prediction {
  id: string
  matchId: string
  predictedHome: number
  predictedAway: number
  pointsEarned: number | null
}

export interface SubmitPredictionPayload {
  matchId: string
  predictedHome: number
  predictedAway: number
}

export interface RankingEntry {
  userId: string
  userName: string
  totalPoints: number
}
```

- [ ] **Step 2: Write the failing tests for the auth API**

`frontend/src/api/auth.test.ts`:
```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- auth.test.ts`
Expected: FAIL — module `./auth` not found

- [ ] **Step 4: Write the implementation**

`frontend/src/api/auth.ts`:
```ts
import { apiFetch } from './client'
import type { AuthUser, LoginPayload, LoginResponse, RegisterPayload } from '../types/api'

export function register(payload: RegisterPayload): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- auth.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/api/auth.ts frontend/src/api/auth.test.ts
git commit -m "feat: add shared API types and auth API functions"
```

---

### Task 5: AuthContext

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Test: `frontend/src/context/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `getToken`, `setToken as persistToken`, `clearToken`, `setUnauthorizedHandler` from `../api/client` (Task 3); `decodeJwtPayload` from `../lib/jwt` (Task 2).
- Produces: `AuthProvider({ children })`, `useAuth(): { user: { id: string; role: Role } | null; login: (accessToken: string) => void; logout: () => void }` — used by every page task (6, 7, 8, 13, 14).

- [ ] **Step 1: Write the failing tests**

`frontend/src/context/AuthContext.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AuthContext.test.tsx`
Expected: FAIL — module `./AuthContext` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/context/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearToken,
  getToken,
  setToken as persistToken,
  setUnauthorizedHandler,
} from '../api/client'
import { decodeJwtPayload } from '../lib/jwt'
import type { AuthUser } from '../types/api'

type SessionUser = Pick<AuthUser, 'id' | 'role'>

interface AuthContextValue {
  user: SessionUser | null
  login: (accessToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function userFromToken(token: string): SessionUser {
  const payload = decodeJwtPayload(token)
  return { id: payload.sub, role: payload.role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const token = getToken()
    return token ? userFromToken(token) : null
  })

  const logout = () => {
    clearToken()
    setUser(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [])

  const login = (accessToken: string) => {
    persistToken(accessToken)
    setUser(userFromToken(accessToken))
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AuthContext.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/context/AuthContext.test.tsx
git commit -m "feat: add AuthContext for session user and token lifecycle"
```

---

### Task 6: RegisterPage

**Files:**
- Create: `frontend/src/features/auth/RegisterPage.tsx`
- Test: `frontend/src/features/auth/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: `register` from `../../api/auth` (Task 4), `ApiError` from `../../api/client` (Task 3), `useNavigate` from `react-router-dom`.
- Produces: `RegisterPage` component, imported by `router.tsx` in Task 14.

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/auth/RegisterPage.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- RegisterPage.test.tsx`
Expected: FAIL — module `./RegisterPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/auth/RegisterPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/auth'
import { ApiError } from '../../api/client'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register({ name, email, password })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado ao cadastrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Criar conta</h1>
      <label className="flex flex-col gap-1">
        Nome
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="rounded border border-slate-300 p-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="rounded border border-slate-300 p-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Senha
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="rounded border border-slate-300 p-2"
        />
      </label>
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-brand-blue py-2 text-white disabled:opacity-50"
      >
        Cadastrar
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- RegisterPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/RegisterPage.tsx frontend/src/features/auth/RegisterPage.test.tsx
git commit -m "feat: add cadastro screen"
```

---

### Task 7: LoginPage

**Files:**
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Test: `frontend/src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `login` from `../../api/auth` (Task 4), `ApiError` from `../../api/client` (Task 3), `useAuth` from `../../context/AuthContext` (Task 5), `useNavigate` from `react-router-dom`.
- Produces: `LoginPage` component, imported by `router.tsx` in Task 14.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/auth/LoginPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as authApi from '../../api/auth'
import { AuthProvider } from '../../context/AuthContext'
import { LoginPage } from './LoginPage'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

describe('LoginPage', () => {
  it('logs in and navigates to /partidas on success', async () => {
    const user = userEvent.setup()
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: encodeFakeJwt({ sub: 'u-1', role: 'TORCEDOR' }),
    })

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/partidas" element={<p>Partidas agendadas</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Partidas agendadas')).toBeInTheDocument()
    expect(localStorage.getItem('vzbet_token')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LoginPage.test.tsx`
Expected: FAIL — module `./LoginPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/auth/LoginPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth'
import { ApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const { accessToken } = await login({ email, password })
      auth.login(accessToken)
      navigate('/partidas')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado ao entrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Entrar</h1>
      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="rounded border border-slate-300 p-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Senha
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="rounded border border-slate-300 p-2"
        />
      </label>
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-brand-blue py-2 text-white disabled:opacity-50"
      >
        Entrar
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/LoginPage.tsx frontend/src/features/auth/LoginPage.test.tsx
git commit -m "feat: add login screen"
```

---

### Task 8: ProtectedRoute

**Files:**
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Test: `frontend/src/components/ProtectedRoute.test.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../context/AuthContext` (Task 5), `Navigate`/`Outlet` from `react-router-dom`.
- Produces: `ProtectedRoute` component, used as a layout route by `router.tsx` in Task 14.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/ProtectedRoute.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ProtectedRoute.test.tsx`
Expected: FAIL — module `./ProtectedRoute` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/components/ProtectedRoute.tsx`:
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProtectedRoute.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProtectedRoute.tsx frontend/src/components/ProtectedRoute.test.tsx
git commit -m "feat: add ProtectedRoute guard"
```

---

### Task 9: Teams + Matches API functions

**Files:**
- Create: `frontend/src/api/teams.ts`
- Create: `frontend/src/api/matches.ts`
- Test: `frontend/src/api/teams.test.ts`
- Test: `frontend/src/api/matches.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `./client` (Task 3), `Team`/`Match`/`MatchStatus` types from `../types/api` (Task 4).
- Produces: `listTeams(): Promise<Team[]>`, `listMatches(params?: { teamId?: string; championshipId?: string; status?: MatchStatus }): Promise<Match[]>` — used by Task 11 (`MatchesPage`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/api/teams.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listTeams } from './teams'

describe('teams api', () => {
  it('fetches /teams', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listTeams()

    expect(spy).toHaveBeenCalledWith('/teams')
  })
})
```

`frontend/src/api/matches.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listMatches } from './matches'

describe('matches api', () => {
  it('fetches /matches with no query string when no filters are given', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listMatches()

    expect(spy).toHaveBeenCalledWith('/matches')
  })

  it('fetches /matches with a status query string when a status filter is given', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listMatches({ status: 'AGENDADA' })

    expect(spy).toHaveBeenCalledWith('/matches?status=AGENDADA')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- teams.test.ts matches.test.ts`
Expected: FAIL — modules `./teams` and `./matches` not found

- [ ] **Step 3: Write the implementations**

`frontend/src/api/teams.ts`:
```ts
import { apiFetch } from './client'
import type { Team } from '../types/api'

export function listTeams(): Promise<Team[]> {
  return apiFetch<Team[]>('/teams')
}
```

`frontend/src/api/matches.ts`:
```ts
import { apiFetch } from './client'
import type { Match, MatchStatus } from '../types/api'

export interface ListMatchesParams {
  teamId?: string
  championshipId?: string
  status?: MatchStatus
}

export function listMatches(params: ListMatchesParams = {}): Promise<Match[]> {
  const query = new URLSearchParams()
  if (params.teamId) query.set('teamId', params.teamId)
  if (params.championshipId) query.set('championshipId', params.championshipId)
  if (params.status) query.set('status', params.status)
  const queryString = query.toString()
  return apiFetch<Match[]>(`/matches${queryString ? `?${queryString}` : ''}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- teams.test.ts matches.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/teams.ts frontend/src/api/teams.test.ts frontend/src/api/matches.ts frontend/src/api/matches.test.ts
git commit -m "feat: add teams and matches API functions"
```

---

### Task 10: Predictions + Ranking API functions

**Files:**
- Create: `frontend/src/api/predictions.ts`
- Create: `frontend/src/api/ranking.ts`
- Test: `frontend/src/api/predictions.test.ts`
- Test: `frontend/src/api/ranking.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `./client` (Task 3), `Prediction`/`SubmitPredictionPayload`/`RankingEntry` types from `../types/api` (Task 4).
- Produces: `listMyPredictions(): Promise<Prediction[]>`, `submitPrediction(payload: SubmitPredictionPayload): Promise<Prediction>`, `getRanking(championshipId?: string): Promise<RankingEntry[]>` — used by Task 11 (`MatchesPage`) and Task 12 (`RankingPage`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/api/predictions.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listMyPredictions, submitPrediction } from './predictions'

describe('predictions api', () => {
  it('fetches /predictions/me', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listMyPredictions()

    expect(spy).toHaveBeenCalledWith('/predictions/me')
  })

  it('posts to /predictions with the prediction payload', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      id: '1',
      matchId: 'match-1',
      predictedHome: 2,
      predictedAway: 1,
      pointsEarned: null,
    })
    const payload = { matchId: 'match-1', predictedHome: 2, predictedAway: 1 }

    await submitPrediction(payload)

    expect(spy).toHaveBeenCalledWith('/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
})
```

`frontend/src/api/ranking.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { getRanking } from './ranking'

describe('ranking api', () => {
  it('fetches /ranking with no filter', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await getRanking()

    expect(spy).toHaveBeenCalledWith('/ranking')
  })

  it('fetches /ranking with a championshipId filter', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await getRanking('champ-1')

    expect(spy).toHaveBeenCalledWith('/ranking?championshipId=champ-1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- predictions.test.ts ranking.test.ts`
Expected: FAIL — modules `./predictions` and `./ranking` not found

- [ ] **Step 3: Write the implementations**

`frontend/src/api/predictions.ts`:
```ts
import { apiFetch } from './client'
import type { Prediction, SubmitPredictionPayload } from '../types/api'

export function listMyPredictions(): Promise<Prediction[]> {
  return apiFetch<Prediction[]>('/predictions/me')
}

export function submitPrediction(payload: SubmitPredictionPayload): Promise<Prediction> {
  return apiFetch<Prediction>('/predictions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
```

`frontend/src/api/ranking.ts`:
```ts
import { apiFetch } from './client'
import type { RankingEntry } from '../types/api'

export function getRanking(championshipId?: string): Promise<RankingEntry[]> {
  const query = championshipId ? `?championshipId=${championshipId}` : ''
  return apiFetch<RankingEntry[]>(`/ranking${query}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- predictions.test.ts ranking.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/predictions.ts frontend/src/api/predictions.test.ts frontend/src/api/ranking.ts frontend/src/api/ranking.test.ts
git commit -m "feat: add predictions and ranking API functions"
```

---

### Task 11: MatchCard + MatchesPage

**Files:**
- Create: `frontend/src/features/matches/MatchCard.tsx`
- Create: `frontend/src/features/matches/MatchesPage.tsx`
- Test: `frontend/src/features/matches/MatchCard.test.tsx`
- Test: `frontend/src/features/matches/MatchesPage.test.tsx`

**Interfaces:**
- Consumes: `Match`/`Prediction` types (Task 4); `listTeams` (Task 9); `listMatches` (Task 9); `listMyPredictions`, `submitPrediction` (Task 10); `useQuery`/`useMutation`/`useQueryClient` from `@tanstack/react-query`.
- Produces: `MatchesPage` component, imported by `router.tsx` in Task 14.

- [ ] **Step 1: Write the failing test for MatchCard**

`frontend/src/features/matches/MatchCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Match } from '../../types/api'
import { MatchCard } from './MatchCard'

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    championshipId: 'champ-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    round: 1,
    kickoffAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    homeScore: null,
    awayScore: null,
    status: 'AGENDADA',
    ...overrides,
  }
}

describe('MatchCard', () => {
  it('submits the typed prediction', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MatchCard
        match={buildMatch()}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    )

    await user.clear(screen.getByLabelText('Placar de Leões'))
    await user.type(screen.getByLabelText('Placar de Leões'), '2')
    await user.clear(screen.getByLabelText('Placar de Tigres'))
    await user.type(screen.getByLabelText('Placar de Tigres'), '1')
    await user.click(screen.getByText('Enviar palpite'))

    expect(onSubmit).toHaveBeenCalledWith(2, 1)
  })

  it('disables the inputs and button once the kickoff deadline has passed', () => {
    render(
      <MatchCard
        match={buildMatch({ kickoffAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() })}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    )

    expect(screen.getByLabelText('Placar de Leões')).toBeDisabled()
    expect(screen.getByText('Prazo encerrado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchCard.test.tsx`
Expected: FAIL — module `./MatchCard` not found

- [ ] **Step 3: Write MatchCard**

`frontend/src/features/matches/MatchCard.tsx`:
```tsx
import { useState } from 'react'
import type { Match, Prediction } from '../../types/api'

interface MatchCardProps {
  match: Match
  homeTeamName: string
  awayTeamName: string
  existingPrediction: Prediction | undefined
  onSubmit: (predictedHome: number, predictedAway: number) => void
  isSubmitting: boolean
}

export function MatchCard({
  match,
  homeTeamName,
  awayTeamName,
  existingPrediction,
  onSubmit,
  isSubmitting,
}: MatchCardProps) {
  const [predictedHome, setPredictedHome] = useState(existingPrediction?.predictedHome ?? 0)
  const [predictedAway, setPredictedAway] = useState(existingPrediction?.predictedAway ?? 0)
  const deadlinePassed = new Date(match.kickoffAt).getTime() <= Date.now()

  return (
    <li className="rounded-lg border border-brand-blue/20 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{new Date(match.kickoffAt).toLocaleString('pt-BR')}</span>
        {deadlinePassed && <span className="font-semibold text-red-600">Prazo encerrado</span>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="font-medium text-brand-blue-dark">{homeTeamName}</span>
        <input
          aria-label={`Placar de ${homeTeamName}`}
          type="number"
          min={0}
          value={predictedHome}
          disabled={deadlinePassed}
          onChange={(event) => setPredictedHome(Number(event.target.value))}
          className="w-14 rounded border border-slate-300 text-center"
        />
        <span>x</span>
        <input
          aria-label={`Placar de ${awayTeamName}`}
          type="number"
          min={0}
          value={predictedAway}
          disabled={deadlinePassed}
          onChange={(event) => setPredictedAway(Number(event.target.value))}
          className="w-14 rounded border border-slate-300 text-center"
        />
        <span className="font-medium text-brand-blue-dark">{awayTeamName}</span>
      </div>
      <button
        type="button"
        disabled={deadlinePassed || isSubmitting}
        onClick={() => onSubmit(predictedHome, predictedAway)}
        className="mt-3 w-full rounded bg-brand-blue py-1.5 text-white disabled:opacity-50"
      >
        {existingPrediction ? 'Atualizar palpite' : 'Enviar palpite'}
      </button>
    </li>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MatchCard.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for MatchesPage**

`frontend/src/features/matches/MatchesPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as matchesApi from '../../api/matches'
import * as predictionsApi from '../../api/predictions'
import * as teamsApi from '../../api/teams'
import { MatchesPage } from './MatchesPage'

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('MatchesPage', () => {
  it('joins team names onto each match card', async () => {
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([
      { id: 'team-1', name: 'Leões' },
      { id: 'team-2', name: 'Tigres' },
    ])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([
      {
        id: 'match-1',
        championshipId: 'champ-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        kickoffAt: new Date(Date.now() + 3600_000).toISOString(),
        homeScore: null,
        awayScore: null,
        status: 'AGENDADA',
      },
    ])
    vi.spyOn(predictionsApi, 'listMyPredictions').mockResolvedValue([])

    renderWithClient(<MatchesPage />)

    await waitFor(() => {
      expect(screen.getByText('Leões')).toBeInTheDocument()
      expect(screen.getByText('Tigres')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- MatchesPage.test.tsx`
Expected: FAIL — module `./MatchesPage` not found

- [ ] **Step 7: Write MatchesPage**

`frontend/src/features/matches/MatchesPage.tsx`:
```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listMatches } from '../../api/matches'
import { listMyPredictions, submitPrediction } from '../../api/predictions'
import { listTeams } from '../../api/teams'
import { MatchCard } from './MatchCard'

export function MatchesPage() {
  const queryClient = useQueryClient()

  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const matchesQuery = useQuery({
    queryKey: ['matches', 'AGENDADA'],
    queryFn: () => listMatches({ status: 'AGENDADA' }),
  })
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })

  const submitMutation = useMutation({
    mutationFn: submitPrediction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions', 'me'] })
    },
  })

  if (teamsQuery.isLoading || matchesQuery.isLoading || predictionsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando partidas...</p>
  }

  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const predictionsByMatch = new Map(
    (predictionsQuery.data ?? []).map((prediction) => [prediction.matchId, prediction]),
  )

  return (
    <ul className="mx-auto flex max-w-md flex-col gap-3 p-4">
      {(matchesQuery.data ?? []).map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          homeTeamName={teamNames.get(match.homeTeamId) ?? 'Time'}
          awayTeamName={teamNames.get(match.awayTeamId) ?? 'Time'}
          existingPrediction={predictionsByMatch.get(match.id)}
          isSubmitting={submitMutation.isPending}
          onSubmit={(predictedHome, predictedAway) =>
            submitMutation.mutate({ matchId: match.id, predictedHome, predictedAway })
          }
        />
      ))}
    </ul>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- MatchesPage.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/matches/
git commit -m "feat: add partidas screen with inline palpite"
```

---

### Task 12: RankingPage

**Files:**
- Create: `frontend/src/features/ranking/RankingPage.tsx`
- Test: `frontend/src/features/ranking/RankingPage.test.tsx`

**Interfaces:**
- Consumes: `getRanking` from `../../api/ranking` (Task 10), `useQuery` from `@tanstack/react-query`.
- Produces: `RankingPage` component, imported by `router.tsx` in Task 14.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/ranking/RankingPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as rankingApi from '../../api/ranking'
import { RankingPage } from './RankingPage'

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('RankingPage', () => {
  it('renders the ranking entries in order with points', async () => {
    vi.spyOn(rankingApi, 'getRanking').mockResolvedValue([
      { userId: 'u-1', userName: 'Ana', totalPoints: 9 },
      { userId: 'u-2', userName: 'Bia', totalPoints: 6 },
    ])

    renderWithClient(<RankingPage />)

    await waitFor(() => {
      expect(screen.getByText(/1\. Ana/)).toBeInTheDocument()
      expect(screen.getByText(/2\. Bia/)).toBeInTheDocument()
      expect(screen.getByText('9 pts')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RankingPage.test.tsx`
Expected: FAIL — module `./RankingPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/ranking/RankingPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { getRanking } from '../../api/ranking'

export function RankingPage() {
  const rankingQuery = useQuery({ queryKey: ['ranking'], queryFn: () => getRanking() })

  if (rankingQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando ranking...</p>
  }

  return (
    <ol className="mx-auto max-w-md p-4">
      {(rankingQuery.data ?? []).map((entry, index) => (
        <li key={entry.userId} className="flex justify-between border-b border-brand-blue/10 py-2">
          <span>
            {index + 1}. {entry.userName}
          </span>
          <span className="font-semibold text-brand-blue-dark">{entry.totalPoints} pts</span>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RankingPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/ranking/
git commit -m "feat: add ranking screen"
```

---

### Task 13: NavBar

**Files:**
- Create: `frontend/src/components/NavBar.tsx`
- Test: `frontend/src/components/NavBar.test.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../context/AuthContext` (Task 5), `Link` from `react-router-dom`.
- Produces: `NavBar` component, used by the root layout in `router.tsx` (Task 14).

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/NavBar.test.tsx`:
```tsx
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
    await user.click(screen.getByText('Sair'))
    expect(screen.queryByText('Partidas')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- NavBar.test.tsx`
Expected: FAIL — module `./NavBar` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/components/NavBar.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <nav className="flex justify-center gap-6 bg-brand-blue p-3 text-white">
      <Link to="/partidas">Partidas</Link>
      <Link to="/ranking">Ranking</Link>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </nav>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- NavBar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/NavBar.tsx frontend/src/components/NavBar.test.tsx
git commit -m "feat: add NavBar"
```

---

### Task 14: Router + final App wiring

**Files:**
- Create: `frontend/src/router.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `LoginPage` (Task 7), `RegisterPage` (Task 6), `MatchesPage` (Task 11), `RankingPage` (Task 12), `ProtectedRoute` (Task 8), `NavBar` (Task 13), `AuthProvider` (Task 5).
- Produces: the fully wired `App` component — the plan's final deliverable.

- [ ] **Step 1: Create the router**

`frontend/src/router.tsx`:
```tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { MatchesPage } from './features/matches/MatchesPage'
import { RankingPage } from './features/ranking/RankingPage'

function RootLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/partidas', element: <MatchesPage /> },
          { path: '/ranking', element: <RankingPage /> },
        ],
      },
    ],
  },
])
```

- [ ] **Step 2: Replace the smoke test with the routing integration test**

`frontend/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('redirects an anonymous visitor to the login screen', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- App.test.tsx`
Expected: FAIL — `App` still renders the old "VZBet" placeholder, not the login screen

- [ ] **Step 4: Wire up the real App**

`frontend/src/App.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { router } from './router'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- App.test.tsx`
Expected: PASS

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS (all suites, ~25 tests)

- [ ] **Step 7: Verify the app runs**

Run: `npm run dev` (in `frontend/`), open the printed local URL in a browser
Expected: redirects to `/login`; with the backend running locally (`cd backend && npm run start:dev`), cadastro → login → partidas (with palpite) → ranking all work end-to-end

- [ ] **Step 8: Commit**

```bash
git add frontend/src/router.tsx frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: wire up router, NavBar, and providers into App"
```

---

## Self-Review Notes

- **Spec coverage:** all 4 screens (cadastro, login, partidas+palpite, ranking), the API client, AuthContext/token storage, routing/guards, error handling (`ApiError` message surfaced verbatim, 401 → auto-logout), and Vitest+RTL testing are each covered by a task. Deploy (Vercel) and admin screens are explicitly out of scope per the spec and are not tasked here.
- **Placeholder scan:** no TBD/TODO; every step has complete, runnable code.
- **Type consistency:** `Match`/`Team`/`Prediction`/`RankingEntry`/payload shapes defined once in Task 4 and reused verbatim (same field names/casing) by every later task — checked `homeTeamId`/`awayTeamId`/`kickoffAt`/`predictedHome`/`predictedAway`/`totalPoints` against `backend/src/matches/domain/match-repository.interface.ts`, `backend/src/predictions/presentation/dto/submit-prediction.dto.ts`, and `backend/src/predictions/use-cases/get-ranking.use-case.ts` — all match.
- **Ordering check:** Task 14 (router) is last because it's the only task that imports all four page components (Tasks 6, 7, 11, 12) plus `ProtectedRoute` (Task 8) and `NavBar` (Task 13) — no task imports something a later task defines.
