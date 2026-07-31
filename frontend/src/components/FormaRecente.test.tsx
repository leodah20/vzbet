import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormaRecente } from './FormaRecente'

describe('FormaRecente', () => {
  it('renders one dot per result with the right letter', () => {
    render(<FormaRecente results={['V', 'E', 'D']} />)
    expect(screen.getByText('V')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('renders nothing for an empty form', () => {
    const { container } = render(<FormaRecente results={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
