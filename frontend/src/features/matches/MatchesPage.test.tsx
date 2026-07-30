import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('submits the outcome and score through to the predictions API when a card is submitted', async () => {
    const user = userEvent.setup()
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
    const submitSpy = vi.spyOn(predictionsApi, 'submitPrediction').mockResolvedValue({
      id: 'p1',
      matchId: 'match-1',
      predictedOutcome: 'CASA',
      predictedHome: null,
      predictedAway: null,
      pointsEarned: null,
    })

    renderWithClient(<MatchesPage />)

    await waitFor(() => screen.getByText('Casa vence'))
    await user.click(screen.getByText('Casa vence'))
    await user.click(screen.getByText('Enviar palpite'))

    expect(submitSpy.mock.calls[0][0]).toEqual({
      matchId: 'match-1',
      predictedOutcome: 'CASA',
      predictedHome: null,
      predictedAway: null,
    })
  })
})
