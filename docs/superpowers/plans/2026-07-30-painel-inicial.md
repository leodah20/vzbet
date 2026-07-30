# Painel Inicial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` the new post-login home screen — a dashboard combining badges, an upcoming-matches preview, top-3 ranking, and recent results for teams the torcedor has predicted on.

**Architecture:** `PainelPage` reuses existing queries and components (`calculateBadges`, `BadgeCard`, `TeamCrest`, `getRanking`) plus one new pure function (`getAccompaniedTeamIds`). The router's `index` route moves inside the protected route group so `/` requires a session (same `ProtectedRoute` already used elsewhere) instead of unconditionally redirecting to `/login`.

**Tech Stack:** Same frontend stack as the rest of the project. No backend changes.

## Global Constraints

- No backend/schema changes — everything is computed client-side from `GET /matches`, `GET /teams`, `GET /predictions/me`, `GET /ranking`, all of which already exist.
- "Time acompanhado" = any team that has appeared in one of the torcedor's own predictions (home or away) — no favoriting concept, no new persisted data.
- The upcoming-matches preview on the panel is read-only (no palpite form) — betting stays on `/partidas`.
- Blue/white brand, zero green, same as the rest of the app.

---

### Task 1: `getAccompaniedTeamIds` pure function

**Files:**
- Create: `frontend/src/lib/teamsAccompanied.ts`
- Test: `frontend/src/lib/teamsAccompanied.test.ts`

**Interfaces:**
- Produces: `getAccompaniedTeamIds(predictions: Prediction[], matches: Match[]): Set<string>` — used by Task 2 (`PainelPage`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/teamsAccompanied.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { getAccompaniedTeamIds } from './teamsAccompanied'
import type { Match, Prediction } from '../types/api'

function buildPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'p', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null, pointsEarned: null,
    ...overrides,
  }
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-2', round: 1,
    kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: null, awayScore: null, status: 'AGENDADA',
    ...overrides,
  }
}

