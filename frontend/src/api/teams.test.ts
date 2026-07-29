import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listTeams } from './teams'

describe('teams api', () => {
  it('fetches /teams', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listTeams()

    expect(spy).toHaveBeenCalledWith('/teams')
  })
})
