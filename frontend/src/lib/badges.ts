import type { Prediction } from '../types/api'

export type BadgeCategory = 'sequencia' | 'ranking' | 'participacao' | 'multipla'
export type BadgeTier = 'bronze' | 'prata' | 'ouro' | null

export interface BadgeStatus {
  category: BadgeCategory
  tier: BadgeTier
  progressToNext: { current: number; target: number } | null
}

interface TierDefinition {
  tier: 'bronze' | 'prata' | 'ouro'
  target: number
}

const STREAK_TIERS: TierDefinition[] = [
  { tier: 'bronze', target: 3 },
  { tier: 'prata', target: 5 },
]

const PARTICIPATION_TIERS: TierDefinition[] = [
  { tier: 'bronze', target: 1 },
  { tier: 'prata', target: 10 },
  { tier: 'ouro', target: 25 },
]

const MULTIPLA_TIERS: TierDefinition[] = [
  { tier: 'bronze', target: 1 },
  { tier: 'prata', target: 3 },
]

function resolveTierByCount(
  count: number,
  tiersAscending: TierDefinition[],
): { tier: BadgeTier; progressToNext: { current: number; target: number } | null } {
  let currentTier: BadgeTier = null
  let nextTarget: number | null = null
  for (const { tier, target } of tiersAscending) {
    if (count >= target) {
      currentTier = tier
    } else if (nextTarget === null) {
      nextTarget = target
    }
  }
  return {
    tier: currentTier,
    progressToNext: nextTarget !== null ? { current: count, target: nextTarget } : null,
  }
}

function longestStreak(predictions: Prediction[]): number {
  const scored = predictions.filter((prediction) => prediction.pointsEarned !== null)
  let longest = 0
  let current = 0
  for (const prediction of scored) {
    if ((prediction.pointsEarned ?? 0) > 0) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
}

function resolveRankingTier(position: number | null): {
  tier: BadgeTier
  progressToNext: { current: number; target: number } | null
} {
  if (position === 1) {
    return { tier: 'ouro', progressToNext: null }
  }
  if (position !== null && position <= 3) {
    return { tier: 'bronze', progressToNext: null }
  }
  return { tier: null, progressToNext: null }
}

export function calculateBadges(predictions: Prediction[], rankingPosition: number | null): BadgeStatus[] {
  const multiplasCertas = predictions.filter((prediction) => prediction.pointsEarned === 7).length

  return [
    { category: 'sequencia', ...resolveTierByCount(longestStreak(predictions), STREAK_TIERS) },
    { category: 'ranking', ...resolveRankingTier(rankingPosition) },
    { category: 'participacao', ...resolveTierByCount(predictions.length, PARTICIPATION_TIERS) },
    { category: 'multipla', ...resolveTierByCount(multiplasCertas, MULTIPLA_TIERS) },
  ]
}
