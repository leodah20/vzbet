import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
