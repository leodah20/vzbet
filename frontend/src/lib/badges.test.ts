import { describe, expect, it } from 'vitest'
import { calculateBadges } from './badges'
import type { Prediction } from '../types/api'

function buildPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'p', matchId: 'm', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null, pointsEarned: null,
    ...overrides,
  }
}

describe('calculateBadges', () => {
  it('awards no tier when there is no activity yet', () => {
    const badges = calculateBadges([], null)
    for (const badge of badges) {
      expect(badge.tier).toBeNull()
    }
  })

  it('awards bronze then prata for streaks, with progress to the next tier', () => {
    const threeHits = [
      buildPrediction({ id: 'p1', pointsEarned: 3 }),
      buildPrediction({ id: 'p2', pointsEarned: 3 }),
      buildPrediction({ id: 'p3', pointsEarned: 3 }),
    ]
    const badges = calculateBadges(threeHits, null)
    const sequencia = badges.find((b) => b.category === 'sequencia')!
    expect(sequencia.tier).toBe('bronze')
    expect(sequencia.progressToNext).toEqual({ current: 3, target: 5 })

    const fiveHits = Array.from({ length: 5 }, (_, i) => buildPrediction({ id: `p${i}`, pointsEarned: 3 }))
    const badgesAtFive = calculateBadges(fiveHits, null)
    const sequenciaAtFive = badgesAtFive.find((b) => b.category === 'sequencia')!
    expect(sequenciaAtFive.tier).toBe('prata')
    expect(sequenciaAtFive.progressToNext).toBeNull()
  })

  it('awards participação tiers by total prediction count, scored or not', () => {
    const tenPredictions = Array.from({ length: 10 }, (_, i) => buildPrediction({ id: `p${i}` }))
    const badges = calculateBadges(tenPredictions, null)
    const participacao = badges.find((b) => b.category === 'participacao')!
    expect(participacao.tier).toBe('prata')
    expect(participacao.progressToNext).toEqual({ current: 10, target: 25 })
  })

  it('awards múltipla tiers by counting exact 7-point predictions only', () => {
    const predictions = [
      buildPrediction({ id: 'p1', pointsEarned: 7 }),
      buildPrediction({ id: 'p2', pointsEarned: 3 }),
      buildPrediction({ id: 'p3', pointsEarned: 7 }),
      buildPrediction({ id: 'p4', pointsEarned: 7 }),
    ]
    const badges = calculateBadges(predictions, null)
    const multipla = badges.find((b) => b.category === 'multipla')!
    expect(multipla.tier).toBe('prata')
  })

  it('awards ranking ouro for 1st place and bronze for top 3, nothing below that', () => {
    expect(calculateBadges([], 1).find((b) => b.category === 'ranking')!.tier).toBe('ouro')
    expect(calculateBadges([], 3).find((b) => b.category === 'ranking')!.tier).toBe('bronze')
    expect(calculateBadges([], 4).find((b) => b.category === 'ranking')!.tier).toBeNull()
    expect(calculateBadges([], null).find((b) => b.category === 'ranking')!.tier).toBeNull()
  })
})
