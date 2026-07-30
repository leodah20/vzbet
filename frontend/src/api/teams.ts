import { apiFetch } from './client'
import type { Team } from '../types/api'

export function listTeams(): Promise<Team[]> {
  return apiFetch<Team[]>('/teams')
}

export function getTeam(id: string): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`)
}
