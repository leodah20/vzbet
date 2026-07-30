import type { Match, Prediction } from '../types/api'

export interface PointsProgressionEntry {
  date: string
  cumulativePoints: number
}

export function calculatePointsProgression(predictions: Prediction[], matches: Match[]): PointsProgressionEntry[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]))

  const scored = predictions
    .filter((prediction) => prediction.pointsEarned !== null)
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.matchId) }))
    .filter((entry): entry is { prediction: Prediction; match: Match } => entry.match !== undefined)
    .sort((a, b) => new Date(a.match.kickoffAt).getTime() - new Date(b.match.kickoffAt).getTime())

  let cumulative = 0
  return scored.map(({ prediction, match }) => {
    cumulative += prediction.pointsEarned ?? 0
    return { date: match.kickoffAt, cumulativePoints: cumulative }
  })
}
