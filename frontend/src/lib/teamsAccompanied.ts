import type { Match, Prediction } from '../types/api'

export function getAccompaniedTeamIds(predictions: Prediction[], matches: Match[]): Set<string> {
  const matchesById = new Map(matches.map((match) => [match.id, match]))
  const teamIds = new Set<string>()
  for (const prediction of predictions) {
    const match = matchesById.get(prediction.matchId)
    if (!match) continue
    teamIds.add(match.homeTeamId)
    teamIds.add(match.awayTeamId)
  }
  return teamIds
}
