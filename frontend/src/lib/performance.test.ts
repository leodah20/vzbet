import { describe, expect, it } from 'vitest'
import { calculatePerformanceSummary } from './performance'
import type { Prediction } from '../types/api'

function buildPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'p', matchId: 'm', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null, pointsEarned: 3,
    ...overrides,
  }
}

describe('calculatePerformanceSummary', () => {
  it('sums points and computes hit rate only over scored predictions', () => {
    const summary = calculatePerformanceSummary([
      buildPrediction({ id: 'p1', pointsEarned: 3 }),
      buildPrediction({ id: 'p2', pointsEarned: 0 }),
      buildPrediction({ id: 'p3', pointsEarned: null }),
    ])

    expect(summary.totalPoints).toBe(3)
    expect(summary.scoredCount).toBe(2)
    expect(summary.hitCount).toBe(1)
    expect(summary.hitRate).toBe(50)
  })

  it('finds the longest streak of consecutive hits', () => {
    const summary = calculatePerformanceSummary([
      buildPrediction({ id: 'p1', pointsEarned: 3 }),
      buildPrediction({ id: 'p2', pointsEarned: 7 }),
      buildPrediction({ id: 'p3', pointsEarned: 0 }),
      buildPrediction({ id: 'p4', pointsEarned: 3 }),
    ])

    expect(summary.longestStreak).toBe(2)
  })

  it('returns a zero summary for no scored predictions', () => {
    const summary = calculatePerformanceSummary([buildPrediction({ pointsEarned: null })])

    expect(summary).toEqual({ totalPoints: 0, scoredCount: 0, hitCount: 0, hitRate: 0, longestStreak: 0 })
  })
})
