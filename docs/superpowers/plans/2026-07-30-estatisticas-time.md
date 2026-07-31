# Estatísticas por time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Estatísticas" section to `TeamPage` — home/away record, goals-for/against averages, and recent form dots — computed on-the-fly from the matches the page already fetches. Spec: `docs/superpowers/specs/2026-07-30-estatisticas-time-design.md`.

**Architecture:** A pure function (`calculateTeamStats`) derives the stats from `Match[]` already fetched by `TeamPage`. A small presentational component (`FormaRecente`) renders the last-5-results dots. `TeamPage` places the new section between "Elenco" and "Próximos jogos".

**Tech Stack:** React, TanStack Query (existing `listMatches` from `frontend/src/api/matches.ts`), Tailwind, Vitest + RTL. No backend changes.

## Global Constraints

- No backend/schema changes — everything is computed client-side from `GET /matches?teamId=`, which already exists.
- Blue/white brand, zero green — the loss dot is gray (`slate`), never green. Red is reserved for genuine semantic danger, not used here.
- All stats are aggregated across all championships (same pattern as the existing "Próximos jogos"/"Últimos resultados" sections).
- `recentForm` is chronological (oldest → newest), most recent match at the right.

---

### Task 1: `calculateTeamStats` pure function

**Files:**
- Create: `frontend/src/lib/teamStats.ts`
- Test: `frontend/src/lib/teamStats.test.ts`

**Interfaces:**
- Produces: `TeamRecord { wins, draws, losses }`, `TeamStats { homeRecord, awayRecord, avgGoalsFor, avgGoalsAgainst, recentForm }` — consumed by Task 3 (`TeamPage`) and passed as the prop shape to Task 2 (`FormaRecente`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/teamStats.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { calculateTeamStats } from './teamStats'
import type { Match } from '../types/api'

function buildMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm', championshipId: 'c', homeTeamId: 'team-1', awayTeamId: 'team-2', round: 1,
    kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: null, awayScore: null, status: 'AGENDADA',
    ...overrides,
  }
}

