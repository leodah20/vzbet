import { apiFetch } from './client'
import type { Match, MatchStatus } from '../types/api'

export interface ListMatchesParams {
  teamId?: string
  championshipId?: string
  status?: MatchStatus
}

export function listMatches(params: ListMatchesParams = {}): Promise<Match[]> {
  const query = new URLSearchParams()
  if (params.teamId) query.set('teamId', params.teamId)
  if (params.championshipId) query.set('championshipId', params.championshipId)
  if (params.status) query.set('status', params.status)
  const queryString = query.toString()
  return apiFetch<Match[]>(`/matches${queryString ? `?${queryString}` : ''}`)
}
