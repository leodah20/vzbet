import type { Prediction } from '../types/api'

export interface PerformanceSummary {
  totalPoints: number
  scoredCount: number
  hitCount: number
  hitRate: number
  longestStreak: number
}

export function calculatePerformanceSummary(predictions: Prediction[]): PerformanceSummary {
  const scored = predictions.filter((prediction) => prediction.pointsEarned !== null)
  const totalPoints = scored.reduce((sum, prediction) => sum + (prediction.pointsEarned ?? 0), 0)
  const hitCount = scored.filter((prediction) => (prediction.pointsEarned ?? 0) > 0).length
  const hitRate = scored.length === 0 ? 0 : Math.round((hitCount / scored.length) * 100)

  let longestStreak = 0
  let currentStreak = 0
  for (const prediction of scored) {
    if ((prediction.pointsEarned ?? 0) > 0) {
      currentStreak += 1
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return { totalPoints, scoredCount: scored.length, hitCount, hitRate, longestStreak }
}
