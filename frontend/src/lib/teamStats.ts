import type { Match } from '../types/api'

export type FormResult = 'V' | 'E' | 'D'

export interface TeamRecord {
  wins: number
  draws: number
  losses: number
}

export interface TeamStats {
  homeRecord: TeamRecord
  awayRecord: TeamRecord
  avgGoalsFor: number
  avgGoalsAgainst: number
  recentForm: FormResult[]
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function calculateTeamStats(teamId: string, matches: Match[]): TeamStats {
  const finished = matches
    .filter((match) => match.status === 'FINALIZADA' && match.homeScore !== null && match.awayScore !== null)
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)

  const homeRecord: TeamRecord = { wins: 0, draws: 0, losses: 0 }
  const awayRecord: TeamRecord = { wins: 0, draws: 0, losses: 0 }
  let goalsFor = 0
  let goalsAgainst = 0

  for (const match of finished) {
    const isHome = match.homeTeamId === teamId
    const record = isHome ? homeRecord : awayRecord
    const scored = isHome ? match.homeScore! : match.awayScore!
    const conceded = isHome ? match.awayScore! : match.homeScore!
    goalsFor += scored
    goalsAgainst += conceded
    if (scored > conceded) record.wins += 1
    else if (scored === conceded) record.draws += 1
    else record.losses += 1
  }

  const recentForm = finished
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .slice(-5)
    .map<FormResult>((match) => {
      const scored = match.homeTeamId === teamId ? match.homeScore! : match.awayScore!
      const conceded = match.homeTeamId === teamId ? match.awayScore! : match.homeScore!
      if (scored > conceded) return 'V'
      if (scored === conceded) return 'E'
      return 'D'
    })

  const count = finished.length
  return {
    homeRecord,
    awayRecord,
    avgGoalsFor: count === 0 ? 0 : round1(goalsFor / count),
    avgGoalsAgainst: count === 0 ? 0 : round1(goalsAgainst / count),
    recentForm,
  }
}
