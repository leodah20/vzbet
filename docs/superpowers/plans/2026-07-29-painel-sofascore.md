# Painel Sofascore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add classificação, team profile (roster + upcoming/past matches + head-to-head), and a personal palpite-history screen with a lightweight performance summary — all reusing existing backend endpoints, no backend changes.

**Architecture:** Every new screen follows the same "fetch + client-side join + render" pattern already used by `MatchesPage`/`RankingPage`. Standings and performance-summary math are pure functions in `frontend/src/lib/`, independently unit-tested, so the screens themselves stay thin.

**Tech Stack:** Same frontend stack as the rest of the project (React, TanStack Query, React Router, Tailwind, Vitest + RTL). Depends on the aposta múltipla plan having landed first (this plan's `Prediction`/`SubmitPredictionPayload` types and `MatchCard` come from there).

## Global Constraints

- No backend changes in this plan — every new screen is powered by endpoints that already exist (`GET /matches`, `GET /teams`, `GET /teams/:id`, `GET /teams/:teamId/players`, `GET /championships`, `GET /predictions/me`).
- "Pontos de classificação" (3 vitória / 1 empate / 0 derrota, football standings) are a completely different number from "pontos de palpite" (the torcedor's prediction score) — never conflate the two in naming or UI copy.
- Blue/white brand, zero green, same as the rest of the app.

---

### Task 1: Standings calculation

**Files:**
- Create: `frontend/src/lib/standings.ts`
- Test: `frontend/src/lib/standings.test.ts`

**Interfaces:**
- Produces: `StandingsEntry { teamId, teamName, points, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference }`, `calculateStandings(matches: Match[], teams: Team[]): StandingsEntry[]` — used by Task 4 (`ClassificacaoPage`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/standings.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { calculateStandings } from './standings'
import type { Match, Team } from '../types/api'

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm',
    championshipId: 'c1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    round: 1,
    kickoffAt: '2026-08-01T15:00:00.000Z',
    homeScore: 2,
    awayScore: 1,
    status: 'FINALIZADA',
    ...overrides,
  }
}

const teams: Team[] = [
  { id: 'team-1', name: 'Leões', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
  { id: 'team-2', name: 'Tigres', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
  { id: 'team-3', name: 'Águias', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
]

describe('calculateStandings', () => {
  it('computes points, goal difference, and sorts the winner first', () => {
    const standings = calculateStandings([buildMatch({ id: 'm1' })], teams.slice(0, 2))

    expect(standings[0]).toMatchObject({
      teamId: 'team-1', points: 3, wins: 1, goalsFor: 2, goalsAgainst: 1, goalDifference: 1,
    })
    expect(standings[1]).toMatchObject({
      teamId: 'team-2', points: 0, losses: 1, goalsFor: 1, goalsAgainst: 2, goalDifference: -1,
    })
  })

  it('splits a point each way for a draw', () => {
    const standings = calculateStandings(
      [buildMatch({ id: 'm1', homeScore: 1, awayScore: 1 })],
      teams.slice(0, 2),
    )

    expect(standings.find((entry) => entry.teamId === 'team-1')).toMatchObject({ points: 1, draws: 1 })
    expect(standings.find((entry) => entry.teamId === 'team-2')).toMatchObject({ points: 1, draws: 1 })
  })

  it('ignores matches that are not finalizada or have no score yet', () => {
    const standings = calculateStandings(
      [buildMatch({ id: 'm1', status: 'AGENDADA', homeScore: null, awayScore: null })],
      teams.slice(0, 2),
    )

    expect(standings.every((entry) => entry.played === 0)).toBe(true)
  })

  it('breaks a points tie by goal difference', () => {
    const matches: Match[] = [
      buildMatch({ id: 'm1', homeTeamId: 'team-1', awayTeamId: 'team-3', homeScore: 3, awayScore: 0 }),
      buildMatch({ id: 'm2', homeTeamId: 'team-2', awayTeamId: 'team-3', homeScore: 1, awayScore: 0 }),
    ]

    const standings = calculateStandings(matches, teams)

    expect(standings[0].teamId).toBe('team-1')
    expect(standings[1].teamId).toBe('team-2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- standings.test.ts`
Expected: FAIL — module `./standings` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/lib/standings.ts`:
```ts
import type { Match, Team } from '../types/api'

export interface StandingsEntry {
  teamId: string
  teamName: string
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export function calculateStandings(matches: Match[], teams: Team[]): StandingsEntry[] {
  const teamNames = new Map(teams.map((team) => [team.id, team.name]))
  const entries = new Map<string, StandingsEntry>()

  function getEntry(teamId: string): StandingsEntry {
    const existing = entries.get(teamId)
    if (existing) return existing
    const created: StandingsEntry = {
      teamId,
      teamName: teamNames.get(teamId) ?? 'Time',
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    }
    entries.set(teamId, created)
    return created
  }

  for (const match of matches) {
    if (match.status !== 'FINALIZADA' || match.homeScore === null || match.awayScore === null) {
      continue
    }
    const home = getEntry(match.homeTeamId)
    const away = getEntry(match.awayTeamId)

    home.played += 1
    away.played += 1
    home.goalsFor += match.homeScore
    home.goalsAgainst += match.awayScore
    away.goalsFor += match.awayScore
    away.goalsAgainst += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.points += 3
      home.wins += 1
      away.losses += 1
    } else if (match.homeScore < match.awayScore) {
      away.points += 3
      away.wins += 1
      home.losses += 1
    } else {
      home.points += 1
      away.points += 1
      home.draws += 1
      away.draws += 1
    }
  }

  for (const entry of entries.values()) {
    entry.goalDifference = entry.goalsFor - entry.goalsAgainst
  }

  return Array.from(entries.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName, 'pt-BR')
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- standings.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/standings.ts frontend/src/lib/standings.test.ts
git commit -m "feat: add pure standings calculation"
```

---

### Task 2: Championships API

**Files:**
- Modify: `frontend/src/types/api.ts`
- Create: `frontend/src/api/championships.ts`
- Test: `frontend/src/api/championships.test.ts`

**Interfaces:**
- Produces: `Championship { id, name, season, format, startDate, endDate }`, `listChampionships(): Promise<Championship[]>` — used by Task 3 (`CampeonatosPage`) and Task 4 (`ClassificacaoPage`).

- [ ] **Step 1: Add the Championship type**

Add to `frontend/src/types/api.ts`:
```ts
export type ChampionshipFormat = 'PONTOS_CORRIDOS' | 'MATA_MATA'

export interface Championship {
  id: string
  name: string
  season: string
  format: ChampionshipFormat
  startDate: string
  endDate: string
}
```

- [ ] **Step 2: Write the failing test**

`frontend/src/api/championships.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listChampionships } from './championships'

describe('championships api', () => {
  it('fetches /championships', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listChampionships()

    expect(spy).toHaveBeenCalledWith('/championships')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm test -- championships.test.ts`
Expected: FAIL — module `./championships` not found

- [ ] **Step 4: Write the implementation**

`frontend/src/api/championships.ts`:
```ts
import { apiFetch } from './client'
import type { Championship } from '../types/api'

export function listChampionships(): Promise<Championship[]> {
  return apiFetch<Championship[]>('/championships')
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- championships.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/api/championships.ts frontend/src/api/championships.test.ts
git commit -m "feat: add championships API function"
```

---

### Task 3: CampeonatosPage

**Files:**
- Create: `frontend/src/features/championships/CampeonatosPage.tsx`
- Test: `frontend/src/features/championships/CampeonatosPage.test.tsx`

**Interfaces:**
- Consumes: `listChampionships` from Task 2.
- Produces: `CampeonatosPage` component, imported by `router.tsx` in Task 8.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/championships/CampeonatosPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as championshipsApi from '../../api/championships'
import { CampeonatosPage } from './CampeonatosPage'

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampeonatosPage', () => {
  it('lists championship names and seasons', async () => {
    vi.spyOn(championshipsApi, 'listChampionships').mockResolvedValue([
      {
        id: 'c1', name: 'Copa Metal Ferraz Municipal', season: '2026',
        format: 'PONTOS_CORRIDOS', startDate: '2026-03-01', endDate: '2026-12-15',
      },
    ])

    renderWithProviders(<CampeonatosPage />)

    await waitFor(() => {
      expect(screen.getByText('Copa Metal Ferraz Municipal')).toBeInTheDocument()
      expect(screen.getByText('Temporada 2026')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- CampeonatosPage.test.tsx`
Expected: FAIL — module `./CampeonatosPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/championships/CampeonatosPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listChampionships } from '../../api/championships'

export function CampeonatosPage() {
  const championshipsQuery = useQuery({ queryKey: ['championships'], queryFn: listChampionships })

  if (championshipsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando campeonatos...</p>
  }

  return (
    <ul className="mx-auto flex max-w-md flex-col gap-2 p-4">
      {(championshipsQuery.data ?? []).map((championship) => (
        <li key={championship.id}>
          <Link
            to={`/campeonatos/${championship.id}`}
            className="block rounded-lg border border-brand-blue/20 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-brand-blue-dark">{championship.name}</p>
            <p className="text-sm text-slate-500">Temporada {championship.season}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- CampeonatosPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/championships/CampeonatosPage.tsx frontend/src/features/championships/CampeonatosPage.test.tsx
git commit -m "feat: add campeonatos list screen"
```

---

### Task 4: ClassificacaoPage

**Files:**
- Create: `frontend/src/features/championships/ClassificacaoPage.tsx`
- Test: `frontend/src/features/championships/ClassificacaoPage.test.tsx`

**Interfaces:**
- Consumes: `listChampionships` (Task 2), `calculateStandings` (Task 1), `listMatches` and `listTeams` (already exist from the frontend MVP).
- Produces: `ClassificacaoPage` component, imported by `router.tsx` in Task 8.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/championships/ClassificacaoPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as championshipsApi from '../../api/championships'
import * as matchesApi from '../../api/matches'
import * as teamsApi from '../../api/teams'
import { ClassificacaoPage } from './ClassificacaoPage'

function renderAt(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/campeonatos/${id}`]}>
        <Routes>
          <Route path="/campeonatos/:id" element={<ClassificacaoPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClassificacaoPage', () => {
  it('renders the championship name and the winning team first', async () => {
    vi.spyOn(championshipsApi, 'listChampionships').mockResolvedValue([
      {
        id: 'c1', name: 'Copa Metal Ferraz Municipal', season: '2026',
        format: 'PONTOS_CORRIDOS', startDate: '2026-03-01', endDate: '2026-12-15',
      },
    ])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([
      {
        id: 'm1', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-2', round: 1,
        kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: 3, awayScore: 0, status: 'FINALIZADA',
      },
    ])
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([
      { id: 'team-1', name: 'Leões', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
      { id: 'team-2', name: 'Tigres', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
    ])

    renderAt('c1')

    await waitFor(() => {
      expect(screen.getByText('Copa Metal Ferraz Municipal')).toBeInTheDocument()
    })
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Leões')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ClassificacaoPage.test.tsx`
Expected: FAIL — module `./ClassificacaoPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/championships/ClassificacaoPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { listChampionships } from '../../api/championships'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { calculateStandings } from '../../lib/standings'

export function ClassificacaoPage() {
  const { id } = useParams<{ id: string }>()

  const championshipsQuery = useQuery({ queryKey: ['championships'], queryFn: listChampionships })
  const matchesQuery = useQuery({
    queryKey: ['matches', 'championship', id, 'FINALIZADA'],
    queryFn: () => listMatches({ championshipId: id, status: 'FINALIZADA' }),
    enabled: Boolean(id),
  })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })

  if (championshipsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando classificação...</p>
  }

  const championship = (championshipsQuery.data ?? []).find((item) => item.id === id)
  const standings = calculateStandings(matchesQuery.data ?? [], teamsQuery.data ?? [])

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">{championship?.name ?? 'Campeonato'}</h1>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-brand-blue/20 text-left text-slate-500">
            <th className="py-2">Time</th>
            <th className="text-center">P</th>
            <th className="text-center">J</th>
            <th className="text-center">V</th>
            <th className="text-center">E</th>
            <th className="text-center">D</th>
            <th className="text-center">GP</th>
            <th className="text-center">GC</th>
            <th className="text-center">SG</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((entry) => (
            <tr key={entry.teamId} className="border-b border-brand-blue/10">
              <td className="py-2 font-medium text-brand-blue-dark">
                <Link to={`/times/${entry.teamId}`} className="hover:underline">
                  {entry.teamName}
                </Link>
              </td>
              <td className="text-center">{entry.points}</td>
              <td className="text-center">{entry.played}</td>
              <td className="text-center">{entry.wins}</td>
              <td className="text-center">{entry.draws}</td>
              <td className="text-center">{entry.losses}</td>
              <td className="text-center">{entry.goalsFor}</td>
              <td className="text-center">{entry.goalsAgainst}</td>
              <td className="text-center">{entry.goalDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- ClassificacaoPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/championships/ClassificacaoPage.tsx frontend/src/features/championships/ClassificacaoPage.test.tsx
git commit -m "feat: add classificação screen"
```

---

### Task 5: Players API + getTeam

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/api/teams.ts`
- Modify: `frontend/src/api/teams.test.ts`
- Create: `frontend/src/api/players.ts`
- Test: `frontend/src/api/players.test.ts`

**Interfaces:**
- Produces: `Player { id, name, position, number, photoUrl, teamId }`, `listPlayersByTeam(teamId): Promise<Player[]>`, `getTeam(id): Promise<Team>` — used by Task 6 (`TeamPage`).

- [ ] **Step 1: Add the Player type**

Add to `frontend/src/types/api.ts`:
```ts
export interface Player {
  id: string
  name: string
  position: string
  number: number
  photoUrl: string | null
  teamId: string
}
```

- [ ] **Step 2: Write the failing tests**

`frontend/src/api/players.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listPlayersByTeam } from './players'

describe('players api', () => {
  it('fetches /teams/:teamId/players', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listPlayersByTeam('team-1')

    expect(spy).toHaveBeenCalledWith('/teams/team-1/players')
  })
})
```

Add this test to `frontend/src/api/teams.test.ts` (keep the existing "fetches /teams" test):
```ts
  it('fetches /teams/:id', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      id: 'team-1', name: 'Roma FC', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null,
    })

    await getTeam('team-1')

    expect(spy).toHaveBeenCalledWith('/teams/team-1')
  })
```

(Add `getTeam` to the existing `import { listTeams } from './teams'` line, making it `import { getTeam, listTeams } from './teams'`.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test -- players.test.ts teams.test.ts`
Expected: FAIL — module `./players` not found; `getTeam` is not exported from `./teams`

- [ ] **Step 4: Write the implementations**

`frontend/src/api/players.ts`:
```ts
import { apiFetch } from './client'
import type { Player } from '../types/api'

export function listPlayersByTeam(teamId: string): Promise<Player[]> {
  return apiFetch<Player[]>(`/teams/${teamId}/players`)
}
```

Add to `frontend/src/api/teams.ts` (below `listTeams`):
```ts
export function getTeam(id: string): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- players.test.ts teams.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/api/players.ts frontend/src/api/players.test.ts frontend/src/api/teams.ts frontend/src/api/teams.test.ts
git commit -m "feat: add players API and getTeam"
```

---

### Task 6: TeamPage

**Files:**
- Create: `frontend/src/features/teams/TeamPage.tsx`
- Test: `frontend/src/features/teams/TeamPage.test.tsx`

**Interfaces:**
- Consumes: `getTeam`, `listTeams` (Task 5 + existing), `listPlayersByTeam` (Task 5), `listMatches` (existing).
- Produces: `TeamPage` component, imported by `router.tsx` in Task 8.

- [ ] **Step 1: Write the failing test**

`frontend/src/features/teams/TeamPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as teamsApi from '../../api/teams'
import * as matchesApi from '../../api/matches'
import * as playersApi from '../../api/players'
import { TeamPage } from './TeamPage'

function renderAt(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/times/${id}`]}>
        <Routes>
          <Route path="/times/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TeamPage', () => {
  it('renders the team header, roster, and results, and filters head-to-head on click', async () => {
    const user = userEvent.setup()
    vi.spyOn(teamsApi, 'getTeam').mockResolvedValue({
      id: 'team-1', name: 'Roma FC', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null,
    })
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([
      { id: 'team-1', name: 'Roma FC', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
      { id: 'team-2', name: '100 Freio FC', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
      { id: 'team-3', name: 'Bola de Fogo FC', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
    ])
    vi.spyOn(playersApi, 'listPlayersByTeam').mockResolvedValue([
      { id: 'pl1', name: 'João', position: 'Atacante', number: 9, photoUrl: null, teamId: 'team-1' },
    ])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([
      {
        id: 'm1', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-2', round: 1,
        kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: 2, awayScore: 1, status: 'FINALIZADA',
      },
      {
        id: 'm2', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-3', round: 2,
        kickoffAt: '2026-06-08T15:00:00.000Z', homeScore: 1, awayScore: 1, status: 'FINALIZADA',
      },
    ])

    renderAt('team-1')

    await waitFor(() => {
      expect(screen.getByText('Roma FC')).toBeInTheDocument()
      expect(screen.getByText(/João/)).toBeInTheDocument()
    })

    expect(screen.getAllByText('confronto direto')).toHaveLength(2)

    await user.click(screen.getAllByText('confronto direto')[0])

    expect(screen.getAllByText('confronto direto')).toHaveLength(1)
    expect(screen.getByText('Ver todos')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- TeamPage.test.tsx`
Expected: FAIL — module `./TeamPage` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/features/teams/TeamPage.tsx`:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getTeam, listTeams } from '../../api/teams'
import { listMatches } from '../../api/matches'
import { listPlayersByTeam } from '../../api/players'
import type { Match } from '../../types/api'

export function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const [headToHeadOpponentId, setHeadToHeadOpponentId] = useState<string | null>(null)

  const teamQuery = useQuery({ queryKey: ['team', id], queryFn: () => getTeam(id!), enabled: Boolean(id) })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const playersQuery = useQuery({
    queryKey: ['players', id],
    queryFn: () => listPlayersByTeam(id!),
    enabled: Boolean(id),
  })
  const matchesQuery = useQuery({
    queryKey: ['matches', 'team', id],
    queryFn: () => listMatches({ teamId: id }),
    enabled: Boolean(id),
  })

  if (teamQuery.isLoading || teamsQuery.isLoading || playersQuery.isLoading || matchesQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando time...</p>
  }

  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const allMatches = matchesQuery.data ?? []
  const upcoming = allMatches.filter((match) => match.status === 'AGENDADA')
  const finished = allMatches
    .filter((match) => match.status === 'FINALIZADA')
    .filter((match) =>
      headToHeadOpponentId
        ? match.homeTeamId === headToHeadOpponentId || match.awayTeamId === headToHeadOpponentId
        : true,
    )

  function opponentOf(match: Match): string {
    return match.homeTeamId === id ? match.awayTeamId : match.homeTeamId
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">{teamQuery.data?.name}</h1>
      <p className="text-sm text-slate-500">{teamQuery.data?.region}</p>

      <h2 className="mt-4 font-semibold text-brand-blue-dark">Elenco</h2>
      {(playersQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum jogador cadastrado ainda.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {(playersQuery.data ?? []).map((player) => (
            <li key={player.id} className="text-sm">
              #{player.number} {player.name} — {player.position}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-4 font-semibold text-brand-blue-dark">Próximos jogos</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {upcoming.map((match) => (
          <li key={match.id} className="text-sm">
            {new Date(match.kickoffAt).toLocaleDateString('pt-BR')} — {teamNames.get(match.homeTeamId)} x{' '}
            {teamNames.get(match.awayTeamId)}
          </li>
        ))}
      </ul>

      <h2 className="mt-4 flex items-center justify-between font-semibold text-brand-blue-dark">
        Últimos resultados
        {headToHeadOpponentId && (
          <button
            type="button"
            onClick={() => setHeadToHeadOpponentId(null)}
            className="text-xs font-normal text-brand-blue underline"
          >
            Ver todos
          </button>
        )}
      </h2>
      <ul className="mt-2 flex flex-col gap-1">
        {finished.map((match) => (
          <li key={match.id} className="text-sm">
            {new Date(match.kickoffAt).toLocaleDateString('pt-BR')} — {teamNames.get(match.homeTeamId)}{' '}
            {match.homeScore} x {match.awayScore} {teamNames.get(match.awayTeamId)}{' '}
            <button
              type="button"
              onClick={() => setHeadToHeadOpponentId(opponentOf(match))}
              className="text-brand-blue underline"
            >
              confronto direto
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- TeamPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/teams/TeamPage.tsx frontend/src/features/teams/TeamPage.test.tsx
git commit -m "feat: add team profile screen with roster and head-to-head filter"
```

---

### Task 7: Performance summary + MeusPalpitesPage

**Files:**
- Create: `frontend/src/lib/performance.ts`
- Test: `frontend/src/lib/performance.test.ts`
- Create: `frontend/src/features/predictions/MeusPalpitesPage.tsx`
- Test: `frontend/src/features/predictions/MeusPalpitesPage.test.tsx`

**Interfaces:**
- Produces: `PerformanceSummary { totalPoints, scoredCount, hitCount, hitRate, longestStreak }`, `calculatePerformanceSummary(predictions: Prediction[]): PerformanceSummary`, and the `MeusPalpitesPage` component (imported by `router.tsx` in Task 8).

- [ ] **Step 1: Write the failing tests for the performance summary**

`frontend/src/lib/performance.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { calculatePerformanceSummary } from './performance'
import type { Prediction } from '../types/api'

function buildPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'p', matchId: 'm', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null, pointsEarned: 3,
    ...overrides,
  }
}

describe('calculatePerformanceSummary', () => {
  it('sums points and computes hit rate only over scored predictions', () => {
    const summary = calculatePerformanceSummary([
      buildPrediction({ id: 'p1', pointsEarned: 3 }),
      buildPrediction({ id: 'p2', pointsEarned: 0 }),
      buildPrediction({ id: 'p3', pointsEarned: null }),
    ])

    expect(summary.totalPoints).toBe(3)
    expect(summary.scoredCount).toBe(2)
    expect(summary.hitCount).toBe(1)
    expect(summary.hitRate).toBe(50)
  })

  it('finds the longest streak of consecutive hits', () => {
    const summary = calculatePerformanceSummary([
      buildPrediction({ id: 'p1', pointsEarned: 3 }),
      buildPrediction({ id: 'p2', pointsEarned: 7 }),
      buildPrediction({ id: 'p3', pointsEarned: 0 }),
      buildPrediction({ id: 'p4', pointsEarned: 3 }),
    ])

    expect(summary.longestStreak).toBe(2)
  })

  it('returns a zero summary for no scored predictions', () => {
    const summary = calculatePerformanceSummary([buildPrediction({ pointsEarned: null })])

    expect(summary).toEqual({ totalPoints: 0, scoredCount: 0, hitCount: 0, hitRate: 0, longestStreak: 0 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- performance.test.ts`
Expected: FAIL — module `./performance` not found

- [ ] **Step 3: Write the performance summary implementation**

`frontend/src/lib/performance.ts`:
```ts
import type { Prediction } from '../types/api'

export interface PerformanceSummary {
  totalPoints: number
  scoredCount: number
  hitCount: number
  hitRate: number
  longestStreak: number
}

export function calculatePerformanceSummary(predictions: Prediction[]): PerformanceSummary {
  const scored = predictions.filter((prediction) => prediction.pointsEarned !== null)
  const totalPoints = scored.reduce((sum, prediction) => sum + (prediction.pointsEarned ?? 0), 0)
  const hitCount = scored.filter((prediction) => (prediction.pointsEarned ?? 0) > 0).length
  const hitRate = scored.length === 0 ? 0 : Math.round((hitCount / scored.length) * 100)

  let longestStreak = 0
  let currentStreak = 0
  for (const prediction of scored) {
    if ((prediction.pointsEarned ?? 0) > 0) {
      currentStreak += 1
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return { totalPoints, scoredCount: scored.length, hitCount, hitRate, longestStreak }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- performance.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for MeusPalpitesPage**

`frontend/src/features/predictions/MeusPalpitesPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as predictionsApi from '../../api/predictions'
import * as matchesApi from '../../api/matches'
import * as teamsApi from '../../api/teams'
import { MeusPalpitesPage } from './MeusPalpitesPage'

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('MeusPalpitesPage', () => {
  it('renders the performance summary and the joined prediction history', async () => {
    vi.spyOn(predictionsApi, 'listMyPredictions').mockResolvedValue([
      { id: 'p1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1, pointsEarned: 7 },
    ])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([
      {
        id: 'm1', championshipId: 'c1', homeTeamId: 'team-1', awayTeamId: 'team-2', round: 1,
        kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: 2, awayScore: 1, status: 'FINALIZADA',
      },
    ])
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([
      { id: 'team-1', name: 'Leões', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
      { id: 'team-2', name: 'Tigres', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null },
    ])

    renderWithClient(<MeusPalpitesPage />)

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Leões x Tigres')).toBeInTheDocument()
      expect(screen.getByText('7 pontos')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd frontend && npm test -- MeusPalpitesPage.test.tsx`
Expected: FAIL — module `./MeusPalpitesPage` not found

- [ ] **Step 7: Write the MeusPalpitesPage implementation**

`frontend/src/features/predictions/MeusPalpitesPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { listMyPredictions } from '../../api/predictions'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { calculatePerformanceSummary } from '../../lib/performance'

export function MeusPalpitesPage() {
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })
  const matchesQuery = useQuery({ queryKey: ['matches', 'all'], queryFn: () => listMatches() })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })

  if (predictionsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando seus palpites...</p>
  }

  const matchesById = new Map((matchesQuery.data ?? []).map((match) => [match.id, match]))
  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const predictions = predictionsQuery.data ?? []
  const summary = calculatePerformanceSummary(predictions)

  const rows = predictions
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.matchId) }))
    .filter((row) => row.match !== undefined)
    .reverse()

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Meus palpites</h1>
      <div className="mt-2 flex justify-around rounded-lg border border-brand-blue/20 bg-white p-3 text-center text-sm">
        <div>
          <p className="font-semibold text-brand-blue-dark">{summary.totalPoints}</p>
          <p className="text-slate-500">pontos</p>
        </div>
        <div>
          <p className="font-semibold text-brand-blue-dark">{summary.hitRate}%</p>
          <p className="text-slate-500">de acerto</p>
        </div>
        <div>
          <p className="font-semibold text-brand-blue-dark">{summary.longestStreak}</p>
          <p className="text-slate-500">maior sequência</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(({ prediction, match }) => (
          <li key={prediction.id} className="rounded-lg border border-brand-blue/10 bg-white p-3 text-sm">
            <p className="text-slate-500">{new Date(match!.kickoffAt).toLocaleDateString('pt-BR')}</p>
            <p className="text-brand-blue-dark">
              {teamNames.get(match!.homeTeamId)} x {teamNames.get(match!.awayTeamId)}
            </p>
            <p>
              Seu palpite: {prediction.predictedOutcome}
              {prediction.predictedHome !== null && ` (${prediction.predictedHome}x${prediction.predictedAway})`}
            </p>
            <p>{prediction.pointsEarned === null ? 'Aguardando resultado' : `${prediction.pointsEarned} pontos`}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd frontend && npm test -- MeusPalpitesPage.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/performance.ts frontend/src/lib/performance.test.ts frontend/src/features/predictions/MeusPalpitesPage.tsx frontend/src/features/predictions/MeusPalpitesPage.test.tsx
git commit -m "feat: add palpite-history screen with a lightweight performance summary"
```

---

### Task 8: Router, NavBar, and team-name links

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/components/NavBar.tsx`
- Modify: `frontend/src/components/NavBar.test.tsx`
- Modify: `frontend/src/features/matches/MatchCard.tsx`
- Modify: `frontend/src/features/matches/MatchCard.test.tsx`
- Modify: `frontend/src/features/matches/MatchesPage.test.tsx`

**Interfaces:**
- Consumes: `CampeonatosPage` (Task 3), `ClassificacaoPage` (Task 4), `TeamPage` (Task 6), `MeusPalpitesPage` (Task 7).
- Produces: final wiring — no later task depends on this.

- [ ] **Step 1: Add the new routes**

Replace the `AppRoutes` function in `frontend/src/router.tsx`:

```tsx
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { CampeonatosPage } from './features/championships/CampeonatosPage'
import { ClassificacaoPage } from './features/championships/ClassificacaoPage'
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
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
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

- [ ] **Step 2: Update the failing NavBar test**

Replace the second test in `frontend/src/components/NavBar.test.tsx`:

```tsx
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm test -- NavBar.test.tsx`
Expected: FAIL — "Campeonatos" and "Meus Palpites" links don't exist yet

- [ ] **Step 4: Update NavBar**

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
    <nav className="flex flex-wrap justify-center gap-4 bg-brand-blue p-3 text-white">
      <Link to="/partidas">Partidas</Link>
      <Link to="/campeonatos">Campeonatos</Link>
      <Link to="/ranking">Ranking</Link>
      <Link to="/meus-palpites">Meus Palpites</Link>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </nav>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- NavBar.test.tsx`
Expected: PASS

- [ ] **Step 6: Update MatchCard's failing test to wrap in a Router**

Replace `frontend/src/features/matches/MatchCard.test.tsx` entirely:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
  it('submits a simple outcome-only prediction', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MemoryRouter>
        <MatchCard
          match={buildMatch()}
          homeTeamName="Leões"
          awayTeamName="Tigres"
          existingPrediction={undefined}
          onSubmit={onSubmit}
          isSubmitting={false}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByText('Casa vence'))
    await user.click(screen.getByText('Enviar palpite'))

    expect(onSubmit).toHaveBeenCalledWith('CASA', null, null)
  })

  it('locks the outcome buttons to match the typed score and submits a múltipla', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MemoryRouter>
        <MatchCard
          match={buildMatch()}
          homeTeamName="Leões"
          awayTeamName="Tigres"
          existingPrediction={undefined}
          onSubmit={onSubmit}
          isSubmitting={false}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByText(/arriscar o placar exato/))
    await user.clear(screen.getByLabelText('Placar de Leões'))
    await user.type(screen.getByLabelText('Placar de Leões'), '2')
    await user.clear(screen.getByLabelText('Placar de Tigres'))
    await user.type(screen.getByLabelText('Placar de Tigres'), '1')

    expect(screen.getByText('Casa vence')).toBeDisabled()
    expect(screen.getByText('Empate')).toBeDisabled()

    await user.click(screen.getByText('Enviar palpite'))

    expect(onSubmit).toHaveBeenCalledWith('CASA', 2, 1)
  })

  it('disables everything once the kickoff deadline has passed', () => {
    render(
      <MemoryRouter>
        <MatchCard
          match={buildMatch({ kickoffAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() })}
          homeTeamName="Leões"
          awayTeamName="Tigres"
          existingPrediction={undefined}
          onSubmit={vi.fn()}
          isSubmitting={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Casa vence')).toBeDisabled()
    expect(screen.getByText('Prazo encerrado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd frontend && npm test -- MatchCard.test.tsx`
Expected: FAIL — `MatchCard` doesn't render team names as links yet (this on its own wouldn't fail the test, but confirms the harness before the next step: run it now purely to have a clean baseline, then implement)

- [ ] **Step 8: Update MatchCard to link team names**

In `frontend/src/features/matches/MatchCard.tsx`, add `import { Link } from 'react-router-dom'` to the imports, and replace the team-name row:

```tsx
      <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium">
        <Link to={`/times/${match.homeTeamId}`} className="text-brand-blue-dark hover:underline">
          {homeTeamName}
        </Link>
        <span className="text-slate-400">x</span>
        <Link to={`/times/${match.awayTeamId}`} className="text-brand-blue-dark hover:underline">
          {awayTeamName}
        </Link>
      </div>
```

(This replaces the previous `<span>{homeTeamName}</span> x <span>{awayTeamName}</span>` block. Everything else in the component is unchanged.)

- [ ] **Step 9: Run test to verify it passes**

Run: `cd frontend && npm test -- MatchCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 10: Update MatchesPage's test to wrap in a Router**

In `frontend/src/features/matches/MatchesPage.test.tsx`, add `import { MemoryRouter } from 'react-router-dom'` to the imports, and replace the `renderWithClient` helper:

```tsx
function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
```

- [ ] **Step 11: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS (all suites)

- [ ] **Step 12: Run the production build**

Run: `cd frontend && npm run build`
Expected: SUCCESS, no type errors

- [ ] **Step 13: Commit**

```bash
git add frontend/src/router.tsx frontend/src/components/NavBar.tsx frontend/src/components/NavBar.test.tsx frontend/src/features/matches/MatchCard.tsx frontend/src/features/matches/MatchCard.test.tsx frontend/src/features/matches/MatchesPage.test.tsx
git commit -m "feat: wire campeonatos/times/meus-palpites routes and link team names"
```

---

## Self-Review Notes

- **Spec coverage:** classificação (Tasks 1, 4), página do time with roster + upcoming/past + head-to-head (Task 6, using Task 5's players API), meus palpites with the lightweight performance summary (Task 7), campeonatos list (Task 3) needed to reach the standings screen, navigation wiring (Task 8) — every section of the spec has a task.
- **Placeholder scan:** none found.
- **Type consistency:** `StandingsEntry`, `PerformanceSummary`, `Championship`, `Player` field names checked for consistency between their producing task and every consuming task (`ClassificacaoPage`, `MeusPalpitesPage`, `TeamPage`).
- **Cross-cutting retrofit:** Task 8 explicitly touches `MatchCard.tsx`/`MatchCard.test.tsx`/`MatchesPage.test.tsx` from the aposta múltipla plan, since adding `<Link>` to team names requires a Router context those tests didn't previously need — called out so it isn't missed as "someone else's file."
