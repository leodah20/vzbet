import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { getRanking } from './ranking'

describe('ranking api', () => {
  it('fetches /ranking with no filter', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await getRanking()

    expect(spy).toHaveBeenCalledWith('/ranking')
  })

  it('fetches /ranking with a championshipId filter', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await getRanking('champ-1')

    expect(spy).toHaveBeenCalledWith('/ranking?championshipId=champ-1')
  })
})
