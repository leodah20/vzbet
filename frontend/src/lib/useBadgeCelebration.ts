import { useEffect, useState } from 'react'
import type { BadgeCategory, BadgeTier } from './badges'

const STORAGE_KEY = 'vzbet-badges-seen'

function badgeKey(category: BadgeCategory, tier: BadgeTier): string {
  return `${category}:${tier}`
}

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeSeen(seen: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)))
}

export function useBadgeCelebration(
  earned: Array<{ category: BadgeCategory; tier: BadgeTier }>,
): Set<string> {
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const seen = readSeen()
    const fresh = new Set<string>()
    for (const { category, tier } of earned) {
      if (tier === null) continue
      const key = badgeKey(category, tier)
      if (!seen.has(key)) {
        fresh.add(key)
        seen.add(key)
      }
    }
    if (fresh.size > 0) {
      writeSeen(seen)
      setNewlyUnlocked(fresh)
    }
    // Runs once per mount by design — re-running on every recomputed `earned`
    // array reference would defeat the "celebrate once" purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return newlyUnlocked
}