describe('calculateTeamStats', () => {
  it('splits the record into home and away results', () => {
    const stats = calculateTeamStats('team-1', [
      buildMatch({ homeScore: 2, awayScore: 1, status: 'FINALIZADA' }),
      buildMatch({ homeScore: 1, awayScore: 1, status: 'FINALIZADA' }),
      buildMatch({ homeTeamId: 'team-2', awayTeamId: 'team-1', homeScore: 0, awayScore: 2, status: 'FINALIZADA' }),
      buildMatch({ homeTeamId: 'team-2', awayTeamId: 'team-1', homeScore: 1, awayScore: 0, status: 'FINALIZADA' }),
    ])
    expect(stats.homeRecord).toEqual({ wins: 1, draws: 1, losses: 0 })
    expect(stats.awayRecord).toEqual({ wins: 1, draws: 0, losses: 1 })
  })

  it('rounds goals averages to one decimal place', () => {
    const stats = calculateTeamStats('team-1', [
      buildMatch({ homeScore: 2, awayScore: 1, status: 'FINALIZADA' }),
      buildMatch({ homeScore: 1, awayScore: 0, status: 'FINALIZADA' }),
    ])
    expect(stats.avgGoalsFor).toBe(1.5)
    expect(stats.avgGoalsAgainst).toBe(0.5)
  })

  it('keeps the 5 most recent results, oldest first, seen from the team perspective', () => {
    const stats = calculateTeamStats('team-1', [
      buildMatch({ id: 'm1', homeScore: 1, awayScore: 0, status: 'FINALIZADA' }),
      buildMatch({ id: 'm2', homeScore: 2, awayScore: 1, status: 'FINALIZADA', kickoffAt: '2026-06-02T15:00:00.000Z' }),
      buildMatch({ id: 'm3', homeScore: 2, awayScore: 0, status: 'FINALIZADA', kickoffAt: '2026-06-03T15:00:00.000Z' }),
      buildMatch({ id: 'm4', homeTeamId: 'team-2', awayTeamId: 'team-1', homeScore: 1, awayScore: 0, status: 'FINALIZADA', kickoffAt: '2026-06-04T15:00:00.000Z' }),
      buildMatch({ id: 'm5', homeScore: 1, awayScore: 1, status: 'FINALIZADA', kickoffAt: '2026-06-05T15:00:00.000Z' }),
      buildMatch({ id: 'm6', homeScore: 3, awayScore: 2, status: 'FINALIZADA', kickoffAt: '2026-06-06T15:00:00.000Z' }),
    ])
    expect(stats.recentForm).toEqual(['V', 'V', 'D', 'E', 'V'])
  })

  it('ignores scheduled and cancelled matches entirely', () => {
    const stats = calculateTeamStats('team-1', [
      buildMatch({ id: 'm1', homeScore: 2, awayScore: 1, status: 'FINALIZADA' }),
      buildMatch({ id: 'm2', status: 'AGENDADA' }),
      buildMatch({ id: 'm3', homeScore: 2, awayScore: 2, status: 'CANCELADA' }),
    ])
    expect(stats.homeRecord).toEqual({ wins: 1, draws: 0, losses: 0 })
    expect(stats.avgGoalsFor).toBe(2)
    expect(stats.recentForm).toEqual(['V'])
  })

  it('returns zeros for a team with no finished matches', () => {
    const stats = calculateTeamStats('team-1', [
      buildMatch({ id: 'm1', awayTeamId: 'team-3' }),
      buildMatch({ id: 'm2', homeTeamId: 'team-3', awayTeamId: 'team-2', homeScore: 2, awayScore: 1, status: 'FINALIZADA' }),
    ])
    expect(stats.homeRecord).toEqual({ wins: 0, draws: 0, losses: 0 })
    expect(stats.awayRecord).toEqual({ wins: 0, draws: 0, losses: 0 })
    expect(stats.avgGoalsFor).toBe(0)
    expect(stats.avgGoalsAgainst).toBe(0)
    expect(stats.recentForm).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- teamStats.test.ts`
Expected: FAIL — module `./teamStats` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/lib/teamStats.ts`:
```ts
import type { Match } from '../types/api'

export type FormResult = 'V' | 'E' | 'D'

export interface TeamRecord {
  wins: number
  draws: number
  losses: number
}

export interface TeamStats {
  homeRecord: TeamRecord
  awayRecord: TeamRecord
  avgGoalsFor: number
  avgGoalsAgainst: number
  recentForm: FormResult[]
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function calculateTeamStats(teamId: string, matches: Match[]): TeamStats {
  const finished = matches
    .filter((match) => match.status === 'FINALIZADA' && match.homeScore !== null && match.awayScore !== null)
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)

  const homeRecord: TeamRecord = { wins: 0, draws: 0, losses: 0 }
  const awayRecord: TeamRecord = { wins: 0, draws: 0, losses: 0 }
  let goalsFor = 0
  let goalsAgainst = 0

  for (const match of finished) {
    const isHome = match.homeTeamId === teamId
    const record = isHome ? homeRecord : awayRecord
    const scored = isHome ? match.homeScore! : match.awayScore!
    const conceded = isHome ? match.awayScore! : match.homeScore!
    goalsFor += scored
    goalsAgainst += conceded
    if (scored > conceded) record.wins += 1
    else if (scored === conceded) record.draws += 1
    else record.losses += 1
  }

  const recentForm = finished
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .slice(-5)
    .map<FormResult>((match) => {
      const scored = match.homeTeamId === teamId ? match.homeScore! : match.awayScore!
      const conceded = match.homeTeamId === teamId ? match.awayScore! : match.homeScore!
      if (scored > conceded) return 'V'
      if (scored === conceded) return 'E'
      return 'D'
    })

  const count = finished.length
  return {
    homeRecord,
    awayRecord,
    avgGoalsFor: count === 0 ? 0 : round1(goalsFor / count),
    avgGoalsAgainst: count === 0 ? 0 : round1(goalsAgainst / count),
    recentForm,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- teamStats.test.ts`
Expected: PASS

---

### Task 2: `FormaRecente` presentational component

**Files:**
- Create: `frontend/src/components/FormaRecente.tsx`
- Test: `frontend/src/components/FormaRecente.test.tsx`

**Interfaces:**
- Receives `results: Array<'V' | 'E' | 'D'>` (from Task 1's `recentForm`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/FormaRecente.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormaRecente } from './FormaRecente'

describe('FormaRecente', () => {
  it('renders one dot per result with the right letter', () => {
    render(<FormaRecente results={['V', 'E', 'D']} />)
    expect(screen.getByText('V')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('renders nothing for an empty form', () => {
    const { container } = render(<FormaRecente results={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- FormaRecente.test.tsx`
Expected: FAIL — module `./FormaRecente` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/components/FormaRecente.tsx`:
```tsx
import type { FormResult } from '../lib/teamStats'

interface FormaRecenteProps {
  results: FormResult[]
}

const dotClasses: Record<FormResult, string> = {
  V: 'bg-brand-blue text-white',
  E: 'bg-white text-brand-blue border border-brand-blue',
  D: 'bg-slate-200 text-slate-500',
}

export function FormaRecente({ results }: FormaRecenteProps) {
  if (results.length === 0) return null
  return (
    <div className="flex gap-1.5" aria-label="Forma recente">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${dotClasses[result]}`}
        >
          {result}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- FormaRecente.test.tsx`
Expected: PASS

---

### Task 3: "Estatísticas" section in `TeamPage`

**Files:**
- Edit: `frontend/src/features/teams/TeamPage.tsx`
- Edit: `frontend/src/features/teams/TeamPage.test.tsx`

- [ ] **Step 1: Write the failing assertion**

Extend the existing test in `TeamPage.test.tsx` — after the roster assertion, add:
```tsx
expect(screen.getByText('Estatísticas')).toBeInTheDocument()
expect(screen.getByText('Casa: 1V 1E 0D')).toBeInTheDocument()
expect(screen.getByText('Fora: 0V 0E 0D')).toBeInTheDocument()
expect(screen.getByText('Média de gols: 1.5 marcados, 1.0 sofridos')).toBeInTheDocument()
expect(screen.getByLabelText('Forma recente')).toBeInTheDocument()
```
(Match data already mocked in the test: `m1` is team-1 2x1 at home, `m2` is team-1 1x1 at home → home record 1V 1E 0D, avg 1.5/1.0, form V E.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- TeamPage.test.tsx`
Expected: FAIL — "Estatísticas" text not found

- [ ] **Step 3: Write the implementation**

In `TeamPage.tsx`:
- Import `calculateTeamStats` and `FormaRecente`.
- Between the "Elenco" section and "Próximos jogos", add:
```tsx
<h2 className="mt-4 font-semibold text-brand-blue-dark">Estatísticas</h2>
{(() => {
  const stats = calculateTeamStats(id!, allMatches)
  return (
    <div className="mt-2 flex flex-col gap-1 text-sm">
      <p>Casa: {stats.homeRecord.wins}V {stats.homeRecord.draws}E {stats.homeRecord.losses}D</p>
      <p>Fora: {stats.awayRecord.wins}V {stats.awayRecord.draws}E {stats.awayRecord.losses}D</p>
      <p>Média de gols: {stats.avgGoalsFor.toFixed(1)} marcados, {stats.avgGoalsAgainst.toFixed(1)} sofridos</p>
      <div className="flex items-center gap-2">
        <span>Forma recente:</span>
        <FormaRecente results={stats.recentForm} />
      </div>
    </div>
  )
})()}
```

- [ ] **Step 4: Run the full frontend suite to verify everything passes**

Run: `cd frontend && npm test`
Expected: PASS (all suites, including the new ones and the existing `TeamPage.test.tsx`)

---

### Task 4: Final verification

- [ ] **Step 1: Build**

Run: `cd frontend && npm run build`
Expected: `tsc --noEmit` clean and Vite build succeeds.

- [ ] **Step 2: Manual smoke (optional, only if dev servers are up)**

Open a team page (`/times/:id`) and confirm the "Estatísticas" section shows between "Elenco" and "Próximos jogos", with blue `V` dots, outlined `E` dots, and gray `D` dots.

## Placeholder scan

No TBD/TODO; every step has complete, runnable code. Assumptions worth double-checking while executing:
- `Match.homeScore`/`awayScore` are non-null for `FINALIZADA` matches — the seed and backend guarantee this, but the guard `homeScore !== null` in the filter keeps the function total anyway.
- Averages round to one decimal (e.g. 1.5, 0.5) to avoid long floats in the UI.
