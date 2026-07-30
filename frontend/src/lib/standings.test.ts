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
