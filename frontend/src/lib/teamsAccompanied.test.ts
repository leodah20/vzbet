import { describe, expect, it } from 'vitest'
import { getAccompaniedTeamIds } from './teamsAccompanied'
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
    kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: null, awayScore: null, status: 'AGENDADA',
    ...overrides,
  }
}

describe('getAccompaniedTeamIds', () => {
  it('collects both teams from every match the torcedor predicted on', () => {
    const predictions = [buildPrediction({ id: 'p1', matchId: 'm1' })]
    const matches = [buildMatch({ id: 'm1', homeTeamId: 'team-1', awayTeamId: 'team-2' })]

    const ids = getAccompaniedTeamIds(predictions, matches)

    expect(ids).toEqual(new Set(['team-1', 'team-2']))
  })

  it('ignores predictions whose match is not in the given match list', () => {
    const predictions = [buildPrediction({ id: 'p1', matchId: 'missing-match' })]

    const ids = getAccompaniedTeamIds(predictions, [])

    expect(ids.size).toBe(0)
  })

  it('returns an empty set when there are no predictions', () => {
    expect(getAccompaniedTeamIds([], []).size).toBe(0)
  })
})
