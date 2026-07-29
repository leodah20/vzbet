import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('submits the typed prediction', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MatchCard
        match={buildMatch()}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    )

    await user.clear(screen.getByLabelText('Placar de Leões'))
    await user.type(screen.getByLabelText('Placar de Leões'), '2')
    await user.clear(screen.getByLabelText('Placar de Tigres'))
    await user.type(screen.getByLabelText('Placar de Tigres'), '1')
    await user.click(screen.getByText('Enviar palpite'))

    expect(onSubmit).toHaveBeenCalledWith(2, 1)
  })

  it('disables the inputs and button once the kickoff deadline has passed', () => {
    render(
      <MatchCard
        match={buildMatch({ kickoffAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() })}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    )

    expect(screen.getByLabelText('Placar de Leões')).toBeDisabled()
    expect(screen.getByText('Prazo encerrado')).toBeInTheDocument()
  })
})
