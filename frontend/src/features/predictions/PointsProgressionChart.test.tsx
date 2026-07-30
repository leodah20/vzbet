import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PointsProgressionChart } from './PointsProgressionChart'

describe('PointsProgressionChart', () => {
  it('shows an empty-state message when there is no scored data yet', () => {
    render(<PointsProgressionChart data={[]} />)
    expect(screen.getByText('Ainda sem palpites pontuados.')).toBeInTheDocument()
  })

  it('renders the chart container when there is data', () => {
    render(
      <PointsProgressionChart
        data={[
          { date: '2026-06-01T15:00:00.000Z', cumulativePoints: 3 },
          { date: '2026-06-08T15:00:00.000Z', cumulativePoints: 10 },
        ]}
      />,
    )
    expect(screen.getByTestId('points-progression-chart')).toBeInTheDocument()
  })
})
