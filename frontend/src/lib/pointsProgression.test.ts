import { describe, expect, it } from 'vitest'
import { calculatePointsProgression } from './pointsProgression'
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
    kickoffAt: '2026-06-01T15:00:00.000Z', homeScore: null, awayScore: null, status: 'FINALIZADA',
    ...overrides,
  }
}

describe('calculatePointsProgression', () => {
  it('accumulates points in chronological order of the match kickoff', () => {
    const predictions = [
      buildPrediction({ id: 'p2', matchId: 'm2', pointsEarned: 7 }),
      buildPrediction({ id: 'p1', matchId: 'm1', pointsEarned: 3 }),
    ]
    const matches = [
      buildMatch({ id: 'm1', kickoffAt: '2026-06-01T15:00:00.000Z' }),
      buildMatch({ id: 'm2', kickoffAt: '2026-06-08T15:00:00.000Z' }),
    ]

    const progression = calculatePointsProgression(predictions, matches)

    expect(progression).toEqual([
      { date: '2026-06-01T15:00:00.000Z', cumulativePoints: 3 },
      { date: '2026-06-08T15:00:00.000Z', cumulativePoints: 10 },
    ])
  })

  it('ignores predictions that have not been scored yet', () => {
    const predictions = [buildPrediction({ id: 'p1', matchId: 'm1', pointsEarned: null })]
    const matches = [buildMatch({ id: 'm1' })]

    expect(calculatePointsProgression(predictions, matches)).toEqual([])
  })

  it('returns an empty list when there are no predictions', () => {
    expect(calculatePointsProgression([], [])).toEqual([])
  })
})
