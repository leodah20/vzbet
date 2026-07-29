import { describe, expect, it, vi } from 'vitest'
import * as client from './client'
import { listMyPredictions, submitPrediction } from './predictions'

describe('predictions api', () => {
  it('fetches /predictions/me', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([])

    await listMyPredictions()

    expect(spy).toHaveBeenCalledWith('/predictions/me')
  })

  it('posts to /predictions with the prediction payload', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      id: '1',
      matchId: 'match-1',
      predictedHome: 2,
      predictedAway: 1,
      pointsEarned: null,
    })
    const payload = { matchId: 'match-1', predictedHome: 2, predictedAway: 1 }

    await submitPrediction(payload)

    expect(spy).toHaveBeenCalledWith('/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
})
