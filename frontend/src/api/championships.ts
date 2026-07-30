import { apiFetch } from './client'
import type { Championship } from '../types/api'

export function listChampionships(): Promise<Championship[]> {
  return apiFetch<Championship[]>('/championships')
}
