import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listChampionships } from './championships'

describe('championships api', () => {
  it('fetches /championships', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listChampionships()

    expect(spy).toHaveBeenCalledWith('/championships')
  })
})
