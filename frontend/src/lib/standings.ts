import type { Match, Team } from '../types/api'

export interface StandingsEntry {
  teamId: string
  teamName: string
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export function calculateStandings(matches: Match[], teams: Team[]): StandingsEntry[] {
  const teamNames = new Map(teams.map((team) => [team.id, team.name]))
  const entries = new Map<string, StandingsEntry>()

  function getEntry(teamId: string): StandingsEntry {
    const existing = entries.get(teamId)
    if (existing) return existing
    const created: StandingsEntry = {
      teamId,
      teamName: teamNames.get(teamId) ?? 'Time',
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    }
    entries.set(teamId, created)
    return created
  }

  for (const match of matches) {
    if (match.status !== 'FINALIZADA' || match.homeScore === null || match.awayScore === null) {
      continue
    }
    const home = getEntry(match.homeTeamId)
    const away = getEntry(match.awayTeamId)

    home.played += 1
    away.played += 1
    home.goalsFor += match.homeScore
    home.goalsAgainst += match.awayScore
    away.goalsFor += match.awayScore
    away.goalsAgainst += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.points += 3
      home.wins += 1
      away.losses += 1
    } else if (match.homeScore < match.awayScore) {
      away.points += 3
      away.wins += 1
      home.losses += 1
    } else {
      home.points += 1
      away.points += 1
      home.draws += 1
      away.draws += 1
    }
  }

  for (const entry of entries.values()) {
    entry.goalDifference = entry.goalsFor - entry.goalsAgainst
  }

  return Array.from(entries.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName, 'pt-BR')
  })
}
