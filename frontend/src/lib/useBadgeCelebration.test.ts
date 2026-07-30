import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBadgeCelebration } from './useBadgeCelebration'

describe('useBadgeCelebration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reports a badge as newly unlocked the first time, and not again on a later visit', () => {
    const earned = [{ category: 'sequencia' as const, tier: 'bronze' as const }]

    const first = renderHook(() => useBadgeCelebration(earned))
    expect(first.result.current.has('sequencia:bronze')).toBe(true)
    first.unmount()

    const second = renderHook(() => useBadgeCelebration(earned))
    expect(second.result.current.has('sequencia:bronze')).toBe(false)
  })

  it('ignores categories with no tier yet', () => {
    const earned = [{ category: 'ranking' as const, tier: null }]

    const { result } = renderHook(() => useBadgeCelebration(earned))

    expect(result.current.size).toBe(0)
  })
})
