import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { getTeam, listTeams } from './teams'

describe('teams api', () => {
  it('fetches /teams', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listTeams()

    expect(spy).toHaveBeenCalledWith('/teams')
  })

  it('fetches /teams/:id', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      id: 'team-1', name: 'Roma FC', region: 'Ferraz de Vasconcelos', foundedYear: null, logoUrl: null, description: null,
    })

    await getTeam('team-1')

    expect(spy).toHaveBeenCalledWith('/teams/team-1')
  })
})
