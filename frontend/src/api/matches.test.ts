import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listMatches } from './matches'

describe('matches api', () => {
  it('fetches /matches with no query string when no filters are given', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listMatches()

    expect(spy).toHaveBeenCalledWith('/matches')
  })

  it('fetches /matches with a status query string when a status filter is given', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listMatches({ status: 'AGENDADA' })

    expect(spy).toHaveBeenCalledWith('/matches?status=AGENDADA')
  })
})
