# Gráficos e Ícones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a points-progression line chart to Meus Palpites (Recharts) and swap `BadgeCard`'s hand-drawn icons for `lucide-react` equivalents.

**Architecture:** A pure function (`calculatePointsProgression`) turns the torcedor's scored predictions into a chronological cumulative-points series; a Recharts `AreaChart` component renders it with an empty-state fallback. `BadgeCard`'s medal shape (gradient, border, ribbon) is untouched — only its internal `CategoryIcon` switches from hand-drawn `<svg>` paths to imported Lucide icon components.

**Tech Stack:** React, TanStack Query, Recharts (new dependency), lucide-react (new dependency), Vitest + RTL.

## Global Constraints

- No backend changes — `calculatePointsProgression` derives everything from `GET /predictions/me` + `GET /matches`, both already fetched by `MeusPalpitesPage`.
- Chart is a single series (the torcedor's own points) — per the dataviz skill, a single series needs no legend; the section heading names it. One brand-blue hue only, no rainbow, no dual axis.
- Recharts' `ResponsiveContainer` needs real DOM layout, which JSDOM doesn't provide — the chart's test asserts on a wrapping `data-testid`, not deep SVG internals.
- `BadgeCard`'s medal shape (gradient classes, ribbon, border) does not change — only the icon inside changes.

---

### Task 1: `calculatePointsProgression` pure function

**Files:**
- Create: `frontend/src/lib/pointsProgression.ts`
- Test: `frontend/src/lib/pointsProgression.test.ts`

**Interfaces:**
- Produces: `PointsProgressionEntry { date: string; cumulativePoints: number }`, `calculatePointsProgression(predictions: Prediction[], matches: Match[]): PointsProgressionEntry[]` — used by Task 3 (`MeusPalpitesPage`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/pointsProgression.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { calculatePointsProgression } from './pointsProgression'
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
    kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: null, awayScore: null, status: 'FINALIZADA',
    ...overrides,
  }
}

