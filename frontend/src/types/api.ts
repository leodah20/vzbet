export type Role = 'TORCEDOR' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
}

export interface Team {
  id: string
  name: string
}

export type MatchStatus = 'AGENDADA' | 'FINALIZADA' | 'CANCELADA'

export interface Match {
  id: string
  championshipId: string
  homeTeamId: string
  awayTeamId: string
  round: number
  kickoffAt: string
  homeScore: number | null
  awayScore: number | null
  status: MatchStatus
}

export interface Prediction {
  id: string
  matchId: string
  predictedHome: number
  predictedAway: number
  pointsEarned: number | null
}

export interface SubmitPredictionPayload {
  matchId: string
  predictedHome: number
  predictedAway: number
}

export interface RankingEntry {
  userId: string
  userName: string
  totalPoints: number
}
