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
