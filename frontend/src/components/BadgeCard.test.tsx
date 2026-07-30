import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BadgeCard } from './BadgeCard'

describe('BadgeCard', () => {
  it('renders an unearned badge as not conquered', () => {
    render(
      <BadgeCard
        status={{ category: 'sequencia', tier: null, progressToNext: { current: 1, target: 3 } }}
        isNewlyUnlocked={false}
      />,
    )

    expect(screen.getByText('Sequência de acertos')).toBeInTheDocument()
    expect(screen.getByText('Não conquistado')).toBeInTheDocument()
  })

  it('renders an earned badge with its tier label', () => {
    render(
      <BadgeCard status={{ category: 'ranking', tier: 'ouro', progressToNext: null }} isNewlyUnlocked={false} />,
    )

    expect(screen.getByText('Ranking geral')).toBeInTheDocument()
    expect(screen.getByText('Ouro')).toBeInTheDocument()
  })

  it('renders the celebration confetti only when newly unlocked', () => {
    const { container, rerender } = render(
      <BadgeCard status={{ category: 'multipla', tier: 'bronze', progressToNext: null }} isNewlyUnlocked={false} />,
    )
    expect(container.querySelectorAll('.confetti-piece')).toHaveLength(0)

    rerender(
      <BadgeCard status={{ category: 'multipla', tier: 'bronze', progressToNext: null }} isNewlyUnlocked={true} />,
    )
    expect(container.querySelectorAll('.confetti-piece')).toHaveLength(12)
  })
})
