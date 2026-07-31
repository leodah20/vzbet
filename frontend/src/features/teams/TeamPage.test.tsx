import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

    expect(screen.getByText('Estatísticas')).toBeInTheDocument()
    expect(screen.getByText('Casa: 1V 1E 0D')).toBeInTheDocument()
    expect(screen.getByText('Fora: 0V 0E 0D')).toBeInTheDocument()
    expect(screen.getByText('Média de gols: 1.5 marcados, 1.0 sofridos')).toBeInTheDocument()
    expect(screen.getByLabelText('Forma recente')).toBeInTheDocument()

    expect(screen.getAllByText('confronto direto')).toHaveLength(2)

    await user.click(screen.getAllByText('confronto direto')[0])

    expect(screen.getAllByText('confronto direto')).toHaveLength(1)
    expect(screen.getByText('Ver todos')).toBeInTheDocument()
  })
})
