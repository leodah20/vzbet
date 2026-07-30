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
  region: string
  foundedYear: number | null
  logoUrl: string | null
  description: string | null
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

export type PredictedOutcome = 'CASA' | 'EMPATE' | 'FORA'

export interface Prediction {
  id: string
  matchId: string
  predictedOutcome: PredictedOutcome
  predictedHome: number | null
  predictedAway: number | null
  pointsEarned: number | null
}

export interface SubmitPredictionPayload {
  matchId: string
  predictedOutcome: PredictedOutcome
  predictedHome: number | null
  predictedAway: number | null
}

export interface RankingEntry {
  userId: string
  userName: string
  totalPoints: number
}
