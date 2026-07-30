import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as predictionsApi from '../../api/predictions'
import * as matchesApi from '../../api/matches'
import * as teamsApi from '../../api/teams'
import * as rankingApi from '../../api/ranking'
import { AuthProvider } from '../../context/AuthContext'
import { MeusPalpitesPage } from './MeusPalpitesPage'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MeusPalpitesPage />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('MeusPalpitesPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('vzbet_token', encodeFakeJwt({ sub: 'user-1', role: 'TORCEDOR' }))
  })

  it('renders the performance summary, badges, and the joined prediction history', async () => {
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
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Leões x Tigres')).toBeInTheDocument()
      expect(screen.getByText('7 pontos')).toBeInTheDocument()
    })

    expect(screen.getByText('Ousadia na múltipla')).toBeInTheDocument()
    expect(screen.getByText('Ranking geral')).toBeInTheDocument()
  })

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
})
