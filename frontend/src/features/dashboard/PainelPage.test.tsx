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
