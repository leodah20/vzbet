import { apiFetch } from './client'
import type { Player } from '../types/api'

export function listPlayersByTeam(teamId: string): Promise<Player[]> {
  return apiFetch<Player[]>(`/teams/${teamId}/players`)
}
