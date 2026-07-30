import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as championshipsApi from '../../api/championships'
import { CampeonatosPage } from './CampeonatosPage'

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampeonatosPage', () => {
  it('lists championship names and seasons', async () => {
    vi.spyOn(championshipsApi, 'listChampionships').mockResolvedValue([
      {
        id: 'c1', name: 'Copa Metal Ferraz Municipal', season: '2026',
        format: 'PONTOS_CORRIDOS', startDate: '2026-03-01', endDate: '2026-12-15',
      },
    ])

    renderWithProviders(<CampeonatosPage />)

    await waitFor(() => {
      expect(screen.getByText('Copa Metal Ferraz Municipal')).toBeInTheDocument()
      expect(screen.getByText('Temporada 2026')).toBeInTheDocument()
    })
  })
})
