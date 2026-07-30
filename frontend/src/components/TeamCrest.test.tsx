import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TeamCrest } from './TeamCrest'

describe('TeamCrest', () => {
  it('renders an accessible label with the team name', () => {
    render(<TeamCrest teamName="Roma FC" />)
    expect(screen.getByRole('img', { name: 'Escudo de Roma FC' })).toBeInTheDocument()
  })

  it('renders the first two alphanumeric characters as initials', () => {
    render(<TeamCrest teamName="100 Freio FC" />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders distinct gradient ids for multiple crests on the same page', () => {
    const { container } = render(
      <>
        <TeamCrest teamName="Roma FC" />
        <TeamCrest teamName="Bola de Fogo FC" />
      </>,
    )
    const gradientIds = Array.from(container.querySelectorAll('linearGradient')).map((el) => el.id)
    expect(new Set(gradientIds).size).toBe(2)
  })
})
