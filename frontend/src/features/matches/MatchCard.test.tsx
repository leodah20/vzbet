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
