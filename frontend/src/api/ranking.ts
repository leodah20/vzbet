import { apiFetch } from './client'
import type { RankingEntry } from '../types/api'

export function getRanking(championshipId?: string): Promise<RankingEntry[]> {
  const query = championshipId ? `?championshipId=${championshipId}` : ''
  return apiFetch<RankingEntry[]>(`/ranking${query}`)
}