describe('getAccompaniedTeamIds', () => {
  it('collects both teams from every match the torcedor predicted on', () => {
    const predictions = [buildPrediction({ id: 'p1', matchId: 'm1' })]
    const matches = [buildMatch({ id: 'm1', homeTeamId: 'team-1', awayTeamId: 'team-2' })]

    const ids = getAccompaniedTeamIds(predictions, matches)

    expect(ids).toEqual(new Set(['team-1', 'team-2']))
  })

  it('ignores predictions whose match is not in the given match list', () => {
    const predictions = [buildPrediction({ id: 'p1', matchId: 'missing-match' })]

    const ids = getAccompaniedTeamIds(predictions, [])

    expect(ids.size).toBe(0)
  })

  it('returns an empty set when there are no predictions', () => {
    expect(getAccompaniedTeamIds([], []).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- teamsAccompanied.test.ts`
Expected: FAIL — module `./teamsAccompanied` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/lib/teamsAccompanied.ts`:
```ts
import type { Match, Prediction } from '../types/api'

export function getAccompaniedTeamIds(predictions: Prediction[], matches: Match[]): Set<string> {
  const matchesById = new Map(matches.map((match) => [match.id, match]))
  const teamIds = new Set<string>()
  for (const prediction of predictions) {
    const match = matchesById.get(prediction.matchId)
    if (!match) continue
    teamIds.add(match.homeTeamId)
    teamIds.add(match.awayTeamId)
  }
  return teamIds
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- teamsAccompanied.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/teamsAccompanied.ts frontend/src/lib/teamsAccompanied.test.ts
git commit -m "feat: add pure function for teams the torcedor has predicted on"
```

---

### Task 2: `PainelPage`

**Files:**
- Create: `frontend/src/features/dashboard/PainelPage.tsx`
- Test: `frontend/src/features/dashboard/PainelPage.test.tsx`

**Interfaces:**
- Consumes: `calculateBadges` + `useBadgeCelebration` (existing), `BadgeCard` + `TeamCrest` (existing), `getAccompaniedTeamIds` (Task 1), `listMyPredictions`/`listMatches`/`listTeams`/`getRanking` (all existing API functions), `useAuth` (existing).
- Produces: `PainelPage` component, imported by `router.tsx` in Task 3.

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/dashboard/PainelPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as predictionsApi from '../../api/predictions'
import * as matchesApi from '../../api/matches'
import * as teamsApi from '../../api/teams'
import * as rankingApi from '../../api/ranking'
import { AuthProvider } from '../../context/AuthContext'
import { PainelPage } from './PainelPage'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <PainelPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('PainelPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('vzbet_token', encodeFakeJwt({ sub: 'user-1', role: 'TORCEDOR' }))
  })

  it('renders badges, an upcoming match, top ranking, and a recent result for an accompanied team', async () => {
    vi.spyOn(predictionsApi, 'listMyPredictions').mockResolvedValue([
      { id: 'p1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1, pointsEarned: 7 },
    ])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([
      {
        id: 'm1', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-2', round: 1,
        kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: 2, awayScore: 1, status: 'FINALIZADA',
      },
      {
        id: 'm2', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-3', round: 2,
        kickoffAt: '2026-08-15T15:00:00.000Z', homeScore: null, awayScore: null, status: 'AGENDADA',
      },
    ])
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([
      { id: 'team-1', name: 'Leões', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
      { id: 'team-2', name: 'Tigres', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
      { id: 'team-3', name: 'Águias', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
    ])
    vi.spyOn(rankingApi, 'getRanking').mockResolvedValue([
      { userId: 'user-1', userName: 'Torcedor Demo', totalPoints: 7 },
    ])

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Seus emblemas')).toBeInTheDocument()
      expect(screen.getByText(/Leões x Águias/)).toBeInTheDocument()
      expect(screen.getByText(/1\. Torcedor Demo/)).toBeInTheDocument()
      expect(screen.getByText(/Leões 2 x 1 Tigres/)).toBeInTheDocument()
    })
  })

  it('shows an empty state for recent results when the torcedor has no predictions yet', async () => {
    vi.spyOn(predictionsApi, 'listMyPredictions').mockResolvedValue([])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([])
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([])
    vi.spyOn(rankingApi, 'getRanking').mockResolvedValue([])

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Dê seu primeiro palpite para acompanhar times aqui.')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- PainelPage.test.tsx`
Expected: FAIL — module `./PainelPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/dashboard/PainelPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listMyPredictions } from '../../api/predictions'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { getRanking } from '../../api/ranking'
import { calculateBadges } from '../../lib/badges'
import { useBadgeCelebration } from '../../lib/useBadgeCelebration'
import { getAccompaniedTeamIds } from '../../lib/teamsAccompanied'
import { useAuth } from '../../context/AuthContext'
import { BadgeCard } from '../../components/BadgeCard'
import { TeamCrest } from '../../components/TeamCrest'

export function PainelPage() {
  const { user } = useAuth()
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })
  const matchesQuery = useQuery({ queryKey: ['matches', 'all'], queryFn: () => listMatches() })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const rankingQuery = useQuery({ queryKey: ['ranking'], queryFn: () => getRanking() })

  // Every hook below must run on every render, in the same order, regardless of
  // loading state — the loading early-return happens after all of them.
  const predictions = predictionsQuery.data ?? []
  const allMatches = matchesQuery.data ?? []
  const rankingIndex = (rankingQuery.data ?? []).findIndex((entry) => entry.userId === user?.id)
  const rankingPosition = rankingIndex === -1 ? null : rankingIndex + 1
  const badges = calculateBadges(predictions, rankingPosition)
  const newlyUnlocked = useBadgeCelebration(badges.map(({ category, tier }) => ({ category, tier })))

  if (predictionsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading || rankingQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando painel...</p>
  }

  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))

  const upcoming = allMatches
    .filter((match) => match.status === 'AGENDADA')
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .slice(0, 3)

  const topRanking = (rankingQuery.data ?? []).slice(0, 3)

  const accompaniedTeamIds = getAccompaniedTeamIds(predictions, allMatches)
  const recentResults = allMatches
    .filter((match) => match.status === 'FINALIZADA')
    .filter((match) => accompaniedTeamIds.has(match.homeTeamId) || accompaniedTeamIds.has(match.awayTeamId))
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Painel</h1>

      <section className="mt-3">
        <h2 className="font-semibold text-brand-blue-dark">Seus emblemas</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-4 rounded-lg border border-brand-blue/20 bg-white p-3">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.category}
              status={badge}
              isNewlyUnlocked={newlyUnlocked.has(`${badge.category}:${badge.tier}`)}
            />
          ))}
        </div>
        <Link to="/meus-palpites" className="mt-1 block text-sm text-brand-blue underline">
          Ver meus palpites
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-semibold text-brand-blue-dark">Próximos jogos</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {upcoming.map((match) => (
            <li
              key={match.id}
              className="flex items-center justify-between rounded-lg border border-brand-blue/10 bg-white p-3 text-sm"
            >
              <span className="text-slate-500">{new Date(match.kickoffAt).toLocaleDateString('pt-BR')}</span>
              <span className="flex items-center gap-2 text-brand-blue-dark">
                <TeamCrest teamName={teamNames.get(match.homeTeamId) ?? 'Time'} size={24} />
                {teamNames.get(match.homeTeamId)} x {teamNames.get(match.awayTeamId)}
                <TeamCrest teamName={teamNames.get(match.awayTeamId) ?? 'Time'} size={24} />
              </span>
            </li>
          ))}
        </ul>
        <Link to="/partidas" className="mt-1 block text-sm text-brand-blue underline">
          Ver todas as partidas
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-semibold text-brand-blue-dark">Top 3 do ranking</h2>
        <ol className="mt-2 flex flex-col gap-1 rounded-lg border border-brand-blue/10 bg-white p-3 text-sm">
          {topRanking.map((entry, index) => (
            <li
              key={entry.userId}
              className={`flex justify-between ${
                entry.userId === user?.id ? 'font-semibold text-brand-blue-dark' : ''
              }`}
            >
              <span>
                {index + 1}. {entry.userName}
              </span>
              <span>{entry.totalPoints} pts</span>
            </li>
          ))}
        </ol>
        <Link to="/ranking" className="mt-1 block text-sm text-brand-blue underline">
          Ver ranking completo
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-semibold text-brand-blue-dark">Últimos resultados dos times que você acompanha</h2>
        {recentResults.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Dê seu primeiro palpite para acompanhar times aqui.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {recentResults.map((match) => (
              <li key={match.id} className="rounded-lg border border-brand-blue/10 bg-white p-3 text-sm">
                {new Date(match.kickoffAt).toLocaleDateString('pt-BR')} — {teamNames.get(match.homeTeamId)}{' '}
                {match.homeScore} x {match.awayScore} {teamNames.get(match.awayTeamId)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- PainelPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/PainelPage.tsx frontend/src/features/dashboard/PainelPage.test.tsx
git commit -m "feat: add home dashboard panel"
```

---

### Task 3: Router, login redirect, and nav link

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/features/auth/LoginPage.tsx`
- Modify: `frontend/src/features/auth/LoginPage.test.tsx`
- Modify: `frontend/src/components/NavBar.tsx`
- Modify: `frontend/src/components/NavBar.test.tsx`

**Interfaces:**
- Consumes: `PainelPage` from Task 2.
- Produces: final wiring — no later task depends on this.

- [ ] **Step 1: Update the failing LoginPage test**

Replace `frontend/src/features/auth/LoginPage.test.tsx` entirely:
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
  it('logs in and navigates to / on success', async () => {
    const user = userEvent.setup()
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: encodeFakeJwt({ sub: 'u-1', role: 'TORCEDOR' }),
    })

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>Painel inicial</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Painel inicial')).toBeInTheDocument()
    expect(localStorage.getItem('vzbet_token')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- LoginPage.test.tsx`
Expected: FAIL — `LoginPage` still navigates to `/partidas`, not `/`

- [ ] **Step 3: Update LoginPage's post-login navigation**

In `frontend/src/features/auth/LoginPage.tsx`, change the `navigate` call inside `handleSubmit`:

```tsx
      navigate('/')
```

(Replaces `navigate('/partidas')`. Nothing else in the file changes.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Update the failing NavBar test**

Add this assertion inside the "shows the nav links and logs out on click" test in `frontend/src/components/NavBar.test.tsx`, right after the existing `expect(screen.getByText('Partidas'))...` line:

```tsx
    expect(screen.getByText('Painel')).toBeInTheDocument()
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd frontend && npm test -- NavBar.test.tsx`
Expected: FAIL — no "Painel" link exists yet

- [ ] **Step 7: Add the Painel link to NavBar**

In `frontend/src/components/NavBar.tsx`, add a link before `Partidas`:

```tsx
      <Link to="/">Painel</Link>
      <Link to="/partidas">Partidas</Link>
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd frontend && npm test -- NavBar.test.tsx`
Expected: PASS

- [ ] **Step 9: Move the index route into the protected group**

Replace `frontend/src/router.tsx` entirely:

```tsx
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { CampeonatosPage } from './features/championships/CampeonatosPage'
import { ClassificacaoPage } from './features/championships/ClassificacaoPage'
import { PainelPage } from './features/dashboard/PainelPage'
import { MatchesPage } from './features/matches/MatchesPage'
import { MeusPalpitesPage } from './features/predictions/MeusPalpitesPage'
import { RankingPage } from './features/ranking/RankingPage'
import { TeamPage } from './features/teams/TeamPage'

function RootLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route index element={<PainelPage />} />
          <Route path="/partidas" element={<MatchesPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/campeonatos" element={<CampeonatosPage />} />
          <Route path="/campeonatos/:id" element={<ClassificacaoPage />} />
          <Route path="/times/:id" element={<TeamPage />} />
          <Route path="/meus-palpites" element={<MeusPalpitesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

(This removes the old unconditional `<Navigate to="/login" replace />` index route — an anonymous visit to `/` now falls through to `ProtectedRoute`, which already redirects to `/login` when there's no session, so the existing `App.test.tsx` "redirects an anonymous visitor" test keeps passing unchanged.)

- [ ] **Step 10: Run the full frontend test suite and production build**

Run: `cd frontend && npm test && npm run build`
Expected: PASS (all suites), build succeeds with no type errors

- [ ] **Step 11: Commit**

```bash
git add frontend/src/router.tsx frontend/src/features/auth/LoginPage.tsx frontend/src/features/auth/LoginPage.test.tsx frontend/src/components/NavBar.tsx frontend/src/components/NavBar.test.tsx
git commit -m "feat: make the painel the home screen after login"
```

---

## Self-Review Notes

- **Spec coverage:** all four panel sections (badges, upcoming preview, top-3 ranking, recent results for accompanied teams), the "acompanhado" definition (Task 1), the empty-state for a torcedor with no predictions yet (Task 2's second test), and the routing/login/nav changes (Task 3) — every section of the spec has a task.
- **Placeholder scan:** none found.
- **Type consistency:** `getAccompaniedTeamIds` signature matches between Task 1 and its use in Task 2; `PainelPage` import path (`./features/dashboard/PainelPage`) matches between Task 2's file location and Task 3's router import.
- **Rules-of-hooks check:** `PainelPage` calls all four `useQuery` hooks and `useBadgeCelebration` before the loading early-return, same fix already applied to `MeusPalpitesPage` — verified this pattern is repeated correctly here, not left for the implementer to rediscover.
- **Regression check:** confirmed `App.test.tsx`'s existing anonymous-redirect test needs no changes, since `ProtectedRoute` (already used by every other protected route) takes over the redirect duty from the removed bare `Navigate` index route.
