import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listPlayersByTeam } from './players'

describe('players api', () => {
  it('fetches /teams/:teamId/players', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listPlayersByTeam('team-1')

    expect(spy).toHaveBeenCalledWith('/teams/team-1/players')
  })
})