describe('calculatePointsProgression', () => {
  it('accumulates points in chronological order of the match kickoff', () => {
    const predictions = [
      buildPrediction({ id: 'p2', matchId: 'm2', pointsEarned: 7 }),
      buildPrediction({ id: 'p1', matchId: 'm1', pointsEarned: 3 }),
    ]
    const matches = [
      buildMatch({ id: 'm1', kickoffAt: '2026-06-01T15:00:00.000Z' }),
      buildMatch({ id: 'm2', kickoffAt: '2026-06-08T15:00:00.000Z' }),
    ]

    const progression = calculatePointsProgression(predictions, matches)

    expect(progression).toEqual([
      { date: '2026-06-01T15:00:00.000Z', cumulativePoints: 3 },
      { date: '2026-06-08T15:00:00.000Z', cumulativePoints: 10 },
    ])
  })

  it('ignores predictions that have not been scored yet', () => {
    const predictions = [buildPrediction({ id: 'p1', matchId: 'm1', pointsEarned: null })]
    const matches = [buildMatch({ id: 'm1' })]

    expect(calculatePointsProgression(predictions, matches)).toEqual([])
  })

  it('returns an empty list when there are no predictions', () => {
    expect(calculatePointsProgression([], [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- pointsProgression.test.ts`
Expected: FAIL — module `./pointsProgression` not found

- [ ] **Step 3: Write the implementation**

`frontend/src/lib/pointsProgression.ts`:
```ts
import type { Match, Prediction } from '../types/api'

export interface PointsProgressionEntry {
  date: string
  cumulativePoints: number
}

export function calculatePointsProgression(predictions: Prediction[], matches: Match[]): PointsProgressionEntry[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]))

  const scored = predictions
    .filter((prediction) => prediction.pointsEarned !== null)
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.matchId) }))
    .filter((entry): entry is { prediction: Prediction; match: Match } => entry.match !== undefined)
    .sort((a, b) => new Date(a.match.kickoffAt).getTime() - new Date(b.match.kickoffAt).getTime())

  let cumulative = 0
  return scored.map(({ prediction, match }) => {
    cumulative += prediction.pointsEarned ?? 0
    return { date: match.kickoffAt, cumulativePoints: cumulative }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- pointsProgression.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pointsProgression.ts frontend/src/lib/pointsProgression.test.ts
git commit -m "feat: add pure cumulative points-progression calculation"
```

---

### Task 2: `PointsProgressionChart` component

**Files:**
- Modify: `frontend/package.json` (add `recharts` dependency)
- Create: `frontend/src/features/predictions/PointsProgressionChart.tsx`
- Test: `frontend/src/features/predictions/PointsProgressionChart.test.tsx`

**Interfaces:**
- Consumes: `PointsProgressionEntry` from Task 1.
- Produces: `PointsProgressionChart({ data: PointsProgressionEntry[] })` — used by Task 3 (`MeusPalpitesPage`).

- [ ] **Step 1: Add the recharts dependency**

In `frontend/package.json`, add to `"dependencies"` (keep the object alphabetically sorted):
```json
    "@tanstack/react-query": "^5.62.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "recharts": "^2.13.0"
```

Run: `cd frontend && npm install`
Expected: `recharts` added to `node_modules` and `package-lock.json`

- [ ] **Step 2: Write the failing tests**

`frontend/src/features/predictions/PointsProgressionChart.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PointsProgressionChart } from './PointsProgressionChart'

describe('PointsProgressionChart', () => {
  it('shows an empty-state message when there is no scored data yet', () => {
    render(<PointsProgressionChart data={[]} />)
    expect(screen.getByText('Ainda sem palpites pontuados.')).toBeInTheDocument()
  })

  it('renders the chart container when there is data', () => {
    render(
      <PointsProgressionChart
        data={[
          { date: '2026-06-01T15:00:00.000Z', cumulativePoints: 3 },
          { date: '2026-06-08T15:00:00.000Z', cumulativePoints: 10 },
        ]}
      />,
    )
    expect(screen.getByTestId('points-progression-chart')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test -- PointsProgressionChart.test.tsx`
Expected: FAIL — module `./PointsProgressionChart` not found

- [ ] **Step 4: Write the implementation**

`frontend/src/features/predictions/PointsProgressionChart.tsx`:
```tsx
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PointsProgressionEntry } from '../../lib/pointsProgression'

interface PointsProgressionChartProps {
  data: PointsProgressionEntry[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function PointsProgressionChart({ data }: PointsProgressionChartProps) {
  if (data.length === 0) {
    return <p className="p-4 text-center text-sm text-slate-500">Ainda sem palpites pontuados.</p>
  }

  const chartData = data.map((entry) => ({ ...entry, label: formatDate(entry.date) }))

  return (
    <div
      className="h-48 w-full rounded-lg border border-brand-blue/20 bg-white p-3"
      data-testid="points-progression-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="pointsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value} pts`, 'Total']}
            labelFormatter={(label: string) => `Jogo de ${label}`}
            contentStyle={{ borderRadius: 8, borderColor: '#1d4ed8' }}
          />
          <Area
            type="monotone"
            dataKey="cumulativePoints"
            stroke="#1d4ed8"
            strokeWidth={2}
            fill="url(#pointsFill)"
            dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- PointsProgressionChart.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/features/predictions/PointsProgressionChart.tsx frontend/src/features/predictions/PointsProgressionChart.test.tsx
git commit -m "feat: add points-progression chart component"
```

---

### Task 3: Wire the chart into `MeusPalpitesPage`

**Files:**
- Modify: `frontend/src/features/predictions/MeusPalpitesPage.tsx`
- Modify: `frontend/src/features/predictions/MeusPalpitesPage.test.tsx`

**Interfaces:**
- Consumes: `calculatePointsProgression` (Task 1), `PointsProgressionChart` (Task 2).
- Produces: final integration point for the chart — no later task depends on this.

- [ ] **Step 1: Write the failing test**

Add this test to `frontend/src/features/predictions/MeusPalpitesPage.test.tsx` (keep the existing test as-is; add this new one):
```tsx
  it('renders the points-progression chart above the history list', async () => {
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
    vi.spyOn(rankingApi, 'getRanking').mockResolvedValue([
      { userId: 'user-1', userName: 'Torcedor Demo', totalPoints: 7 },
    ])

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('points-progression-chart')).toBeInTheDocument()
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- MeusPalpitesPage.test.tsx`
Expected: FAIL — no element with `data-testid="points-progression-chart"` renders yet

- [ ] **Step 3: Update the implementation**

In `frontend/src/features/predictions/MeusPalpitesPage.tsx`, add the imports:
```tsx
import { calculatePointsProgression } from '../../lib/pointsProgression'
import { PointsProgressionChart } from './PointsProgressionChart'
```

Add this line right after `const summary = calculatePerformanceSummary(predictions)`:
```tsx
  const progression = calculatePointsProgression(predictions, matchesQuery.data ?? [])
```

Add the chart section between the existing summary `<div>` and the history `<ul>`:
```tsx
      <div className="mt-4">
        <PointsProgressionChart data={progression} />
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- MeusPalpitesPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/predictions/MeusPalpitesPage.tsx frontend/src/features/predictions/MeusPalpitesPage.test.tsx
git commit -m "feat: show the points-progression chart in Meus Palpites"
```

---

### Task 4: Swap `BadgeCard` icons to lucide-react

**Files:**
- Modify: `frontend/package.json` (add `lucide-react` dependency)
- Modify: `frontend/src/components/BadgeCard.tsx`

**Interfaces:**
- No signature changes — `BadgeCard`'s props and exports are identical before and after.

- [ ] **Step 1: Add the lucide-react dependency**

In `frontend/package.json`, add to `"dependencies"`:
```json
    "lucide-react": "^0.468.0",
```

Run: `cd frontend && npm install`
Expected: `lucide-react` added to `node_modules` and `package-lock.json`

- [ ] **Step 2: Run the existing BadgeCard tests to confirm the current baseline passes**

Run: `cd frontend && npm test -- BadgeCard.test.tsx`
Expected: PASS (3 tests) — confirms the pre-change baseline before touching the icon internals

- [ ] **Step 3: Replace the hand-drawn icons with Lucide components**

In `frontend/src/components/BadgeCard.tsx`, add the import at the top:
```tsx
import { Flag, Flame, Target, Trophy } from 'lucide-react'
```

Replace the entire `CategoryIcon` function:
```tsx
function CategoryIcon({ category, className }: { category: BadgeCategory; className: string }) {
  switch (category) {
    case 'ranking':
      return <Trophy className={className} />
    case 'sequencia':
      return <Flame className={className} />
    case 'participacao':
      return <Flag className={className} />
    case 'multipla':
      return <Target className={className} />
  }
}
```

(No other part of `BadgeCard.tsx` changes — the medal `<div>`, ribbon `<span>`s, gradient classes, and progress bar are untouched.)

- [ ] **Step 4: Run tests to verify they still pass**

Run: `cd frontend && npm test -- BadgeCard.test.tsx`
Expected: PASS (3 tests) — unchanged, since these tests assert on text labels and confetti pieces, not icon SVG internals

- [ ] **Step 5: Run the full frontend test suite and production build**

Run: `cd frontend && npm test && npm run build`
Expected: PASS (all suites), build succeeds with no type errors

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/BadgeCard.tsx
git commit -m "feat: swap badge icons to lucide-react for a more polished finish"
```

---

## Self-Review Notes

- **Spec coverage:** points-progression chart (Tasks 1-3) with the recommended empty-state, single-hue treatment, and gridline/tooltip polish from the dataviz skill; badge icon swap (Task 4) preserving the already-approved medal shape — every section of the spec has a task.
- **Placeholder scan:** none found.
- **Type consistency:** `PointsProgressionEntry { date, cumulativePoints }` defined once in Task 1, consumed identically by Task 2's props and Task 3's wiring.
- **JSDOM/Recharts note:** Task 2's test deliberately checks a wrapping `data-testid` rather than Recharts' internal SVG (which needs real layout dimensions ResponsiveContainer can't get from JSDOM) — flagged so the implementer doesn't chase a false failure trying to assert on chart internals.
- **Regression check:** Task 4 explicitly runs `BadgeCard.test.tsx` both before and after the icon swap to prove the existing tests (which never touched icon internals) keep passing unmodified.
